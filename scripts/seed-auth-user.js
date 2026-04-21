const admin = require('firebase-admin');

async function seedUser(email, password, displayName) {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  }
  const projectId = process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || 'v-up-emulator';
  admin.initializeApp({ projectId });
  console.log(`[seed-auth-user] Using Auth emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}, projectId=${projectId}`);
  try {
    try {
      const user = await admin.auth().getUserByEmail(email);
      console.log(`[seed-auth-user] User already exists: uid=${user.uid}`);
      return user;
    } catch (e) {
      const code = e && e.code ? e.code : (e && e.message ? e.message : '');
      if (String(code).includes('user-not-found') || String(code).includes('auth/user-not-found')) {
        const created = await admin.auth().createUser({
          email,
          password,
          emailVerified: true,
          displayName,
        });
        console.log(`[seed-auth-user] Created user: uid=${created.uid}`);
        return created;
      }
      throw e;
    }
  } catch (err) {
    console.error('[seed-auth-user] Error:', err);
    throw err;
  }
}

(async () => {
  const email = process.argv[2] || 'vupexplosion@gmail.com';
  const password = process.argv[3] || 'ChangeMe123!';
  const displayName = process.argv[4] || 'VUP Explosion';
  try {
    await seedUser(email, password, displayName);
    console.log('[seed-auth-user] Done.');
    process.exit(0);
  } catch (e) {
    console.error('[seed-auth-user] Failed to seed user. Make sure the Auth emulator is running on port 9099.');
    process.exit(1);
  }
})();
