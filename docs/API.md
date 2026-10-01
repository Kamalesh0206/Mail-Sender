# WishesAI Agent - REST API Documentation

Base URL: `http://localhost:8000/api/v1`  
Interactive Swagger Docs: `http://localhost:8000/api/v1/docs`  
ReDoc Documentation: `http://localhost:8000/api/v1/redoc`

---

## 1. Dashboard & Analytics (`/stats`)

### `GET /stats/summary`
Returns high-level statistics for the dashboard cards.
- **Response `200 OK`**:
  ```json
  {
    "todays_count": 2,
    "upcoming_count": 4,
    "sent_count": 12,
    "pending_count": 2,
    "failed_count": 0,
    "total_friends": 6,
    "automation_mode": "APPROVAL",
    "gmail_connected": true,
    "gmail_email": "user@gmail.com"
  }
  ```

### `GET /stats/today`
Returns friends celebrating occasions today and their email status.
- **Response `200 OK`**:
  ```json
  [
    {
      "friend_id": 1,
      "name": "Arun Kumar",
      "email": "arun@example.com",
      "occasion_type": "Birthday",
      "relationship_type": "Colleague",
      "preferred_tone": "Friendly",
      "status": "PENDING_APPROVAL",
      "wish_id": 1,
      "subject": "Happy Birthday, Arun! 🎉",
      "sent_at": null
    }
  ]
  ```

### `GET /stats/upcoming?limit=15`
Returns list of friends with occasions in the next 30 days sorted by days remaining.

---

## 2. Friends & Contacts Management (`/friends`)

### `GET /friends`
Query parameters:
- `search`: Filter by name, email, or notes
- `occasion`: Filter by occasion type (`Birthday`, `Anniversary`, `Work Anniversary`, `Festival`, `Custom`)
- `relationship`: Filter by relationship (`Friend`, `Colleague`, `Mentor`, `Family`)
- `is_active`: Filter by boolean (`true` / `false`)

### `POST /friends`
Add a new contact.
- **Request Body**:
  ```json
  {
    "name": "Arun Kumar",
    "email": "arun@example.com",
    "birth_month": 10,
    "birth_day": 5,
    "birth_year": 1995,
    "occasion_type": "Birthday",
    "relationship_type": "Colleague",
    "personal_notes": "Loves hiking, specialty espresso, and sci-fi books.",
    "preferred_tone": "Friendly",
    "is_active": true
  }
  ```

### `GET /friends/{id}`
Retrieve a single contact by ID.

### `PUT /friends/{id}`
Update friend information.

### `DELETE /friends/{id}`
Delete a contact and cascaded wish history.

---

## 3. Wishes & Approval Workflow (`/wishes`)

### `GET /wishes/pending`
Returns all wishes currently waiting for user review in **APPROVAL MODE**.

### `POST /wishes/scan-now`
Manually triggers the daily occasion scan workflow immediately. Checks today's birthdays, runs duplicate prevention checks, calls Gemini AI to generate wishes, and either dispatches via Gmail (if AUTO MODE) or stages into the Approval Queue (if APPROVAL MODE).

### `POST /wishes/{id}/approve`
Approve and immediately dispatch an email through Gmail API.
- **Request Body** (optional inline modifications):
  ```json
  {
    "custom_subject": "Happy Birthday, Arun! Celebrating you today! 🎂",
    "custom_body": "Hi Arun,\n\nWishing you an incredible birthday! Hope you have an awesome time celebrating.\n\nBest wishes,\nKamalesh"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "wish_id": 1,
    "status": "SENT",
    "gmail_message_id": "18f9d0c2e718b5aa"
  }
  ```

### `POST /wishes/{id}/regenerate`
Regenerate AI content using Gemini with an alternative tone or prompt.
- **Request Body**:
  ```json
  {
    "tone": "Funny",
    "custom_instructions": "Include a playful joke about turning 30"
  }
  ```

### `POST /wishes/{id}/reject`
Cancel/skip a pending wish draft.

### `POST /wishes/{id}/retry`
Retry sending a previously failed wish.

### `POST /wishes/generate-preview`
Generate an on-demand wish preview for any contact without sending.

### `GET /wishes/history`
Query parameters:
- `status_filter`: `SENT`, `PENDING_APPROVAL`, `FAILED`, `CANCELLED`
- `occasion`: Filter by occasion
- `year`: e.g. `2026`
- `search`: Filter by recipient or subject
- `limit`: Default 100

---

## 4. Google OAuth 2.0 & Gmail API (`/auth/google`)

### `GET /auth/google/url`
Returns Google OAuth 2.0 authorization URL with required scopes (`gmail.send`, `userinfo.email`).

### `GET /auth/google/callback`
OAuth redirect handler. Exchanges authorization code for tokens, encrypts the refresh token using AES-128 Fernet, stores credentials in DB, and redirects user to frontend settings.

### `GET /auth/google/status`
Returns connection status, authenticated email, and token status.

### `POST /auth/google/disconnect`
Revokes/clears tokens and disconnects Gmail integration.

---

## 5. Application Settings (`/settings`)

### `GET /settings`
Returns current settings:
```json
{
  "id": 1,
  "gmail_connected": true,
  "gmail_email": "user@gmail.com",
  "automation_mode": "APPROVAL",
  "daily_send_time": "08:00",
  "default_tone": "Friendly",
  "sender_name": "Kamalesh",
  "email_signature": "Best wishes,\nKamalesh",
  "ai_model": "gemini-2.5-flash",
  "is_scheduler_running": true
}
```

### `PUT /settings`
Update settings. Updating `daily_send_time` immediately updates the APScheduler cron job.

### `POST /settings/send-test`
Send a test email via connected Gmail API to verify integration.
- **Request Body**:
  ```json
  {
    "recipient_email": "my_email@example.com",
    "subject": "Test Verification Email",
    "body": "Checking Gmail API connectivity!"
  }
  ```
