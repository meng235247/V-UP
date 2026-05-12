#!/usr/bin/env node
// Migration: normalize milestone targetAmount to numeric values.

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'v-up-1eeb3';

const admin = require('firebase-admin');

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });

const db = admin.firestore();

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

async function run() {
  try {
    console.log('[migrate-milestone-target-amount] Starting migration for project', process.env.GCLOUD_PROJECT);

    const milestonesRef = db.collection('milestones');
    const snapshot = await milestonesRef.get();

    let updated = 0;
    let skipped = 0;

    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data() || {};
      const currentTarget = toNumber(data.targetAmount);
      if (currentTarget && currentTarget > 0) {
        skipped++;
        return;
      }

      const fallbackTarget = toNumber(data.goal) || toNumber(data.target);
      if (!fallbackTarget || fallbackTarget <= 0) {
        skipped++;
        return;
      }

      batch.update(doc.ref, { targetAmount: fallbackTarget });
      updated++;
    });

    if (updated > 0) {
      await batch.commit();
      console.log('[migrate-milestone-target-amount] Migration complete: updated', updated, 'docs, skipped', skipped);
    } else {
      console.log('[migrate-milestone-target-amount] No updates needed');
    }

    process.exit(0);
  } catch (err) {
    console.error('[migrate-milestone-target-amount] Error:', err);
    process.exit(1);
  }
}

run();
