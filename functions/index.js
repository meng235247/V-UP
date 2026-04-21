const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the admin SDK (use default credentials in Cloud Functions runtime)
admin.initializeApp();
const db = admin.firestore();

// NOTE: soft-delete support has been removed — drafts are hard-deleted immediately.
// The scheduled hard-delete function and test endpoint were removed accordingly.

// Placeholder HTTP endpoint (no-op) kept to make the functions package deployable if needed.
exports.placeholder = functions.https.onRequest((req, res) => {
  res.status(200).json({ status: 'ok', message: 'Soft-delete support removed; no scheduled hard-delete functions.' });
});
