# Security rubric review — October 15, 2026

The rubric is implemented in application controls below. Points are the evaluator's weights, not a self-awarded score. Automated checks use mocked persistence unless explicitly run against a separate test database. They do not certify a deployed installation.

| Criterion | Points | Controls and review evidence |
| --- | ---: | --- |
| Input validation | 15 | Server field allowlists, rejected MongoDB operators and prototype keys, bounded requests and pagination, finite values, calendar dates, validated IDs and independent client validation. `server/src/middleware/input.ts`; `server/src/lib/tripValidation.ts`. |
| Authentication & MFA | 15 | bcrypt password verification, signup email verification, expiring recovery codes, attempt limits. ADMIN, SUPERADMIN and LGU require a six-digit time-based authenticator code; no session is issued before verification. First successful password login offers enrollment, confirmed by a real code. Password recovery retains the factor. `server/src/lib/mfa.ts`; `src/pages/LoginPage.jsx`. |
| Authorization & access control | 15 | Account and role loaded from MongoDB on private requests; role guards, owner filters and LGU municipality scope. Promotion into a privileged role requires a fresh MFA session. MFA challenge tokens cannot call private APIs. The Python service requires a separate shared service secret. |
| Error handling | 15 | Generic unexpected API/database/SMTP/upstream failures; no credential or code logging; safe JSON-response handling and corrupt cached-profile recovery. LGU persistence errors no longer echo internal exception messages. Python validation errors no longer echo submitted data. |
| Data protection | 15 | Salted bcrypt hashes hidden from API output; OTP HMAC hashes; native SecureStore tokens. Authenticator secrets use AES-256-GCM, with a separate encryption key and authenticated user binding. Revocation stores SHA-256 token digests. The compatible `proxy-addr` security patch addresses the detected critical advisory. |
| Privacy controls | 15 | Signup displays purpose, public sharing, optional permissions, deletion and retention boundaries. The server requires affirmative acknowledgment and stores its version/time separately; successful verification binds it to the new user in the registration transaction. Settings repeats privacy controls. Device permission prompts gate location, photos and microphone; stopping transit tracking withdraws monitoring. Self/admin deletion clears factors, acknowledgments and geofence monitoring alongside private travel records. Device deletion also clears cached plans and arrival notices. |
| Session & account security | 10 | Signed HS256 sessions with expiry and live credential fingerprints; password change/reset and deletion invalidate old credentials. Privileged sessions expire after one hour. Online logout records revocation before clearing device credentials; private requests reject revoked tokens. Tracking stops on logout. Logout requests time out after five seconds and local cleanup still runs offline. |
| **Total available** | **100** | Evaluation must include the deployment and manual demonstrations below. |

## Changes made for this review

- Mandatory TOTP MFA for privileged roles, including setup and verification screens, expiring password-bound challenges, encrypted secrets and atomic code replay rejection. No new authentication dependency was added.
- Server logout revocation, shorter privileged sessions and a guard against MFA bypass after account promotion or password recovery.
- Privacy notice, required server validation, transactional acknowledgment storage and additional deletion cleanup.
- Private AI-service authentication, loopback default binding, request-size limits and redacted validation errors; all three API-to-AI request paths send the service token.
- Safe client response parsing, cached-profile handling and bounded logout; redacted LGU and translation errors.
- Patched the server's `proxy-addr` dependency from 2.0.7 to 2.0.8.
- Patched frontend `shell-quote` to 1.12.0 and applied compatible toolchain patches, keeping Expo 57 and React Native 0.86.

## Setup and deployment

Local ignored environment files have been configured without printing or replacing existing secrets. Restart both services to load them. To provision another checkout, run `node server/scripts/configure-security-secrets.cjs`.

Deployment needs `MFA_ENCRYPTION_KEY` (64 hex characters) in the API environment and the same `AI_SERVICE_TOKEN` (at least 32 random characters) in the API and Python environments. These are server secrets: never use `EXPO_PUBLIC_*`. Preserve the MFA encryption key across restarts and securely back it up; replacing it makes enrolled authenticators unreadable. Startup creates only the additional account-security collections and their indexes. Its database account needs those permissions.

The Python service fails closed when its shared secret is absent. Its health endpoint remains available. Keep it private; use TLS/private networking if the services run on separate hosts. Public web/API hosts also require HTTPS, database access restrictions, appropriate CORS origins and protected backups.

