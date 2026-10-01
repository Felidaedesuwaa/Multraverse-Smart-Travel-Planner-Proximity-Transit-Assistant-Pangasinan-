# Deploy the Multraverse website

This repository contains three applications: the Expo frontend in the root,
the Express API in `server/`, and the Python model service in `ai-service/`.
The root Vercel project builds **only the website**. MongoDB stays in Atlas;
the API and model service need their own deployments.

## Vercel import form (website)

| Setting | Value |
| --- | --- |
| Git repository | `Felidaedesuwaa/Multraverse-Smart-Travel-Planner-Proximity-Transit-Assistant-Pangasinan-` |
| Production branch | `master` (the application branch) |
| Project name | `multraverse-web`, or another available name |
| Application / Framework Preset | **Other** |
| Root Directory | Repository root (`./`), not `src` or `server` |
| Install Command | `npm ci` |
| Build Command | `npm run build:web` |
| Output Directory | `dist` |
| Node.js version | `22.x` |

The committed `vercel.json` supplies the install/build/output settings and the
single-page-app rewrite. That rewrite lets `/login`, `/register`, `/settings`,
and the other React Navigation URLs load directly or survive a refresh.
Use the web-only export rather than the all-platform build for this website.

In the website's environment variables, add:

```dotenv
EXPO_PUBLIC_API_URL=https://YOUR-DEPLOYED-API-HOST
```

Replace this placeholder with the real API origin: no `/api` suffix, trailing
slash, localhost, LAN address, or credentials. Select Production; set Preview
to a separate test API if available, or the same API only if preview users should
access production data. Expo embeds this value at build time, so redeploy after
changing it. The backend's CORS list must include each frontend origin you use.

Do **not** import `server/.env` into this frontend project. Database passwords,
JWT signing secrets, and SMTP passwords belong only in the backend host's
environment settings. `EXPO_PUBLIC_*` values are visible in the browser.

Commit and push `vercel.json`, `package.json`, and this guide to `master` before
deploying from GitHub. Local edits are not included in a Git-based deployment.

## Vercel backend setup (recommended alongside the Vercel website)

Create a **second** Vercel project from the same GitHub repository and `master`
branch. Push the backend changes in this checkout before importing it.

| Setting | Value |
| --- | --- |
| Project name | `multraverse-api`, or another available name |
| Root Directory | `server` |
| Framework Preset | **Express** |
| Install Command | `npm ci --include=dev` (set by `server/vercel.json`) |
| Build Command | `npm run build` (set by `server/vercel.json`) |
| Output Directory | Leave the Express default; no override (do not enter `dist`) |
| Node.js version | `22.x` |

Vercel compiles the TypeScript Express entry point `server/src/index.ts`.
The backend exports the application, connects to MongoDB and validates the
database layout before serving requests, and retries failed initialization.
It preserves the existing requirement to provision database collections and
indexes separately; deployment does not seed or rebuild the database.
Local `npm run dev` and `npm start`
still launch a listening server. The root `vercel.json` belongs to the website;
do not copy its static-site rewrite into the backend.

Add **Production** variables to the backend project: `MONGODB_URI`, `JWT_SECRET`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`,
`NODE_ENV=production`, and `CORS_ORIGINS`. Copy secret values privately from
`server/.env`, not `.env.example`. Use a strong production JWT secret. For Gmail,
use its App Password as `SMTP_PASS`, not the ordinary account password. Use
port 465 or 587 as configured locally. Set `AI_SERVICE_URL` once the separate
model host exists. Do not add `PORT` or `EXPO_PUBLIC_API_URL` to this backend.

Use your frontend's real production origin as `CORS_ORIGINS`, with no trailing
slash. If the frontend project does not exist yet, leave this unset for the
initial backend health check, then add it and redeploy when the frontend domain
is assigned. Do not enter guessed domains or a wildcard.

In MongoDB Atlas, ensure the cluster is running, the database user can access
your application database and create indexes, and Network Access permits the
deployment. Vercel Hobby does not supply a fixed outbound IP for allowlisting.
For a demo, Atlas can accept `0.0.0.0/0` with a strong, database-scoped user;
this allows connection attempts from anywhere, so use restricted networking
where available for production. Adding your home IP alone does not cover Vercel.

Deploy the backend, then open its **production domain** in an incognito window:
`https://YOUR-ACTUAL-API-DOMAIN/api/health`. Expect `{"status":"ok"}`.
Use the stable project domain, not a protected preview deployment. If it asks
for a Vercel login, review Deployment Protection for the production API: browser
and native clients need public reachability, with private routes still protected
by the application's JWT authentication. Do not expose a bypass secret in Expo.

