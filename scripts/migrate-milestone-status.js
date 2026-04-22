#!/usr/bin/env node
// 迁移脚本：为所有缺少 status 字段的里程碑添加 'draft' 状态

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'v-up-1eeb3';

const admin = require('firebase-admin');

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });

const db = admin.firestore();

async function run() {
  try {
    console.log('[migrate-milestone-status] Starting migration for project', process.env.GCLOUD_PROJECT);
    
    const milestonesRef = db.collection('milestones');
    const snapshot = await milestonesRef.get();
    
    let updated = 0;
    let skipped = 0;
    
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.status) {
        console.log('[migrate-milestone-status] Updating doc', doc.id, '(adding status=draft)');
        batch.update(doc.ref, { status: 'draft' });
        updated++;
      } else {
        skipped++;
      }
    });
    
    if (updated > 0) {
      await batch.commit();
      console.log('[migrate-milestone-status] Migration complete: updated', updated, 'docs, skipped', skipped);
    } else {
      console.log('[migrate-milestone-status] No updates needed, all docs already have status field');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('[migrate-milestone-status] Error:', err);
    process.exit(1);
  }
}

run();