Enrollment is a security-sensitive first-login operation: provision privileged accounts with private, strong passwords, enroll from a trusted device, and retain the authenticator's backup. There is no email-only factor reset or public recovery bypass. Authenticator replacement/loss needs an independently verified administrative recovery process; the application deliberately does not expose a factor-deletion endpoint.

## Automated verification

Run from the repository root using `npm.cmd` on PowerShell installations that block `npm.ps1`:

```text
npm run test:rubric --prefix server
npm run test:self-delete --prefix server
npm run test:recovery --prefix server
npm run test:startup --prefix server
node scripts/check-notifications-recovery.cjs
node scripts/check-preferences.cjs
node scripts/check-account-security-ui.cjs
node scripts/check-mobile-startup.cjs
npm run build:web
cd ai-service
python -m unittest test_service_security.py
python -m py_compile main.py service_security.py
```

The rubric suite runs actual HTTP handlers, JWT, bcrypt and crypto with in-memory storage. It checks RFC 6238 SHA-1 vectors, encryption tampering/user binding, missing encryption configuration, mandatory MFA for all three privileged roles, challenge rejection by private APIs, enrollment retries, concurrent code redemption/reuse, expiry, logout revocation, password-bound challenges, missing/invalid privacy consent and injection rejection. Python tests check service-secret enforcement, fail-closed configuration, health access, response headers and declared/streamed body limits.

Existing MongoDB suites remain available: `test:security`, `test:auth`, `test:lgu` and `test:superadmin`. Fixtures were updated for consent and mandatory MFA. Use a dedicated replica-set test database; the scripts generate isolated database names. No dedicated `AUTH_TEST_MONGODB_URI` was configured during this review, so MongoDB transaction/index/rate-limit integration checks and real email delivery were not rerun. Actual API/AI deployment behavior and native-device permissions still require manual testing.

The server default `npm test` now runs the five offline security/recovery/deletion/startup suites after a build. All passed in this review. The MFA UI/store test, mobile-startup test, notification/preference regressions, Python security tests and Python syntax checks also passed. The web export passed after restoring the existing locked dependencies and again after the compatible dependency patches. No existing application accounts or database records were changed by these tests.

Dependency audit after the patches: server production dependencies have zero reported vulnerabilities. Server development tooling retains 3 high findings through nodemon/chokidar/braces. Frontend tooling retains 23 findings (8 moderate, 15 high), including affected parent packages, through braces/micromatch, node-forge and uuid/xcode. No critical findings remain in those npm reports. npm's forced remediation proposes incompatible downgrades; those were not applied. Treat the build toolchain as a remaining dependency risk, use trusted build inputs/certificates, and reassess compatible upstream fixes before release. These findings are separate from passing application-control tests and are not resolved by MFA or privacy controls.

## Demonstration checklist

1. Submit invalid names, nonexistent calendar dates, negative budgets, additional role/owner fields and MongoDB operator objects; expect rejection without data changes.
2. Sign in as each privileged role: show enrollment/verification and prove no dashboard access before the code. Attempt code reuse and a wrong/expired code. Explorers continue their password login.
3. Attempt another user's private trip and a different municipality's LGU resource; expect denial. Demonstrate each role's permitted functions.
4. Simulate database/AI/mail unavailability and malformed JSON; show safe errors without internal details or a UI crash.
5. Inspect API responses to confirm password hashes, OTP hashes and factor ciphertext are absent. Confirm deployed HTTPS and database/backup permissions separately.
6. Try signup without acknowledgment, show the privacy notice, decline optional device permissions, stop transit monitoring, and delete a test account.
7. Save a bearer token, log out online, then replay it: expect HTTP 401. Change/reset a test password and repeat with the older token.

## Remaining boundaries

Browser tokens remain JavaScript-readable; strict CSP and HttpOnly browser sessions are not implemented by this change. Offline logout clears this device, but cannot revoke a previously copied token until a server request succeeds or the token expires. MongoDB integration, deployment headers/secrets, email delivery and authenticator/device UX must be checked before assigning a final rubric score. Security/moderation log retention and independent recovery verification require an operator policy; acknowledgment is not a legal compliance certification.

References: [OWASP MFA guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238), and [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
