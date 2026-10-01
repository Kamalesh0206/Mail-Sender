# 🎂 WishesAI — Production-Ready AI Birthday & Wishes Email Agent

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-61DAFB.svg?logo=react)](https://react.dev)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini_Direct_API-4285F4.svg?logo=google)](https://aistudio.google.com)
[![Gmail API](https://img.shields.io/badge/Email-Gmail_API_(OAuth_2.0)-EA4335.svg?logo=gmail)](https://developers.google.com/gmail/api)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_/_SQLite-336791.svg?logo=postgresql)](https://www.postgresql.org)
[![Scheduler](https://img.shields.io/badge/Scheduler-APScheduler-blue.svg)](https://apscheduler.readthedocs.io)

An autonomous AI agent that detects when your friends, family, or colleagues have a birthday, anniversary, or special occasion today and sends them a warm, personalized email via the official Gmail API powered directly by Google Gemini AI.

---

## 🌟 Key Highlights

1. **Direct Google Gemini API Integration**: Zero dependencies on heavy frameworks like CrewAI or LangChain. Crafts personalized, contextual wishes taking into account relationship, personal notes, hobbies, and tone.
2. **Secure Gmail API Integration (Google OAuth 2.0)**:
   - Requests minimal necessary scopes (`gmail.send` and `userinfo.email`).
   - Never asks for or stores user Gmail passwords.
   - Encrypts OAuth refresh tokens at rest with AES-128 Fernet keys.
   - Auto-refreshes expired access tokens seamlessly.
3. **Approval vs Auto Mode**:
   - **APPROVAL MODE (Default)**: Automatically prepares drafts at 8:00 AM every morning and holds them in an intuitive web Approval Queue. You can review, edit, change tones, and 1-click send with celebratory confetti.
   - **AUTO MODE**: Autonomous hands-free dispatch.
4. **Duplicate Protection Constraint**:
   - Database constraint `UNIQUE (friend_id, occasion_type, year)` strictly prevents sending the same birthday or occasion email more than once in the same calendar year.
5. **Extensible Occasion Architecture**:
   - Plug-and-play strategy handlers for:
     - 🎂 **Birthdays**
     - 💍 **Anniversaries**
     - 💼 **Work Anniversaries** (milestone year calculations)
     - 🪔 **Festivals**
     - ✨ **Custom Celebrations**
6. **Built-in Daily Automation**:
   - Background APScheduler cron job runs daily at your chosen time (default `08:00 AM`). Dynamically reschedules when changed in settings without restarting the server.
7. **Production-Grade Dashboard**:
   - Real-time stat cards, Today's Occasions radar, 30-Day Upcoming Countdown, Audit history with Gmail Message IDs, Friend Management, and Test Email sender.

---

## 🏗️ Project Architecture

```
Email_agent/
├── backend/
│   ├── config/             # Pydantic Settings & environment validation
│   ├── database/           # SQLAlchemy models, session engine & initialization
│   ├── services/           # Encryption (Fernet), Gemini AI & Gmail OAuth services
│   ├── agents/             # Occasion strategy handlers & Wish Agent orchestrator
│   ├── scheduler/          # APScheduler daily cron job runner
│   ├── schemas/            # Pydantic request/response schemas
│   ├── routers/            # FastAPI REST endpoints (Friends, Wishes, Auth, Settings, Stats)
│   └── main.py             # FastAPI entrypoint, CORS, lifespan & router mounts
├── frontend/
│   ├── src/
│   │   ├── components/     # Navbar, DashboardView, ApprovalQueue, Friends, History, Settings
│   │   ├── api.ts          # Strongly typed REST client
│   │   ├── App.tsx         # Root state & view controller
│   │   └── index.css       # Slate & Indigo glassmorphism design system
│   └── package.json
├── database/
│   ├── schema.sql          # PostgreSQL DDL schema with indexes and constraints
│   └── seed_data.py        # Database seed script with sample friends
├── tests/
│   └── test_agent.py       # Pytest unit & integration test suite
├── docs/
│   └── API.md              # Detailed REST API specification
├── docker-compose.yml      # Multi-container orchestration (Postgres + Backend)
├── Dockerfile              # Backend container definition
├── requirements.txt        # Python dependencies
└── .env.example            # Environment configuration template
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) PostgreSQL or Docker

### Step 1: Clone & Configure Environment

```bash
cd Email_agent
copy .env.example .env   # On macOS/Linux: cp .env.example .env
```

Edit `.env` with your API keys:
- `GEMINI_API_KEY`: Get a free key at [Google AI Studio](https://aistudio.google.com/)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Get from [Google Cloud Console](https://console.cloud.google.com/)

> **Note**: For zero-configuration local development, `DATABASE_URL` defaults to SQLite (`sqlite:///./wishes.db`). To use PostgreSQL, set:
> `DATABASE_URL=postgresql://user:password@localhost:5432/wishes_db`

### Step 2: Set Up Backend

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate       # On macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed sample friends (Arun, Priya, Rahul, Divya)
python -m database.seed_data

# Run tests
pytest tests/test_agent.py

# Start FastAPI backend
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend will be active at `http://127.0.0.1:8000`  
Swagger API Docs available at `http://127.0.0.1:8000/api/v1/docs`

### Step 3: Set Up Frontend

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## 🔑 Google Cloud OAuth & Gmail API Setup Instructions

Follow these steps to connect your Gmail account via Google OAuth 2.0:

1. **Go to Google Cloud Console**:
   Visit [https://console.cloud.google.com/](https://console.cloud.google.com/) and create a new project (e.g. `Wishes-AI-Agent`).

2. **Enable Gmail API**:
   - In the sidebar, navigate to **APIs & Services** > **Library**.
   - Search for **Gmail API** and click **Enable**.

3. **Configure OAuth Consent Screen**:
   - Navigate to **APIs & Services** > **OAuth consent screen**.
   - Select **External** (or Internal for Google Workspace users).
   - Enter App Name: `WishesAI Agent`, and your User support email.
   - Under **Scopes**, add:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Under **Test users**, add your own Gmail address (since the app is in testing mode).

4. **Create OAuth 2.0 Credentials**:
   - Navigate to **APIs & Services** > **Credentials**.
   - Click **Create Credentials** > **OAuth client ID**.
   - Application Type: **Web application**.
   - Name: `WishesAI Web Client`.
   - **Authorized redirect URIs**: Add:
     `http://localhost:8000/api/v1/auth/google/callback`
   - Click **Create**. Copy the **Client ID** and **Client Secret**.

5. **Update `.env`**:
   ```env
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
   ```

6. **Connect via Dashboard**:
   - Open `http://localhost:5173/settings`.
   - Click **Connect Google Account**.
   - Grant permission on Google's consent screen. You will be redirected back with a green "Connected" badge!
   - Click **Send Test Email** to verify the integration immediately!

---

## 🤖 Google Gemini API Setup Instructions

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** > **Create API key**.
4. Paste the key into `.env`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   DEFAULT_AI_MODEL=gemini-2.5-flash
   ```

*(If no Gemini API key is configured, the system uses built-in smart templates so local testing never breaks.)*

---

## 🐳 Docker Compose Deployment

To deploy with PostgreSQL in a single command:

```bash
docker compose up -d --build
```

This starts:
- `wishes_postgres`: PostgreSQL 16 container with automatic schema migration
- `wishes_backend`: FastAPI backend on port 8000

---

## 🛡️ Security Features

- **Encrypted Refresh Tokens**: Stored using cryptography Fernet symmetric encryption.
- **Zero Password Storage**: Uses standard Google OAuth 2.0 authorization code flow.
- **Email Address Validation**: Verified format checks on all recipients.
- **Duplicate Prevention**: Strict SQL Unique constraint prevents repeated sends.
- **Audit Logging**: Every send stores the Gmail message ID and full timestamp.

---

## 🧪 Running the Test Suite

```bash
.venv\Scripts\pytest.exe tests/test_agent.py -v
```

Tests verify:
- OAuth token encryption and decryption
- Friend creation and date queries
- Duplicate send protection database constraint
- Gemini AI prompt generation & fallback templates across all 5 tones
- Daily scan agent workflow
- Occasion extensible registry
- Scheduler cron time string parsing
