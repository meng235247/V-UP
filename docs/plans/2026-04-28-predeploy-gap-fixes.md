# Pre-Deploy Gap Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the pre-deploy functional gaps and UI polish items, add AI-suggestion UI in dashboard (no backend), and run a full security pass before Netlify deployment.

**Architecture:** Keep changes localized to page modules and existing services, using Firebase Auth/Firestore for data. Guest sponsorship will allow unauthenticated users to sponsor (client creates a pending transaction with no persistent user id); UI should encourage login but must still permit a guest flow. UI-only AI suggestion feature will be front-end modal stubs with no data persistence.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), Firebase Auth/Firestore, Vite.

---

## Pre-Deploy Must-Do (Required Before Netlify)
- Badge features (modal + icons) on fan profile
- Avatar source fixes (fan from users, creator from vtubers)
- Dashboard real data (Overview + CRM)
- Full security review (frontend + Firestore/Storage rules)
- Guest (匿名) sponsorship UI: allow unauthenticated users to sponsor without signing in (UI will encourage login). Ensure transaction writes are protected by Firestore rules or server-side validation so clients cannot set/modify sensitive fields like `status`.

---

### Task 1: Auth Updates (Google Login + Remove Dev Login)

**Files:**
- Modify: auth.html
- Modify: auth.css
- Modify: js/services/auth.service.js

**Step 1: Remove dev login UI**
- Delete the dev-only login button and any related text in `auth.html` that exposes test credentials.

**Step 2: Add Google sign-in UI**
- Add a Google sign-in button in `auth.html` (match existing styles).
- Ensure `auth.css` includes the button style (or reuse existing primary button styles).

**Step 3: Add Google sign-in logic**
- Implement `authService.loginWithGoogle()` in `js/services/auth.service.js` if missing.
- Wire the button `onclick` to call Google login and redirect by role.

**Step 4: Test (manual by user)**
- User will run dev and test Google login locally. (No automated tests or commits performed by agent.)

**Notes:**
- We are NOT adding Firebase anonymous sign-in. Guest sponsorship is supported as an unauthenticated client action (see Task 2) — but because allowing unauthenticated writes has security implications, Task 8 (security review) will ensure Firestore rules prevent clients from tampering with sensitive transaction fields.

---

### Task 2: Guest Sponsorship Flow (UI Prompt + Data Path)

**Files:**
- Modify: js/services/payment.service.js
- Modify: vtuber_profile.html
- Modify: js/pages/vtuber-profile.page.js

**Step 1: Guest sponsorship behavior**
- Allow unauthenticated users to sponsor from the public VTuber page.
- When no logged-in user, Payment UI shows an encouragement message and a prominent "登入以保留紀錄" CTA, but still allows proceeding.
- For guest sponsors, create a transaction with `fanUid: null` (or `fanUid: 'guest'`) and `fanName: '匿名粉絲'`.

**Step 2: Protect sensitive fields**
- Ensure Firestore rules (Task 8) prevent clients from setting `status` to `success` or modifying `confirmedAt` — only server-side processes (or secure Cloud Functions / admin SDK) can update transaction `status`.

**Step 3: UI implementation details**
- In `vtuber_profile.html` payment modal, add info text for guest state and a login CTA that opens `auth.html` or triggers Google login.
- Update `vtuber-profile.page.js` to set `fanName`/`fanUid` appropriately and fallback to `匿名粉絲` when unauthenticated.

**Step 4: Test (manual by user)**
- User will verify that guests can create a pending transaction and that status remains `pending` until server-side confirmation.

**Notes:**
- This approach avoids adding Firebase anonymous sign-in while still supporting guest sponsors. Security review must ensure this write pattern is safe.

---

### Task 3: VTuber Profile Data Fixes (Sorting, Social Links, Avatars)

**Files:**
- Modify: js/pages/vtuber-profile.page.js
- Modify: vtuber_profile.html
- Modify: vtuber_profile.css
- Modify: js/services/milestones.service.js

**Step 1: Milestone ordering**
- Ensure milestones render newest-first per section:
  - active/published sorted by `publishedAt desc` (fallback `createdAt desc`).
  - achieved sorted by `achievedAt desc` (fallback `updatedAt desc`).

**Step 2: Social links**
- In `renderVtuber()`, populate social buttons from vtuber profile fields.
- In HTML, replace static links with dynamic placeholders for YouTube/X/Instagram.

**Step 3: Avatar sources**
- Replace placeholder avatar URLs in rankings and comments with users collection lookups.
- Cache user avatar lookups per page load to avoid repeated calls.

**Step 4: UI polish for social links and milestone sections**
- Adjust button sizes and spacing to match profile header.

**Step 5: Test**
- Load vtuber profile with sample data and confirm order is newest-first.
- Confirm social links point to real URLs and open correctly.
- Confirm ranking avatars show user avatars when available.

**Step 6: Commit**
- `git add js/pages/vtuber-profile.page.js vtuber_profile.html vtuber_profile.css js/services/milestones.service.js`
- `git commit -m "feat: vtuber profile ordering, social links, avatars"`

---

### Task 4: Fan Profile Badge + Transactions + Avatar Upload

**Files:**
- Modify: js/pages/fan-profile.page.js
- Modify: fan_profile.html
- Modify: fan_profile.css
- Modify: js/services/storage.service.js (if needed)

**Step 1: Fix badge modal**
- Use existing `openBadgeReview()` (in fan_profile.html) and wire badge items to call it.
- Ensure badge icon renders from `badge.icon` or `badge.badgeUrl` in Firestore.

