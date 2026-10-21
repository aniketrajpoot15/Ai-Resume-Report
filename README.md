# AI Job Preparation & Interview Strategy Generator

A full-stack career preparation application that turns a candidate's resume or profile and a target job description into a structured, personalized interview preparation plan. The app combines a React interface, an Express API, MongoDB persistence, Google Gemini for structured AI output, and Puppeteer for downloadable PDF resumes.

This repository is a practical, production-oriented full-stack project: it demonstrates the major pieces of a real product, including account flows, protected user data, document intake, an external AI integration, saved reports, and generated downloads. Before exposing it to real users, complete the deployment and security hardening described below.

## What the application does

The user creates an account, provides a job description, and adds candidate context by uploading a PDF resume or entering a self-description. The backend extracts text from a PDF when supplied, sends the candidate context and job description to Gemini, validates the AI response against a schema, and saves a report under the authenticated user's account. The report can be revisited later and used to generate a tailored resume PDF.

The goal is to make preparation actionable. Instead of returning a generic list of questions, a report brings together a profile-to-role match score, technical and behavioral interview practice, prioritized skill gaps, and a day-by-day preparation plan.

## Product capabilities

- **Account creation and sign-in:** Register and log in with an email and password. Passwords are hashed with bcrypt; the API issues a signed JWT in a cookie.
- **Protected personal workspace:** Interview routes require a valid authenticated session. Report listing and lookup are scoped to the signed-in user.
- **Resume or profile intake:** Upload a PDF resume (maximum 3 MB) or supply a self-description. The app extracts text from the uploaded PDF in memory for analysis; DOCX and image files are not supported.
- **Job-specific AI analysis:** Provide a target job description to generate a match score, technical and behavioral questions with answer guidance and interviewer intent, skill gaps with severity, and a sequenced preparation plan.
- **Structured AI responses:** Gemini is asked for JSON matching a Zod schema, and the server validates the parsed response before saving it. The integration tries configured fallback models when Gemini returns rate-limit or service-unavailable errors.
- **Saved reports:** Reports are stored in MongoDB with the candidate context, target role details, generated recommendations, and creation timestamps. The list endpoint returns a compact summary; a detail endpoint returns the full report.
- **Tailored resume export:** Generate a job-aligned resume as a downloadable A4 PDF. Gemini creates the HTML content and Puppeteer renders it to PDF.
- **Single-page frontend app:** React and React Router provide registration, login, protected routes, the interview workflow, report views, and API calls to the backend.

## Typical user journey

1. Register or sign in.
2. Paste the target job description.
3. Upload a readable PDF resume or enter a self-description.
4. Generate a report and review the match score, question sets, skill gaps, and preparation roadmap.
5. Return to saved reports and export a tailored resume PDF when needed.

## Architecture and request flow

```text
React + Vite browser app
        │ JSON / multipart requests; cookie credentials
        ▼
Express API ── JWT authentication middleware
        │
        ├── MongoDB / Mongoose: users, reports, token blacklist
        ├── PDFParse: extract resume text from uploaded PDF
        └── Gemini API: structured interview analysis and resume HTML
                           │
                           └── Puppeteer: render resume HTML as PDF
```

The backend keeps the Gemini key and database connection on the server. The browser communicates with the API; it does not call Gemini directly. Uploaded resume bytes are held in memory while the request is processed, and extracted text is persisted as part of the report.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, Sass |
| API | Node.js, Express 5 |
| Data | MongoDB, Mongoose |
| Authentication | JWT, bcrypt, cookie-parser |
| AI generation | Google Gemini via `@google/genai`, Zod response validation |
| Resume processing | `pdf-parse`, Multer in-memory upload, Puppeteer PDF rendering |

## Repository layout

```text
Backend/
  server.js                  Starts the API and database connection
  src/
    app.js                   Express middleware and route registration
    config/                  Database connection
    controllers/             Authentication and interview request handlers
    middlewares/             Authentication and PDF upload handling
    models/                  User, interview report, and token blacklist schemas
    routes/                  Authentication and interview API routes
    services/                Gemini generation and PDF rendering
Frontend/
  src/
    features/auth/           Registration, login, session state, route protection
    features/interview/      Interview workflow, report UI, API and state
    app.routes.jsx           Application routes
```

