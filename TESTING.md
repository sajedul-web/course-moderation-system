# Testing Guide (Week 10)

This project uses **Jest** (test runner/assertions) and **Supertest** (HTTP
assertions against the Express app) for automated backend testing.

## One-time setup

1. Install the new test dependencies (already added to `package.json`):
   ```bash
   npm install
   ```

2. Create a **separate test database** — tests never touch your real dev
   data, they run against their own database that gets wiped and rebuilt
   on every run:
   ```sql
   CREATE DATABASE course_moderation_system_test;
   GRANT ALL PRIVILEGES ON course_moderation_system_test.* TO 'cms_app'@'localhost';
   FLUSH PRIVILEGES;
   ```
   (Replace `cms_app` with whatever DB user your `.env` already uses — same
   user, just a second database alongside your real one.)

## Running the tests

```bash
npm test
```

This runs all four test files and prints a pass/fail summary. Example output:

```
PASS tests/reviews.test.js
PASS tests/assessments.test.js
PASS tests/audit.test.js
PASS tests/auth.test.js

Test Suites: 4 passed, 4 total
Tests:       37 passed, 37 total
```

## How it works

- `config/database.js` automatically switches to `<your db name>_test` when
  `NODE_ENV=test` — `tests/env.js` sets that flag before any app code loads,
  so this happens without needing any shell-specific syntax (works the same
  on Windows, Mac, and Linux).
- `tests/globalSetup.js` runs once before all tests: wipes and recreates
  every table in the test database, then seeds the four `ApprovalStatus`
  rows every assessment needs (Pending, Under Review, Approved, Changes
  Requested).
- Each test file registers its own throwaway user accounts with unique,
  timestamped emails, so tests never collide with each other or with
  leftover data from a previous run.
- `app.js` exports the configured Express app *without* starting a real
  server — Supertest talks to it directly in memory, which is why tests run
  in a few seconds instead of needing a live `npm run dev` process.

## What's covered

**`tests/auth.test.js`** — registration (lecturer, reviewer, duplicate email,
missing fields) and login (correct credentials, wrong password, unknown
email).

**`tests/assessments.test.js`** — upload (success with semester field, role
rejection for reviewers, missing-field validation), listing and fetching,
reviewer assignment (owner can assign, non-owner/non-admin blocked, reviewer
can't assign), and edit/resubmit (owner can edit, non-owner blocked, editing
an Approved assessment is blocked).

**`tests/reviews.test.js`** — the review lifecycle: reviewing before
assignment is blocked, a non-assigned reviewer is blocked, saving a draft
comment doesn't change the assessment's status, drafts reload correctly,
repeated draft saves update the same row instead of duplicating it,
finalizing absorbs the draft into one row, both decision outcomes (Approved
/ Changes Requested) set the right status, drafts are excluded from the
finalized feedback history — and a check that a `score` sent in the request
is silently ignored, since reviewer grading was intentionally removed
(reviewers decide Approve/Request Changes with a comment only, no numeric
grade).

**`tests/audit.test.js`** — the audit log and admin reassignment features:
non-admins are blocked from viewing the audit log, admins can view it,
`UPLOAD` and `APPROVE` actions get logged correctly with the acting user
attached, a lecturer is blocked from reassigning an already-approved
assessment, an admin *can* reassign one (this is the one exception to the
"locked once Approved" rule), that reassignment gets logged as `REASSIGN`
with a human-readable "from X to Y" detail, and the newly assigned reviewer
can act on the assessment afterward.

## A real bug this suite caught

While writing these tests, `assessments.test.js` failed on this assertion:

```js
expect(res.body.reviewerId).toBeNull();
```

The upload endpoint was leaving `reviewerId` **entirely absent** from the
JSON response instead of `null`. The cause: Sequelize with MySQL doesn't
re-fetch a row's untouched columns after `INSERT` (MySQL has no `RETURNING`
clause like PostgreSQL does), so any field never explicitly passed to
`.create()` stays unset in the JS object rather than `null` — and
`JSON.stringify` omits unset keys entirely.

Checked whether this had already caused a real problem: no front-end code
reads `assessment.reviewerId` directly (it checks the nested
`assessment.reviewer` object instead), so nothing was actually broken yet —
but it was a real inconsistency waiting to bite something later. Fixed by
explicitly passing `reviewerId: null` in `assessmentController.js`'s upload
function, matching the same explicit pattern already used for `filePath`.
Retested: 28/28 passing.

## Note: reviewer grading was removed after initial testing

An earlier version of this project let reviewers enter a numeric score
alongside their Approve/Request Changes decision, with tests confirming it
worked correctly. That capability was intentionally removed on a later
pass — reviewers now only approve or request changes with a written
comment, no score. `reviews.test.js` was rewritten accordingly (the score
assertions were replaced with a check confirming the API ignores a score
even if one is sent), and `audit.test.js` was added alongside two other new
features: admin-only reviewer reassignment after approval, and a full audit
log of upload/edit/assign/reassign/approve/request-changes actions.

## Adding more tests later

Follow the existing pattern: `registerAndLogin(role, label)` at the top of
each file creates disposable test accounts, then each `it(...)` block hits
a real route through `request(app)` and asserts on the response. Keep using
unique, timestamped emails/titles so new tests don't collide with old ones
if the test DB isn't wiped between individual runs within the same
`npm test` invocation.