Set the frontend's Production `EXPO_PUBLIC_API_URL` to that API origin (no `/api`),
deploy/redeploy the frontend, and set backend `CORS_ORIGINS` to the resulting
frontend production origin. Redeploy the backend after changing its variables.
Test signup, email verification, login, and a saved trip from the website.
`/api/health` checks database readiness, not SMTP or the Python service.

Vercel permits SMTP on 465/587, but actual delivery must be tested from the
deployed app. Vercel Functions cap request/response bodies at 4.5 MB; the app's
12 MB audio parser does not override this. Large voice uploads need adjustment
before that feature is production-ready. The Python model service remains
separate. Hobby is for personal, non-commercial use within its usage limits.

Local checks (from repository root):

```powershell
npm.cmd run build --prefix server
node server/scripts/check-vercel.cjs
```

## Alternative: conventional Node web-service host

For a conventional Node web-service host, deploy the same `master` branch with:

| Setting | Value |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Node.js version | `22.x` |

Configure the following on that host, using the actual credentials from your
local `server/.env` without committing them:

- `MONGODB_URI`: Atlas URI. Allow the backend host's outbound IP addresses in
  Atlas Network Access. The deployment account needs access to the database
  and indexes; verification/deletion require a replica set, as provided by Atlas.
- `JWT_SECRET`: a strong random production signing secret, kept stable across
  restarts. Changing it invalidates existing tokens.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: valid SMTP
  sender settings. Verify that the host permits outbound SMTP on 465 or 587;
  some free hosting plans block it. Local SMTP success does not test cloud access.
- `CORS_ORIGINS`: the exact website origin, such as
  `https://multraverse-web.vercel.app`, with no trailing slash. Add other allowed
  origins separated by commas. Replace the example with the domain Vercel assigns.
- `AI_SERVICE_URL`: the model service URL reachable from the backend, when deployed.
- `NODE_ENV=production`.

Use the port supplied by the host; the API already reads `PORT`. Do not use
`npm run dev` or Expo as a production API start command. Check that
`https://YOUR-DEPLOYED-API-HOST/api/health` returns `{"status":"ok"}` before
setting the frontend API URL. Vercel client-IP handling is configured in the app;
for other proxy hosts, configure it for that host before opening public
registration, because authentication rate limits use `req.ip`.

Vercel also supports Express as a separate backend project, but the root Expo
deployment does not deploy `server/` automatically. Review its function limits
before choosing it: this app accepts up to 12 MB audio JSON and waits up to
120 seconds for model responses, which must fit the selected host's limits.

## AI service prerequisite

`ai-service/main.py` uses PyTorch, TinyLlama/LoRA model files, Whisper, and a local
speech engine. It needs a separate Python/container host with sufficient RAM,
the model artifacts and system speech dependencies. The frontend's Vercel export
does not include or run these models. Do not use `http://localhost:8000` for
`AI_SERVICE_URL` unless the model service really shares the API host's network.
Keep the model service private to the backend, or add authentication before
exposing its currently unauthenticated routes publicly.

The Express database-driven itinerary planner and phrasebook can operate without
the model service; model-generated text, speech/transcription, and model-backed
translation require that service to be reachable.

## Verify after deployment

1. Open the website and refresh `/login` directly; both should load.
2. Check browser Network requests use the deployed HTTPS API, not localhost.
3. Test signup with your own mailbox, code verification, login, and saving a trip.
4. Check the API logs for CORS, Atlas access, or SMTP errors if these fail.
5. Test AI functions after deploying the Python service and setting `AI_SERVICE_URL`.

References: [Expo website deployment](https://docs.expo.dev/guides/publishing-websites/#vercel),
[Express on Vercel](https://vercel.com/docs/frameworks/backend/express),
[Vercel function limits](https://vercel.com/docs/functions/limitations).
