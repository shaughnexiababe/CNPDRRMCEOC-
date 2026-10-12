// Firestore access for the NDRRMC situational-reporting module.
//
// Data model (all under one operation, so a typhoon's reports stay together):
//   operations/{opId}                                    event: name, hazard, status
//   operations/{opId}/reports/{muni-slug}_{reportNo}     one municipality, one reporting cycle
//       annexes: { "2": [row], "4": [row,...], ... }     every annex except casualties
//       na:      { "13": true, ... }                     annex marked "nothing to report"
//       casualty_counts: { dead, injured, ill, missing, unvalidated }   aggregates only
//   operations/{opId}/reports/{id}/restricted/casualties  { rows: [...] }  personal data (Annex 3)
//
// Uses the shared Firestore instance from the SDK shim (cnpdrrmceoc._db), so it
// follows whatever offline-cache setting the app uses.
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, writeBatch,
  serverTimestamp, arrayUnion,
} from 'firebase/firestore';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { ANNEXES, cleanRows } from './annexes.js';
import { casualtySummary } from './consolidate.js';
import { reportId } from './ids.js';

const db = () => cnpdrrmceoc._db;
const MAX_DOC_BYTES = 900 * 1024; // Firestore hard limit is 1 MiB per document

const opsCol = () => collection(db(), 'operations');
const opDoc = (opId) => doc(db(), 'operations', opId);
const reportsCol = (opId) => collection(db(), 'operations', opId, 'reports');
const reportDoc = (opId, rid) => doc(db(), 'operations', opId, 'reports', rid);
const casualtyDoc = (opId, rid) => doc(db(), 'operations', opId, 'reports', rid, 'restricted', 'casualties');

const withId = (snap) => ({ id: snap.id, ...snap.data() });

// ---- operations ---------------------------------------------------------------
export async function listOperations() {
  const snap = await getDocs(query(opsCol(), orderBy('created_at', 'desc')));
  return snap.docs.map(withId);
}

export async function getOperation(opId) {
  const snap = await getDoc(opDoc(opId));
  return snap.exists() ? withId(snap) : null;
}

export async function createOperation({ name, hazard_type, start_date, due_at, user }) {
  const ref = doc(opsCol());
  await setDoc(ref, {
    name: name.trim(), hazard_type: hazard_type || 'typhoon', start_date: start_date || '',
    status: 'active', current_report_no: 1,
    cycles: { 1: { opened_at: new Date().toISOString(), due_at: due_at || '' } },
    created_by: user?.id || null, created_by_name: user?.full_name || '',
    created_at: serverTimestamp(), updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function setOperationStatus(opId, status) {
  await updateDoc(opDoc(opId), { status, updated_at: serverTimestamp() });
}

/** EOC: open the next reporting cycle (Report No. N+1) with an optional deadline. */
export async function openNextCycle(opId, { current, due_at }) {
  const next = (current || 1) + 1;
  await updateDoc(opDoc(opId), {
    current_report_no: next,
    [`cycles.${next}`]: { opened_at: new Date().toISOString(), due_at: due_at || '' },
    updated_at: serverTimestamp(),
  });
  return next;
}

/** EOC: change the deadline of an already-open cycle. */
export async function setCycleDue(opId, reportNo, due_at) {
  await updateDoc(opDoc(opId), { [`cycles.${reportNo}.due_at`]: due_at || '', updated_at: serverTimestamp() });
}

// ---- reports --------------------------------------------------------------------
/**
 * List reports of an operation. A MDRRMO user MUST pass `municipality`: the
 * security rules only allow queries constrained to their own municipality.
 */
export async function listReports(opId, { municipality } = {}) {
  const q = municipality ? query(reportsCol(opId), where('municipality', '==', municipality)) : query(reportsCol(opId));
  const snap = await getDocs(q);
  return snap.docs.map(withId).sort((a, b) => (a.municipality === b.municipality ? a.report_no - b.report_no : a.municipality.localeCompare(b.municipality)));
}

export async function getReport(opId, municipality, reportNo) {
  const snap = await getDoc(reportDoc(opId, reportId(municipality, reportNo)));
  return snap.exists() ? withId(snap) : null;
}

export async function createReport(opId, municipality, reportNo, user) {
  const rid = reportId(municipality, reportNo);
  const data = {
    municipality, report_no: reportNo, status: 'draft', version: 0, history: [],
    as_of: toLocalInput(new Date()), annexes: {}, na: {}, notes: '',
    casualty_counts: { dead: 0, injured: 0, ill: 0, missing: 0, unvalidated: 0 },
    created_by: user?.id || null, created_by_name: user?.full_name || '',
    created_at: serverTimestamp(), updated_at: serverTimestamp(),
  };
  await setDoc(reportDoc(opId, rid), data);
  return { id: rid, ...data };
}

export async function getCasualties(opId, rid) {
  const snap = await getDoc(casualtyDoc(opId, rid));
  return snap.exists() ? (snap.data().rows || []) : [];
}

/** Normalise + save a draft. `casualties` is optional (omit to leave Annex 3 untouched). */
export async function saveDraft(opId, rid, { annexes, na, as_of, notes, casualties }) {
  const cleaned = {};
  ANNEXES.filter((a) => a.no !== 3).forEach((a) => {
    cleaned[a.no] = na?.[a.no] ? [] : cleanRows(a, annexes?.[a.no] || []);
  });
  // "single" annexes keep one row only when the user actually filled something in
  const cas = casualties == null ? null : cleanRows(ANNEXES.find((a) => a.no === 3), na?.[3] ? [] : casualties);

  const payload = { annexes: cleaned, na: na || {}, as_of: as_of || '', notes: notes || '', updated_at: serverTimestamp() };
  const size = new Blob([JSON.stringify(payload)]).size;
  if (size > MAX_DOC_BYTES) {
    throw new Error(`This report is too large to store (${Math.round(size / 1024)} KB). Remove unneeded rows or split remarks.`);
  }
  const batch = writeBatch(db());
  if (cas) {
    payload.casualty_counts = casualtySummary(cas);
    batch.set(casualtyDoc(opId, rid), { rows: cas, updated_at: serverTimestamp() });
  }
  batch.update(reportDoc(opId, rid), payload);
  await batch.commit();
  return { cleaned, casualties: cas };
}

export async function submitReport(opId, rid, { user, version }) {
  const nextVersion = (version || 0) + 1;
  await updateDoc(reportDoc(opId, rid), {
    status: 'submitted', version: nextVersion, submitted_at: serverTimestamp(),
    submitted_by: user?.id || null, submitted_by_name: user?.full_name || '', return_reason: '',
    history: arrayUnion({ version: nextVersion, action: 'submitted', by: user?.full_name || user?.id || '', at: new Date().toISOString() }),
    updated_at: serverTimestamp(),
  });
}

/** EOC staff: send a submitted report back to the municipality for correction. */
export async function returnReport(opId, rid, { user, reason }) {
  await updateDoc(reportDoc(opId, rid), {
    status: 'returned', return_reason: reason || '',
    history: arrayUnion({ action: 'returned', reason: reason || '', by: user?.full_name || user?.id || '', at: new Date().toISOString() }),
    updated_at: serverTimestamp(),
  });
}

/** Local "YYYY-MM-DDTHH:mm" string for <input type="datetime-local">. */
export function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
