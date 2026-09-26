# Course Moderation System — Back-End API

A REST API for the Course Moderation System (ICT304 Capstone), built to match
the stack committed to in the Week 6 progression report:

- **Node.js** + **Express.js** for the API
- **MySQL** for the database
- **Sequelize** as the ORM
- Tables: `User`, `Assessment`, `Reviewer`, `Feedback`, `ApprovalStatus`

This is the back-end only. The front-end (login, dashboard, upload, review
pages) stays as the static HTML/Bootstrap prototype hosted on GitHub Pages,
per the report's Week 9 plan: "the front-end forms would be connected with
the API."

This has been built and tested end-to-end against a real MySQL database —
login, JWT auth, role restrictions, file upload, and the approve/request
changes workflow all verified working.

## Data Model

| Table            | Purpose                                                        |
|-------------------|------------------------------------------------------------------|
| `User`            | Login accounts — lecturers, reviewers, admins                   |
| `Reviewer`        | 1:1 extension of a User with role `reviewer`/`admin`             |
| `ApprovalStatus`  | Lookup table: Pending, Under Review, Approved, Changes Requested |
| `Assessment`      | An uploaded assessment — title, subject, type, file, status      |
| `Feedback`        | Review history — comment + decision per assessment               |

Foreign keys: `Reviewer.user_id → User.id`, `Assessment.uploaded_by → User.id`,
`Assessment.reviewer_id → Reviewer.id`, `Assessment.status_id → ApprovalStatus.id`,
`Feedback.assessment_id → Assessment.id`, `Feedback.reviewer_id → Reviewer.id`.

## Requirements

- Node.js 18+
- MySQL 8.0+ (or MariaDB 10.3+)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create the database**

   ```sql
   CREATE DATABASE course_moderation_system;
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your MySQL credentials. Using the MySQL `root` account
   directly often fails on TCP connections because root defaults to
   socket-only auth — create a dedicated app user instead:

   ```sql
   CREATE USER 'cms_app'@'localhost' IDENTIFIED BY 'your_password_here';
   GRANT ALL PRIVILEGES ON course_moderation_system.* TO 'cms_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

   Then set `DB_USER=cms_app` and `DB_PASSWORD=your_password_here` in `.env`.

   Also set `JWT_SECRET` to a long random string:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. **Create tables and seed demo data**

   ```bash
   npm run seed
   ```

   This creates all 5 tables and adds demo accounts (password for all:
   `password123`):

   | Email                  | Role      |
   |-------------------------|-----------|
   | smith@example.edu       | reviewer  |
   | lee@example.edu         | reviewer  |
   | brown@example.edu       | reviewer  |
   | john.doe@example.edu    | lecturer  |

   ⚠️ `npm run seed` drops and recreates every table — only run it in
   development, never against real data.

5. **Run the server**

   ```bash
   npm run dev     # with nodemon, auto-restarts on changes
   # or
   npm start
   ```

   The API runs at `http://localhost:5000` by default.

## API Reference

All protected routes require `Authorization: Bearer <token>`, obtained from
`/api/auth/login`.

### Auth

| Method | Route                | Access | Body                                              |
|--------|------------------------|--------|----------------------------------------------------|
| POST   | `/api/auth/register`   | Public | `{ fullName, email, password, role }`               |
| POST   | `/api/auth/login`      | Public | `{ email, password }` → returns `{ token, user }`   |

### Assessments

| Method | Route                   | Access             | Notes                                       |
|--------|---------------------------|----------------------|------------------------------------------------|
| GET    | `/api/assessments`        | Any logged-in user   | Lists all, with uploader/reviewer/status joined |
| GET    | `/api/assessments/:id`    | Any logged-in user   | Includes feedback history                       |
| POST   | `/api/assessments`        | lecturer, admin       | `multipart/form-data`: `title`, `subjectCode`, `assessmentType`, `file` |

### Reviews

| Method | Route                       | Access             | Notes                                     |
|--------|-------------------------------|----------------------|----------------------------------------------|
| POST   | `/api/reviews`                | reviewer, admin       | `{ assessmentId, comment, decision }` — `decision` is `"approve"` or `"request_changes"` |
| GET    | `/api/reviews/:id/history`    | Any logged-in user   | Feedback history for one assessment           |

### Example: full flow with curl

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.edu","password":"password123"}' \
  | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).token))")

# Upload an assessment
curl -X POST http://localhost:5000/api/assessments \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Assignment 3" \
  -F "subjectCode=ICT304" \
  -F "assessmentType=Assignment" \
  -F "file=@/path/to/file.pdf"

# List assessments
curl http://localhost:5000/api/assessments -H "Authorization: Bearer $TOKEN"
```

## Connecting the GitHub Pages Front-End (Week 9)

Since the front-end and back-end are hosted separately, calls from the
static HTML pages need to hit the full API URL and send the JWT:

```javascript
const API_URL = 'https://your-deployed-api.example.com'; // or http://localhost:5000 locally

async function login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';
    } else {
        alert(data.error);
    }
}

async function loadAssessments() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/assessments`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
```

CORS is already enabled server-side (`app.use(cors())`) so GitHub Pages can
call this API cross-origin without extra configuration.

## Project Structure

```
course-moderation-backend/
├── config/database.js         # Sequelize connection
├── models/
│   ├── User.js
│   ├── Reviewer.js
│   ├── ApprovalStatus.js
│   ├── Assessment.js
│   ├── Feedback.js
│   └── index.js                # associations / foreign keys
├── middleware/
│   ├── auth.js                 # JWT verify + role check
│   └── upload.js                # multer file upload config
├── controllers/
│   ├── authController.js
│   ├── assessmentController.js
│   └── reviewController.js
├── routes/
│   ├── authRoutes.js
│   ├── assessmentRoutes.js
│   └── reviewRoutes.js
├── uploads/                     # uploaded files land here
├── server.js                    # Express entry point
├── seed.js                      # creates tables + demo data
├── .env.example
└── package.json
```

## Known Issues / Notes

- `npm audit` reports a moderate-severity advisory in `uuid` (a transitive
  dependency of Sequelize itself, triggered only when a `buf` argument is
  passed — something this codebase never does). Forcing the fix would
  downgrade Sequelize to an old version, so it's left as-is; worth checking
  for an updated Sequelize release before a production deployment.
- No CSRF protection, rate limiting, or upload file-type/size validation
  beyond a 20MB cap — add these before deploying publicly, per Week 10's
  testing/debugging milestone.
- Role assignment on `/api/auth/register` is currently open (anyone can
  register as `reviewer` or `admin`). For production, restrict role
  assignment to an admin-only endpoint.
