const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const rules = fs.readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');
const projectId = process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || 'demo-no-project';

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules }
  });

  try {
    // Admin seeding (bypass rules)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await adminDb.collection('users').doc('adminUser').set({ role: 'admin', displayName: 'Admin' });
      await adminDb.collection('vtubers').doc('vtuber123').set({ id: 'vtuber123', displayName: 'VTuber 123', themeColor: '#ec4899' });
      await adminDb.collection('milestones').doc('ms_published').set({ vtuberId: 'vtuber123', title: 'Public milestone', status: 'published', targetAmount: 1000, currentAmount: 0 });
    });

    // Test clients
    const vtuber = testEnv.authenticatedContext('vtuber123');
    const other = testEnv.authenticatedContext('other');
    const fan = testEnv.authenticatedContext('fan1');
    const adminAuth = testEnv.authenticatedContext('adminUser');
    const unauth = testEnv.unauthenticatedContext();

    const vtuberDb = vtuber.firestore();
    const otherDb = other.firestore();
    const fanDb = fan.firestore();
    const adminDbClient = adminAuth.firestore();
    const unauthDb = unauth.firestore();

    // Test 1: owner can create draft
    await assertSucceeds(vtuberDb.collection('milestones').doc('ms1').set({ vtuberId: 'vtuber123', status: 'draft', title: 'Draft' }));
    console.log('PASS: owner create draft allowed');

    // Test 2: other cannot create for vtuber
    await assertFails(otherDb.collection('milestones').doc('ms2').set({ vtuberId: 'vtuber123', status: 'draft', title: 'Not allowed' }));
    console.log('PASS: other create draft denied as expected');

    // Test 3: owner cannot prefill currentAmount > 0
    await assertFails(vtuberDb.collection('milestones').doc('ms3').set({ vtuberId: 'vtuber123', status: 'draft', title: 'Bad', currentAmount: 100 }));
    console.log('PASS: owner create with currentAmount >0 denied');

    // Test 4: unauthenticated read of published milestone
    await assertSucceeds(unauthDb.collection('milestones').doc('ms_published').get());
    console.log('PASS: unauthenticated can read published milestone');

    // Test 5: fan create pending contribution allowed
    await assertSucceeds(fanDb.collection('milestones').doc('ms_published').collection('contributions').doc('c1').set({ userId: 'fan1', amount: 100, status: 'pending', message: 'GL' }));
    console.log('PASS: fan create pending contribution allowed');

    // Test 6: fan create contribution with status verified denied
    await assertFails(fanDb.collection('milestones').doc('ms_published').collection('contributions').doc('c2').set({ userId: 'fan1', amount: 100, status: 'verified' }));
    console.log('PASS: fan cannot create contribution with verified status');

    // Seed transaction via admin and test updates
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await adminDb.collection('transactions').doc('tx1').set({ fanUid: 'fan1', vtuberId: 'vtuber123', amount: 100, status: 'pending' });
    });

    // Test 7: non-admin update transaction status denied
    await assertFails(fanDb.collection('transactions').doc('tx1').update({ status: 'success' }));
    console.log('PASS: non-admin cannot update transaction status');

    // Test 8: admin update transaction status allowed
    await assertSucceeds(adminDbClient.collection('transactions').doc('tx1').update({ status: 'success' }));
    console.log('PASS: admin can update transaction status');

    console.log('All tests executed.');
  } catch (err) {
    console.error('Test run failed', err);
    process.exitCode = 1;
  } finally {
    await testEnv.cleanup();
    process.exit(process.exitCode || 0);
  }
}

run();
