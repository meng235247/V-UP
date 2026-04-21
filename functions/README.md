# V-Up Cloud Functions (deprecated hard-delete)

Soft-delete support has been removed from the application: drafts are now hard-deleted immediately when the user deletes them from the dashboard.

As a result, the scheduled hard-delete Cloud Function and related test endpoint were removed. This `functions/` folder now contains a small placeholder function so the package remains deployable if you later add admin helpers.

If you previously relied on the scheduled hard-delete or the GitHub Actions workflow to purge soft-deleted documents, you can remove that workflow from the repository.

Setup & local testing (if you still want to deploy placeholder)

1. Install deps:

```bash
cd functions
npm install
```

2. Deploy (optional):

```bash
firebase deploy --only functions
```

If you want to reintroduce server-side cleanup in the future, consider one of:

- Reintroduce a scheduled Cloud Function (requires Blaze plan), or
- Use Firestore TTL on a dedicated field (requires billing), or
- Use an external scheduler that calls an admin-only HTTP endpoint (protect with a secret).