## Run locally

### Prerequisites

- Node.js and npm
- A reachable MongoDB database (local MongoDB or MongoDB Atlas)
- A Google Gemini API key with access and available quota
- A Chromium-compatible runtime supported by Puppeteer for PDF generation

### 1. Configure and start the backend

From the repository root:

```powershell
cd .\Backend
npm install
```

Create `Backend/.env` with your own values:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/yt-genai
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_GENAI_API_KEY=your-gemini-api-key
```

Use your Atlas connection string for `MONGODB_URI` when using MongoDB Atlas. Keep credentials private and do not commit `.env`.

Start the API from `Backend`:

```powershell
npm run dev
```

The API listens on `http://localhost:3000` and connects to MongoDB at startup.

### 2. Start the frontend

In a second terminal from the repository root:

```powershell
cd .\Frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The current frontend API client targets `http://localhost:3000`, and backend CORS is configured for the Vite development origin.

## API overview

All endpoints return JSON except the resume PDF download. Authentication uses the `token` cookie. Interview endpoints require a valid session.

### Authentication — `/api/auth`

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/register` | Create an account from `username`, `email`, and `password` |
| `POST` | `/login` | Authenticate with `email` and `password` |
| `GET` | `/logout` | Clear the session cookie and blacklist the current token |
| `GET` | `/get-me` | Return the signed-in user's basic profile |

### Interview preparation — `/api/interview`

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/` | Generate and save a report from `jobDescription`, optional `selfDescription`, and optional multipart PDF field `resume` |
| `GET` | `/` | List the current user's saved report summaries |
| `GET` | `/report/:interviewId` | Fetch one of the current user's full reports |
| `POST` | `/resume/pdf/:interviewReportId` | Generate and download the tailored resume PDF for a saved report |

The report-generation request needs a non-empty job description and at least one candidate input (a PDF resume or self-description). PDF uploads are limited to 3 MB.

## Configuration and operational notes

- `MONGODB_URI` — MongoDB connection string.
- `JWT_SECRET` — secret used to sign and verify one-day JWTs. Use a strong, unique secret outside local development.
- `GOOGLE_GENAI_API_KEY` — server-side Gemini API key. Never expose this key in frontend code.
- The API currently uses port `3000`, allows the development frontend origin `http://localhost:5173`, and the frontend API client targets that local API URL.
- Gemini quota and availability affect report and resume generation. The service tries its configured fallback models for `429` and `503` responses; fallback models still depend on valid credentials and provider quota.
- Resume generation launches Puppeteer, so the deployment environment must support its Chromium runtime and required OS libraries.

## Production deployment checklist

The project demonstrates a production-style flow, but the checked-in configuration is development-oriented. Before a public deployment, configure the production frontend origin and API URL; serve the app over HTTPS; set secure, `httpOnly`, and appropriate `sameSite` cookie options; validate and normalize account inputs; add request rate limits and abuse controls for authentication, uploads, and paid AI operations; enforce ownership checks on every report operation (including PDF export); review PDF and generated HTML handling; configure request size limits, logging, monitoring, and graceful shutdown; and plan retention/deletion controls for resumes and report data. Keep secrets in the deployment platform's secret manager and verify Puppeteer works in the chosen runtime.

AI output is generated assistance and can be inaccurate or incomplete. Candidates should verify generated resume claims and recommendations before using them.

## Troubleshooting

- **Backend connection refused:** Start the API from `Backend` with `npm run dev` and check that it is listening on port `3000`.
- **MongoDB connection error:** Confirm `MONGODB_URI` in `Backend/.env` and verify the database is reachable from the backend.
- **Gemini `401` or `403`:** Check that `GOOGLE_GENAI_API_KEY` is valid and enabled for Gemini.
- **Gemini `429` or `503`:** Check provider quota and availability. The service tries fallback models, but provider limits can affect all of them.
- **Resume rejected or unreadable:** Upload a readable PDF no larger than 3 MB. DOCX files are not supported.
- **PDF export fails:** Confirm Puppeteer's Chromium runtime can launch in the environment and that required system libraries are installed.
