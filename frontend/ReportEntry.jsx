import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, MinusCircle, AlertCircle, Download, Printer, Send, Undo2, Save, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { MUNICIPALITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ANNEXES, ANNEX_BY_NO, MODULES, emptyRow, hasContent, cleanRows } from '@/lib/reporting/annexes';
import { validateReport, annexTitle } from '@/lib/reporting/validation';
import { slug } from '@/lib/reporting/ids';
import { formatDateTime } from '@/lib/reporting/consolidate';
import { municipalWorkbook } from '@/lib/reporting/exports';
import { downloadXlsx } from '@/lib/reporting/xlsx';
import { createReport, getCasualties, getOperation, getReport, returnReport, saveDraft, submitReport } from '@/lib/reporting/store';
import AnnexEditor from '@/components/reporting/AnnexEditor';
import StatusBadge from '@/components/reporting/StatusBadge';
import { useReportingAccess } from '@/components/reporting/useReportingAccess';

const initialRows = (annex, saved) => {
  if (saved && saved.length) return saved;
  return annex.mode === 'single' ? [emptyRow(annex)] : [];
};

export default function ReportEntry() {
  const { opId, muniSlug, reportNo } = useParams();
  const municipality = MUNICIPALITIES.find((m) => slug(m) === muniSlug);
  const no = Number(reportNo);
  const { user, isStaff, isMdrrmo, myMunicipality } = useReportingAccess();
  const { toast } = useToast();

  const allowed = !!municipality && (isStaff || (isMdrrmo && myMunicipality === municipality));

  const [loading, setLoading] = useState(true);
  const [op, setOp] = useState(null);
  const [report, setReport] = useState(null);
  const [annexes, setAnnexes] = useState({});
  const [na, setNa] = useState({});
  const [casualties, setCasualties] = useState([]);
  const [asOf, setAsOf] = useState('');
  const [notes, setNotes] = useState('');
  const [activeNo, setActiveNo] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [includePII, setIncludePII] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const rev = useRef(0);

  const hydrate = useCallback((rep, cas) => {
    const a = {};
    ANNEXES.filter((x) => x.no !== 3).forEach((x) => { a[x.no] = initialRows(x, rep?.annexes?.[x.no]); });
    setAnnexes(a);
    setNa(rep?.na || {});
    setCasualties(cas || []);
    setAsOf(rep?.as_of || '');
    setNotes(rep?.notes || '');
  }, []);

  const load = useCallback(async () => {
    if (!allowed) { setLoading(false); return; }
    setLoading(true);
    try {
      const [o, r] = await Promise.all([getOperation(opId), getReport(opId, municipality, no)]);
      setOp(o); setReport(r);
      const cas = r ? await getCasualties(opId, r.id).catch(() => []) : [];
      hydrate(r, cas);
      setDirty(false);
    } catch (e) {
      toast({ title: 'Could not load report', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [allowed, opId, municipality, no, hydrate, toast]);

  useEffect(() => { load(); }, [load]);

  const editable = allowed && !!report && ['draft', 'returned'].includes(report.status);
  const touch = (fn) => { fn(); rev.current += 1; setDirty(true); };

  // ---- autosave (important when connectivity is unreliable: edits are also queued offline) ----
  const latest = useRef({});
  latest.current = { annexes, na, as_of: asOf, notes, casualties };
  const save = useCallback(async ({ silent = true } = {}) => {
    if (!report || !editable) return false;
    const startRev = rev.current;
    setSaving(true);
    try {
      await saveDraft(opId, report.id, latest.current);
      if (rev.current === startRev) setDirty(false);
      setLastSaved(new Date());
      if (!silent) toast({ title: 'Draft saved' });
      return true;
    } catch (e) {
      toast({ title: 'Could not save', description: e.message, variant: 'destructive' });
      return false;
    } finally { setSaving(false); }
  }, [report, editable, opId, toast]);

  useEffect(() => {
    if (!dirty || !editable) return undefined;
    const t = setTimeout(() => { save(); }, 2500);
    return () => clearTimeout(t);
  }, [dirty, annexes, na, asOf, notes, casualties, editable, save]);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ---- validation ----
  const validation = useMemo(() => validateReport(annexes, na, { casualties }), [annexes, na, casualties]);
  const issuesByAnnex = useMemo(() => {
    const m = {};
    validation.issues.forEach((i) => { (m[i.annex] = m[i.annex] || []).push(i); });
    return m;
  }, [validation]);
  const rowsFor = (n) => (n === 3 ? casualties : annexes[n] || []);
  const statusOf = (n) => {
    const annex = ANNEX_BY_NO[n];
    if (na[n]) return 'na';
    if ((issuesByAnnex[n] || []).some((i) => i.severity === 'error')) return 'error';
    return hasContent(annex, rowsFor(n)) ? 'done' : 'empty';
  };
  const resolved = ANNEXES.length - validation.unresolved.length;

  // ---- actions ----
  const start = async () => {
    try {
      const r = await createReport(opId, municipality, no, user);
      setReport(r); hydrate(r, []);
      toast({ title: `Report No. ${no} started` });
    } catch (e) { toast({ title: 'Could not start report', description: e.message, variant: 'destructive' }); }
  };

  const exportCleaned = () => {
    const cleaned = {};
    ANNEXES.filter((a) => a.no !== 3).forEach((a) => { cleaned[a.no] = na[a.no] ? [] : cleanRows(a, annexes[a.no] || []); });
    return cleaned;
  };
  const doExcel = () => {
    const cas = includePII ? (na[3] ? [] : cleanRows(ANNEX_BY_NO[3], casualties)) : null;
    const sheets = municipalWorkbook({ operation: op, report: { ...report, as_of: asOf, annexes: exportCleaned() }, casualties: cas });
    downloadXlsx(`NDRRMC_Report${no}_${slug(municipality)}.xlsx`, sheets);
  };
  const doPrint = async () => {
    if (dirty && editable) await save();
    window.open(`/reports/${opId}/print/${muniSlug}/${no}?pii=${includePII ? 1 : 0}`, '_blank');
  };

  const doSubmit = async () => {
    const ok = await save({ silent: true });
    if (!ok) return;
    try {
      await submitReport(opId, report.id, { user, version: report.version });
      setSubmitOpen(false);
      toast({ title: `Report No. ${no} submitted`, description: 'It is now locked. Contact the Provincial EOC if a correction is needed.' });
      await load();
    } catch (e) { toast({ title: 'Submit failed', description: e.message, variant: 'destructive' }); }
  };
  const doReturn = async () => {
    try {
      await returnReport(opId, report.id, { user, reason: returnReason });
      setReturnOpen(false); setReturnReason('');
      toast({ title: 'Report returned for correction' });
      await load();
    } catch (e) { toast({ title: 'Failed', description: e.message, variant: 'destructive' }); }
  };

  // ---- render ----
  if (!municipality) return <p className="text-sm">Unknown municipality.</p>;
  if (!allowed) {
    return (
      <Card className="border-red-500/30"><CardContent className="p-6 text-sm flex gap-2 items-start text-red-700">
        <ShieldAlert className="w-4 h-4 mt-0.5" />You can only open reports for the municipality your account is assigned to.
      </CardContent></Card>
    );
  }
  if (loading) return <p className="text-sm text-muted-foreground">Loading report…</p>;

  const cycleOpen = op && op.status === 'active' && (isStaff || no <= (op.current_report_no || 1));
  if (!report) {
    return (
      <div className="space-y-4 max-w-xl">
        <Link to={`/reports/${opId}`} className="text-xs text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Back</Link>
        <Card><CardContent className="p-6 space-y-3">
          <h1 className="text-lg font-bold">{municipality} — Report No. {no}</h1>
          <p className="text-sm text-muted-foreground">{op?.name}</p>
          {cycleOpen
            ? <Button onClick={start}>Start Report No. {no}</Button>
            : <p className="text-sm text-amber-700">This reporting cycle is not open for filing.</p>}
        </CardContent></Card>
      </div>
    );
  }

  const annex = ANNEX_BY_NO[activeNo];
  const icon = (st) => st === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
    : st === 'na' ? <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
    : st === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-red-600" />
    : <Circle className="w-3.5 h-3.5 text-slate-300" />;
  const blocking = validation.unresolved.length > 0 || validation.errors > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link to={`/reports/${opId}`} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="w-3 h-3" />{op?.name}</Link>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">{municipality} — Report No. {no} <StatusBadge status={report.status} /></h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>As of</span>
            <Input type="datetime-local" className="h-8 w-52 text-xs" value={asOf} disabled={!editable} onChange={(e) => touch(() => setAsOf(e.target.value))} />
            <span>
              {saving ? 'Saving…' : dirty ? 'Unsaved changes' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && <Button variant="outline" size="sm" onClick={() => save({ silent: false })} disabled={saving}><Save className="w-3.5 h-3.5 mr-1.5" />Save draft</Button>}
          <Button variant="outline" size="sm" onClick={doExcel}><Download className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
          <Button variant="outline" size="sm" onClick={doPrint}><Printer className="w-3.5 h-3.5 mr-1.5" />PDF / Print</Button>
          {editable && <Button size="sm" onClick={() => setSubmitOpen(true)}><Send className="w-3.5 h-3.5 mr-1.5" />Review &amp; submit</Button>}
          {isStaff && report.status === 'submitted' && <Button variant="secondary" size="sm" onClick={() => setReturnOpen(true)}><Undo2 className="w-3.5 h-3.5 mr-1.5" />Return for correction</Button>}
        </div>
      </div>

      {report.status === 'returned' && (
        <Card className="border-orange-500/30 bg-orange-500/5"><CardContent className="p-3 text-sm text-orange-800">
          Returned for correction{report.return_reason ? `: ${report.return_reason}` : '.'} Update the figures and submit again.
        </CardContent></Card>
      )}
      {report.status === 'submitted' && (
        <Card className="border-green-500/30 bg-green-500/5"><CardContent className="p-3 text-sm text-green-800">
          Submitted {formatDateTime(report.submitted_at)}{report.submitted_by_name ? ` by ${report.submitted_by_name}` : ''} (version {report.version}). This report is locked
          {isMdrrmo ? '; ask the Provincial EOC to return it if a correction is needed.' : '. Use “Return for correction” to reopen it.'}
        </CardContent></Card>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs w-64">
          <Progress value={(resolved / ANNEXES.length) * 100} className="h-2" />
          <span className="whitespace-nowrap text-muted-foreground">{resolved}/{ANNEXES.length} annexes</span>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={includePII} onChange={(e) => setIncludePII(e.target.checked)} />
          Include casualty personal details in Excel / PDF (for the higher DRRM council only)
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-4">
        <select className="md:hidden h-9 rounded-md border border-input bg-background px-2 text-sm" value={activeNo} onChange={(e) => setActiveNo(Number(e.target.value))}>
          {ANNEXES.map((a) => <option key={a.no} value={a.no}>{`Annex ${a.no}: ${a.title}`}</option>)}
        </select>
        <nav className="hidden md:block space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {MODULES.map((m) => (
            <div key={m.id}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-1">{m.label}</p>
              {ANNEXES.filter((a) => a.module === m.id).map((a) => (
                <button key={a.no} type="button" onClick={() => setActiveNo(a.no)}
                  className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left hover:bg-muted', activeNo === a.no && 'bg-primary/10 text-primary font-semibold')}>
                  {icon(statusOf(a.no))}<span className="truncate">{a.no}. {a.title}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-3 min-w-0">
          <AnnexEditor
            key={activeNo}
            annex={annex}
            rows={rowsFor(activeNo)}
            onRows={(rows) => touch(() => (activeNo === 3 ? setCasualties(rows) : setAnnexes((a) => ({ ...a, [activeNo]: rows }))))}
            na={!!na[activeNo]}
            onNa={(v) => touch(() => setNa((x) => ({ ...x, [activeNo]: v })))}
            readOnly={!editable}
            municipality={municipality}
            issues={issuesByAnnex[activeNo] || []}
          />
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" disabled={activeNo <= 1} onClick={() => setActiveNo(activeNo - 1)}>← Previous annex</Button>
            <Button variant="ghost" size="sm" disabled={activeNo >= ANNEXES.length} onClick={() => setActiveNo(activeNo + 1)}>Next annex →</Button>
          </div>
          <Card><CardContent className="p-3 space-y-1.5">
            <label className="text-xs font-medium">Notes to the Provincial EOC (optional)</label>
            <Textarea rows={2} value={notes} disabled={!editable} onChange={(e) => touch(() => setNotes(e.target.value))} placeholder="Anything the EOC should know about this report." />
          </CardContent></Card>
        </div>
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Report No. {no}</DialogTitle>
            <DialogDescription>{blocking ? 'Resolve the items below before submitting.' : 'Everything is complete. Submitting locks the report.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {validation.unresolved.length > 0 && (
              <div><p className="font-semibold text-red-600">Annexes with no entries and not marked “nothing to report” ({validation.unresolved.length})</p>
                <ul className="mt-1 space-y-0.5">{validation.unresolved.map((n) => (
                  <li key={n}><button type="button" className="text-xs underline text-left" onClick={() => { setActiveNo(n); setSubmitOpen(false); }}>{annexTitle(n)}</button></li>
                ))}</ul></div>
            )}
            {validation.errors > 0 && (
              <div><p className="font-semibold text-red-600">Errors ({validation.errors})</p>
                <ul className="mt-1 space-y-0.5 text-xs">{validation.issues.filter((i) => i.severity === 'error').slice(0, 12).map((i, k) => (
                  <li key={k}><button type="button" className="underline text-left" onClick={() => { setActiveNo(i.annex); setSubmitOpen(false); }}>Annex {i.annex}</button>: {i.message}</li>
                ))}</ul></div>
            )}
            {validation.warnings > 0 && (
              <div><p className="font-semibold text-amber-600">Warnings ({validation.warnings}) — you can still submit</p>
                <ul className="mt-1 space-y-0.5 text-xs">{validation.issues.filter((i) => i.severity === 'warning').slice(0, 8).map((i, k) => (
                  <li key={k}>Annex {i.annex}: {i.message}</li>
                ))}</ul></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Keep editing</Button>
            <Button disabled={blocking || saving} onClick={doSubmit}>Submit report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return for correction</DialogTitle>
            <DialogDescription>{municipality} will be able to edit and resubmit Report No. {no}.</DialogDescription></DialogHeader>
          <Textarea rows={3} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="What needs to be corrected?" />
          <DialogFooter><Button onClick={doReturn}>Return report</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