**Step 2: Replace stub badges/titles**
- In `fan-profile.page.js`, render badges/titles from users/{uid}.
- Ensure settings modal lists all badges and allows “selected” to toggle.

**Step 3: 30-day transaction filter**
- Query transactions with `createdAt >= now - 30 days` and status `success`.
- Update table to show empty state if no records.

**Step 4: Avatar upload**
- Add upload handling for `#theme-avatar`:
  - Upload to storage via `storageService` (existing upload path).
  - Save `photoURL` to users/{uid}.
  - Update UI preview immediately.

**Step 5: Empty state text**
- When no badges/achievements or no supported vtubers, show friendly CTA text.

**Step 6: Test**
- Login as fan and verify badges open modal.
- Verify 30-day table only shows recent items.
- Upload avatar and refresh page to confirm persistence.

**Step 7: Commit**
- `git add js/pages/fan-profile.page.js fan_profile.html fan_profile.css js/services/storage.service.js`
- `git commit -m "feat: fan profile badges, avatar upload, 30-day tx"`

---

### Task 5: Dashboard Real Data + AI Suggestion UI (UI Only)

**Files:**
- Modify: dashboard.html
- Modify: dashboard.js
- Modify: dashboard.css

**Step 1: Overview KPI data**
- Replace hardcoded KPIs with computed values from transactions and milestones.
- Calculate: monthly total support, active supporters count, badges count, views (placeholder if not available).

**Step 2: Active milestones table**
- Render from `MilestonesService.getMilestones()` and compute progress.

**Step 3: Recent top fans list**
- Derive from transactions grouped by fanUid (top 3).

**Step 4: CRM table**
- Ensure `renderCRM()` uses real transactions and filters work.

**Step 5: Add AI suggestion UI in Milestones tab**
- Add a button "AI 生成提案" that opens a modal.
- Modal includes prompt text area and a "生成" button (no backend).
- On click, show placeholder suggestions in the modal.

**Step 6: Add AI suggestion UI in Posts tab**
- Add a button "AI 生成貼文" near composer.
- Modal with prompt + placeholder suggestion cards.

**Step 7: Test**
- Verify dashboard loads real data (no static numbers).
- Verify both AI modals open/close and show placeholder text.

**Step 8: Commit**
- `git add dashboard.html dashboard.js dashboard.css`
- `git commit -m "feat: dashboard data + ai suggestion ui"`

---

### Task 6: Index Recommended VTuber Update

**Files:**
- Modify: index.html
- Modify: js/pages/index.page.js

**Step 1: Use real vtuber data**
- Fetch vtuber list or specific handle from Firestore.
- Replace static recommended card with real data.

**Step 2: Test**
- Load index page and confirm recommended vtuber uses live data.

**Step 3: Commit**
- `git add index.html js/pages/index.page.js`
- `git commit -m "feat: index recommended vtuber from firestore"`

---

### Task 7: Design System and UI Readability

**Files:**
- Modify: styles.css
- Modify: vtuber_profile.css
- Modify: fan_profile.css
- Modify: dashboard.css

**Step 1: Typography + spacing**
- Increase line-height in tables and dense text blocks.
- Ensure headers and labels have consistent font sizes.

**Step 2: Contrast and readability**
- Adjust muted text colors for better contrast.
- Ensure tables and cards have clear row separation.

**Step 3: Consistency**
- Align colors and shadows with styles.css tokens.

**Step 4: Test**
- Review each page on desktop and mobile widths.
- Check that interactive elements are legible.

**Step 5: Commit**
- `git add styles.css vtuber_profile.css fan_profile.css dashboard.css`
- `git commit -m "style: improve readability and design consistency"`

---

### Task 8: Full Security Review (Frontend + Rules)

**Files:**
- Review: firestore.rules
- Review: storage.rules
- Review: js/firebase-config.js
- Review: js/services/payment.service.js
- Review: js/services/auth.service.js

**Step 1: Dependency check**
- Run: `npm audit --production`
- Record any HIGH/CRITICAL issues.

**Step 2: Secrets scan**
- Search for hardcoded secrets in repo and confirm `.env` is not committed.

**Step 3: Rules review**
- Ensure transactions cannot be modified by clients after creation.
- Ensure anonymous users can only write minimal fields required for sponsorship.

**Step 4: Frontend input review**
- Verify user-generated text is escaped before HTML insertion.
- Identify any `innerHTML` usage and sanitize.

**Step 5: Document findings**
- Create a short security notes section in the plan with findings and fixes.

**Step 6: Commit (if any rule changes)**
- `git add firestore.rules storage.rules`
- `git commit -m "chore: harden firestore and storage rules"`

---

### Task 9: Netlify Pre-Deploy Checklist

**Files:**
- Modify: netlify.toml (if needed)
- Verify: .env (local only, do not commit)
- Verify: package.json

**Step 1: Build**
- Run: `npm run build`
- Confirm dist output.

**Step 2: Environment variables**
- Ensure Netlify has all `VITE_*` values and `VITE_USE_EMULATOR=false`.

**Step 3: Deploy**
- Trigger deploy via Netlify after merge to main.

---

## Execution Order Recommendation
1. Tasks 1-2 (Auth + Anonymous sponsorship)
2. Tasks 3-4 (VTuber + Fan profile data fixes)
3. Task 5 (Dashboard data + AI UI)
4. Task 6 (Index data)
5. Task 7 (Design polish)
6. Task 8 (Security review)
7. Task 9 (Netlify deploy)

---

## Post-Deploy Backlog (Optional)
- Notification center real data
- Fan share public page
- AI backend integration for suggestions

---
