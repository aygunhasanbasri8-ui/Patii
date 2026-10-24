English | [Türkçe](README.tr.md)

# Pati

A mobile and web app for pet owners. You register your pets, set reminders for
them, upload a cat's meow to get a guess at what it means, and ask a chatbot
whatever comes to mind.

- **backend/**: FastAPI + SQLAlchemy, PostgreSQL
- **frontend/**: Expo (React Native), the same code runs on mobile and on the web

## Features

- Registration with e-mail verification, login and password reset (JWT)
- Add, edit and delete pets, with an icon or a photo avatar
- Reminders and their history; a reminder can repeat (daily, weekly, monthly, every 3 months, yearly)
- Push notifications: on the day a reminder is due the server sends an Expo push
  notification to the owner's phones at 09:00 (Turkey time)
- Meow analysis: the audio is converted with ffmpeg into a mel spectrogram and a
  Keras model (`backend/app/ml_models/`) predicts the mood
- Gemini-based chatbot

If the model file or `GEMINI_API_KEY` is missing the app does not crash: the
analysis returns a sample result and the chatbot answers from a keyword list.
This is intentional, so it can be developed locally without any keys.

## Architecture

```
frontend (Expo)  --HTTP/JSON-->  backend (FastAPI)  -->  PostgreSQL
                                   api -> services -> repositories -> models
```

| Layer | File | Responsibility |
|-------|------|----------------|
| API | `backend/app/api.py` | Routes, request parsing, auth dependency |
| Services | `backend/app/services.py` | Business rules, ownership checks |
| Repositories | `backend/app/repositories.py` | Database access |
| Models | `backend/app/models.py` | SQLAlchemy tables |

Supporting modules: `core.py` (JWT and password hashing), `mail.py` (Brevo /
Gmail), `llm.py` (Gemini client), `ml_model.py` (meow classifier), `uploads.py`
(image validation and storage), `rate_limit.py` (login attempt limiter).

## Running

One command starts the backend, the web UI and PostgreSQL. A `.env` file is not
required; copy the example if you want to provide keys or change ports:

```bash
cp .env.example .env   # optional
docker compose up --build
```

`docker-compose.override.yml` is applied automatically: the `backend/` folder is
mounted into the container and uvicorn runs with `--reload`, so it restarts on
code changes. To run it the way production does, without the override:

```bash
docker compose -f docker-compose.yml up --build
```

If the machine already has a PostgreSQL on 5432, pass `DB_PORT=5433`.

| Service | Address |
|---------|---------|
| Backend | http://localhost:8000 (Swagger: `/docs`) |
| Web UI | http://localhost:8081 |
| PostgreSQL | localhost:5432 |

On startup the backend applies migrations with `scripts/safe_migrate.py`.

To try it on a phone:

```bash
cd frontend
npm install
EXPO_PUBLIC_BACKEND_URL=http://<your-machine-ip>:8000 npx expo start
```

## Environment variables

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Provided by Compose |
| `JWT_SECRET_KEY` | **Required in production.** If empty, a weak development key is used and a warning is logged |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Chatbot; the model defaults to `gemini-2.5-flash-lite` |
| `BREVO_API_KEY`, `MAIL_SENDER` | Mail is sent over HTTP through Brevo; takes priority over Gmail when set |
| `GMAIL_ADDRESS`, `GMAIL_APP_PASSWORD` | Sending through Gmail SMTP when Brevo is not configured |
| `ALLOWED_ORIGINS` | CORS origins, comma separated, defaults to `*` |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` | Store avatar photos in S3-compatible object storage (Cloudflare R2, AWS S3, MinIO) instead of the local disk; all four are needed once `S3_BUCKET` is set |
| `REMINDER_NOTIFICATIONS` | `0` turns the daily reminder notifications off (default on) |
| `REMINDER_NOTIFY_HOUR`, `REMINDER_TIMEZONE` | Hour the notifications go out and the timezone that defines "today" (defaults `9`, `Europe/Istanbul`) |
| `EXPO_ACCESS_TOKEN` | Optional; required only if push security is enabled for the Expo project |
| `S3_ENDPOINT_URL`, `S3_REGION`, `S3_PREFIX` | Optional: endpoint for R2/MinIO (`https://<account>.r2.cloudflarestorage.com`), region (default `auto`), key prefix (default `uploads`) |
| `EXPO_PUBLIC_BACKEND_URL` | Backend address the frontend talks to |
| `POSTGRES_PASSWORD`, `DB_PORT`, `BACKEND_PORT`, `FRONTEND_PORT` | Compose only: database password and host ports |

## Deployment

The app runs on Railway, built from the same Dockerfiles. Railway blocks
outbound SMTP, so the Gmail path does not work there: set `BREVO_API_KEY` and
`MAIL_SENDER` (a sender address verified in Brevo), otherwise verification and
reset codes never reach the user. Codes are never returned in the API response.

Uploaded photos are written to `backend/static/uploads/` by default. Compose
keeps them in a volume, but a Railway container's disk is ephemeral and the files
are lost on redeploy. Either mount a volume at that path or set the `S3_*`
variables: photos then go to the bucket and the database stores their absolute
URL (`S3_PUBLIC_BASE_URL` must serve the bucket publicly, e.g. an R2 public
bucket or custom domain). Photos uploaded before the switch keep their
`/static/uploads/...` path. A replaced photo, a photo swapped for an icon and the
photo of a deleted pet are removed from storage.

Push notifications need the device side set up once: Android builds need FCM
credentials uploaded to the EAS project (`eas credentials`), iOS builds an APNs
key. Expo Go and the web build do not receive them. The notification job runs
inside the API process and checks every 10 minutes; if several replicas run, a
conditional update makes sure each reminder is sent only once a day.

## Tests

```bash
cd backend && pytest
cd frontend && npm run lint
```

CI (`.github/workflows/ci.yml`) runs both on every push.

## Security notes

- Set `JWT_SECRET_KEY` in production. Tokens are HS256 and expire after 24 hours.
- Passwords are stored as PBKDF2-HMAC-SHA256 hashes.
- Login failures are limited to 5 per 15 minutes for each IP and e-mail pair
  (the client IP is taken from `X-Real-IP` / `X-Forwarded-For`). Counters live in
  process memory and reset on restart.
- Verification and reset codes become invalid after 5 wrong attempts; a reset
  request is processed once per minute for the same account.
- Avatar uploads accept only JPEG, PNG and WEBP up to 5 MB. The image is decoded
  and re-encoded (EXIF and location data are dropped, the longest side is capped
  at 1024 px) and stored under a server-generated name. Static files are served
  with `X-Content-Type-Options: nosniff` and a sandboxing CSP.
- Every pet, reminder and analysis endpoint checks that the pet belongs to the
  signed-in user.
- Set `ALLOWED_ORIGINS` to the real web origin in production instead of `*`.
