/**
 * Migration script for NDRRMC MC 05 s.2025 / Task 1: Split incident PII.
 *
 * Copies PII keys (reporter_name, reporter_contact, reported_by_name, exact latitude/longitude, location, photo_urls)
 * from `incidents/{id}` into `incidents_private/{id}`, adds `approx_latitude`, `approx_longitude`, `photo_count`, `schema_version: 2`
 * to the public doc, and removes PII keys from the public doc.
 *
 * Usage:
 *   node scripts/migrate-incident-pii.mjs           # Dry-run (logs counts only, no DB writes)
 *   node scripts/migrate-incident-pii.mjs --apply   # Apply migration to Firestore
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const isApply = process.argv.includes('--apply');

if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson && isApply) {
    console.error('Error: FIREBASE_SERVICE_ACCOUNT_JSON env variable is required for --apply mode.');
    process.exit(1);
  }
  if (serviceAccountJson) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  } else {
    initializeApp({ projectId: 'cnpdrrmceoc' });
  }
}

const db = getFirestore();

async function runMigration() {
  console.log(`[Migration] Starting incident PII split migration (Mode: ${isApply ? 'APPLY' : 'DRY-RUN'})`);

  const snapshot = await db.collection('incidents').get();
  console.log(`[Migration] Found ${snapshot.size} incidents total.`);

  let migratedCount = 0;
  let skippedCount = 0;
  let batch = db.batch();
  let batchOps = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    // Skip if already migrated to v2 schema
    if (data.schema_version === 2) {
      skippedCount++;
      continue;
    }

    const id = docSnap.id;
    const latNum = data.latitude != null ? Number(data.latitude) : null;
    const lngNum = data.longitude != null ? Number(data.longitude) : null;
    const approxLat = latNum != null && !isNaN(latNum) ? Math.round(latNum * 100) / 100 : null;
    const approxLng = lngNum != null && !isNaN(lngNum) ? Math.round(lngNum * 100) / 100 : null;
    const photoUrls = Array.isArray(data.photo_urls) ? data.photo_urls : [];

    const publicUpdates = {
      approx_latitude: approxLat,
      approx_longitude: approxLng,
      photo_count: photoUrls.length,
      schema_version: 2,
      reporter_name: FieldValue.delete(),
      reporter_contact: FieldValue.delete(),
      reported_by_name: FieldValue.delete(),
      latitude: FieldValue.delete(),
      longitude: FieldValue.delete(),
      location: FieldValue.delete(),
      photo_urls: FieldValue.delete(),
      updated_at: FieldValue.serverTimestamp()
    };

    const privateData = {
      reporter_name: data.reporter_name || data.reported_by_name || '',
      reporter_contact: data.reporter_contact || '',
      reported_by_name: data.reported_by_name || data.reporter_name || '',
      latitude: latNum,
      longitude: lngNum,
      location: data.location || null,
      photo_urls: photoUrls,
      reported_by_id: data.reported_by_id || '',
      schema_version: 2,
      created_at: data.created_at || FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp()
    };

    migratedCount++;

    if (isApply) {
      const publicRef = db.collection('incidents').doc(id);
      const privateRef = db.collection('incidents_private').doc(id);

      batch.set(privateRef, privateData, { merge: true });
      batch.update(publicRef, publicUpdates);
      batchOps += 2;

      if (batchOps >= 350) {
        await batch.commit();
        console.log(`[Migration] Committed batch of ${batchOps} operations.`);
        batch = db.batch();
        batchOps = 0;
      }
    }
  }

  if (isApply && batchOps > 0) {
    await batch.commit();
    console.log(`[Migration] Committed final batch of ${batchOps} operations.`);
  }

  console.log(`[Migration] Complete. Summary:`);
  console.log(`  - Total processed: ${snapshot.size}`);
  console.log(`  - Migrated: ${migratedCount}`);
  console.log(`  - Already up-to-date (skipped): ${skippedCount}`);
  if (!isApply) {
    console.log(`[Migration] DRY-RUN finished. No changes written to database. Run with --apply to write changes.`);
  }
}

runMigration().catch(err => {
  console.error('[Migration] Failed:', err.message);
  process.exit(1);
});
