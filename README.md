# WishMail AI

> **"Personal wishes. Meaningful quotes. Automatically delivered."**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-61DAFB.svg?logo=react)](https://react.dev)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini_Direct_API-4285F4.svg?logo=google)](https://aistudio.google.com)
[![Gmail API](https://img.shields.io/badge/Email-Gmail_API_(OAuth_2.0)-EA4335.svg?logo=gmail)](https://developers.google.com/gmail/api)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_/_SQLite-336791.svg?logo=postgresql)](https://www.postgresql.org)
[![Scheduler](https://img.shields.io/badge/Scheduler-APScheduler_Asia/Kolkata-blue.svg)](https://apscheduler.readthedocs.io)

WishMail AI is a production-ready AI email agent that automatically sends emails to friends through Gmail.

---

## 1. Core Architecture

The application has **ONLY TWO CORE FUNCTIONS**:

1. **💌 WISHES**: Occasion-based (Birthday, Anniversary, Custom Occasions) personalized AI messages generated directly via Google Gemini API.
2. **💬 QUOTES**: User-provided quotes scheduled and delivered to individual friends or groups.
   - **Strict Verbatim Rule**: The system **NEVER** rewrites, paraphrases, alters words, or changes grammar in user-provided quotes. The quote remains exactly as entered. AI optionally crafts only the greeting, introduction, and closing.

```
                    WISHMAIL AI
                         |
             +-----------+-----------+
             |                       |
          WISHES                  QUOTES
             |                       |
      Occasion-based          User-provided
      AI-generated             exact quotes
      messages                     |
             |                 Schedule/Send
             |                       |
             +-----------+-----------+
                         |
                      Gmail API
                         |
                    Send Email
                         |
                  Email History
```

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend**: Python 3.10+, FastAPI, Pydantic v2.
- **Database**: PostgreSQL / SQLite, SQLAlchemy ORM (with 10 normalized tables).
- **AI**: Google Gemini API directly (`google-genai` / `google-generativeai`). *No LangChain, no CrewAI.*
- **Email**: Gmail API with Google OAuth 2.0 (token encryption via AES-128 Fernet). Zero Gmail passwords stored.
- **Scheduler**: APScheduler with `Asia/Kolkata` default timezone and dynamic rescheduling.

---

## 3. Core Modules & Features

### 🏠 Main Dashboard
- **7 Metric Cards**: Today's Wishes, Today's Quotes, Upcoming Wishes, Upcoming Quotes, Emails Sent, Pending Approval, Failed Emails.
- **TODAY'S SCHEDULE Table**:
  `Time | Type | Recipient | Status`
  (e.g., `08:00 AM | Birthday Wish | Arun | Scheduled`)

### 👥 Friend & Group Management
- Fields: Name, Email, Birthday, Anniversary, Relationship, Groups, Personal Notes, Active/Inactive, Enable Wishes, Enable Quotes.
- Groups: Close Friends, College Friends, Office Friends, Family, All Friends.
- Actions: Add, Edit, Delete, Search, Filter, CSV Export.

### 💌 Wishes Module & AI Engine
- Generic occasion architecture (Birthdays, Anniversaries, Custom Occasions).
- Contextual Gemini generation taking friend name, occasion, relationship, personal notes, and preferred tone (Friendly, Casual, Emotional, Funny, Professional).
- **Two Delivery Modes**:
  - **APPROVAL MODE (Default)**: Stages AI drafts in queue for review, inline editing, tone regeneration, and 1-click send.
  - **AUTO SEND MODE**: Fully automated occasion dispatch.
- **Duplicate Protection**: Unique `(friend_id, occasion_name, sent_date)` ensures no friend ever receives duplicate emails on the same occasion.

### 💬 Quotes Module
- **Add Single Quote**: Form with quote text, date, time, recipient (individual, multiple, group, all friends), subject, and personalized introduction switch.
- **Bulk Quote Upload (Excel / CSV)**:
  - Supports `.xlsx` and `.csv`.
  - 3-step validation pipeline: Upload -> Validate all rows -> Show preview (Total Rows, Valid, Invalid with exact row numbers and error descriptions) -> `[Cancel]` or `[Import Valid Quotes]`.
- **Quick Quote Scheduler**: Paste multi-line quotes and automatically distribute them sequentially (Daily, Weekdays, Weekly, Custom dates).
- **Quote Preservation Guarantee**: Quotes are kept 100% verbatim.

### 📅 Calendar Module
- Visual interactive monthly calendar showing scheduled quotes and detected occasions.
- Detailed modal with full quote preview, time, recipients, status, and Send Now / Cancel actions.

### 📧 Email History & Audit Log
- Searchable and filterable history: Wishes, Quotes, Sent, Failed, Pending, Approved, Cancelled.
- Records Gmail Message IDs, recipient emails, delivery timestamps, and failure logs.
- Built-in retry trigger for failed emails.

### ⚙ Settings
- Connected Gmail status & disconnect button.
- Timezone selection (Default: `Asia/Kolkata`).
- Default send time, default wish tone, sender signature.
- Auto-send toggles for Wishes and Quotes.
- Quote greeting & closing templates.
- Immediate Gmail test email verification tool.

---

## 4. Google Cloud Setup Documentation (Step-by-Step)

Follow these exact steps to configure your environment for Gmail API and Google Gemini:

### Step 1: Create Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top bar and select **New Project**.
3. Name the project `WishMail AI` and click **Create**.
4. Make sure your newly created project is selected.

### Step 2: Enable Gmail API
1. In the navigation menu, go to **APIs & Services** > **Library**.
2. In the search box, type `Gmail API`.
3. Click on **Gmail API** and click **Enable**.

### Step 3: Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**.
2. Choose **External** user type (or **Internal** if using Google Workspace). Click **Create**.
3. Fill in the required fields:
   - **App name**: `WishMail AI`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.

### Step 4: Configure Gmail Scopes
1. On the **Scopes** page of the consent screen configuration, click **Add or Remove Scopes**.
2. Add the following scopes:
   - `https://www.googleapis.com/auth/gmail.send` (Send emails on your behalf)
   - `https://www.googleapis.com/auth/userinfo.email` (View your email address)
3. Click **Update** and then **Save and Continue**.
4. Under **Test users**, click **Add Users** and add your Gmail address (required while the app is in testing status). Click **Save and Continue**.

### Step 5: Create OAuth Client ID
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Set **Name** to `WishMail AI Web Client`.

### Step 6: Configure Authorized Redirect URI
1. Under **Authorized redirect URIs**, click **Add URI**.
2. Enter the callback URL:
   ```
   http://localhost:8000/api/v1/auth/google/callback
   ```
   *(For production deployment, add your production domain callback URL here).*
3. Click **Create**.
4. A dialog will display your **Client ID** and **Client Secret**. Copy both values.

### Step 7: Generate Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** (or **Create API key**).
4. Select or create a project and copy your generated Gemini API key.

### Step 8: Configure `.env`
Create a `.env` file in the project root:
```bash
copy .env.example .env
```
Fill in your configuration:
```env
# Google Gemini API
GEMINI_API_KEY=AIzaSy...
DEFAULT_AI_MODEL=gemini-2.5-flash

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# Database (SQLite default; PostgreSQL supported)
DATABASE_URL=sqlite:///./wishes.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/wishmail_ai

# Security & Encryption Key (32-byte base64 Fernet key)
SECRET_KEY=yoursecretkeyhere
TOKEN_ENCRYPTION_KEY=W31qDkL...=   # Run: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# App Defaults
APP_TIMEZONE=Asia/Kolkata
DEFAULT_SEND_TIME=08:00
DEFAULT_WISH_TONE=Friendly
AUTO_SEND_WISHES=False
AUTO_SEND_QUOTES=True
```

### Step 9: Run Backend
```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate       # On macOS/Linux: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed initial friends and quotes (Arun, Priya, Rahul, Divya)
python -m database.seed_data

# Run test suite to verify everything passes
pytest tests/test_agent.py -v

# Launch FastAPI server
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at: `http://127.0.0.1:8000/api/v1/docs`.

### Step 10: Run Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### Step 11: Connect Gmail
1. In the sidebar, navigate to **Settings** (or click the warning pill in the sidebar).
2. Click **Connect Google Account**.
3. Sign in to your test user Gmail and click **Allow** on the permission screen.
4. You will be redirected back to WishMail AI with a green **Gmail Connected** badge displaying your email address.

### Step 12: Send Test Email
1. On the **Settings** page (or by clicking **Send Test Email** in the sidebar), click **Send Test Email**.
2. Enter a recipient email address.
3. Click **Send Test Email**.
4. You will see:
   `✓ Email sent successfully (Gmail Message ID: ...)`
   Check the recipient's inbox to confirm delivery!

---

## 5. End-to-End Workflow Verification

1. **Step 1 — Add Friends**: Add contacts in the **Friends & Groups** module with birthdays, anniversaries, and personal notes.
2. **Step 2 — Connect Gmail**: Authorize Gmail API through Google OAuth 2.0.
3. **Step 3 — Occasion AI Generation**: On occasion days, Gemini creates personalized drafts held safely in the **Wishes** Approval Queue.
4. **Step 4 — Add Quotes**: Enter single quotes or upload hundreds via Excel/CSV with the 3-step preview validator.
5. **Step 5 — Schedule**: Assign dates, times, and target groups.
6. **Step 6 — Automated Scheduling**: APScheduler checks the schedule daily in `Asia/Kolkata` timezone.
7. **Step 7 — Dispatch**: Approved wishes and scheduled quotes are dispatched via Gmail API.
8. **Step 8 — Audit**: Every email is logged in **Email History** with full status and Gmail message ID.

---

## 6. Docker Deployment

```bash
docker compose up -d --build
```
This orchestrates PostgreSQL and the WishMail AI backend with automatic health checks and persistent volume storage.
