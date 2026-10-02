# Security controls and verification

This describes the October 2026 account-security update. It reduces specific
risks; it is not a penetration-test certification or a guarantee against every
attack. Do not disclose passwords, reset codes, JWTs or environment files in
issues, screenshots or logs.

## Account access

- Password changes require the current password. Forgotten passwords require a
  cryptographically generated six-digit email code and a random challenge ID.
- Reset codes expire after ten minutes, allow at most five verification attempts,
  and are stored only as keyed hashes. Resending replaces the previous challenge.
- Reset requests use the same accepted response for registered and unregistered
  email addresses. A minimum response delay and bounded SMTP delivery reduce
  timing differences; this does not guarantee identical timing under every load.
- Password updates, code consumption and audit records share a MongoDB
  transaction. Concurrent redemption can succeed only once. An audit-write
  failure rolls the password update back.
- JWTs use HS256 with a credential fingerprint derived from the current salted
  password hash. Every private request checks the current database account and
  role. Password changes, deletion and role changes cannot be bypassed using an
  older signed token. Legacy tokens from before this update require a new login.
- The existing registration policy is also enforced for new passwords: 8–72
  characters, at least one uppercase letter and one number; only ASCII letters,
  digits, underscore, hyphen and `@`. Changed/reset passwords are hashed with
  bcrypt, cost 12; existing registration hashes retain their current cost.
- Native tokens use the platform's SecureStore. Web tokens still use browser
  storage; preventing script injection remains necessary to protect them.

## Threats and defenses

| Threat | Controls in the application | Boundary |
| --- | --- | --- |
| Spoofing | Signed tokens, live account checks, current-password confirmation, email OTP, revoked old credentials | Mailbox and signing-secret security remain deployment responsibilities |
| Tampering / injection | Typed field allowlists, forbidden MongoDB operators/prototype keys, strict schemas, validated IDs and values, ownership filters | The database is MongoDB; SQL text is never executed, and MongoDB query injection is rejected separately |
| Repudiation | Transactional password audit events, existing administrative audit history, request IDs and rejection logs | Export and retain logs with restricted access; database logs are not immutable evidence |
| Information disclosure | Generic authentication errors, hidden hashes, redacted mail/upstream errors, no-store API responses, security headers | Browser storage, host configuration and backups still need protection |
| Denial of service | Shared atomic limits, request-size bounds, bounded lists and AI requests | Application limits do not replace host-level DDoS protection or prevent distributed attacks |
| Elevation of privilege | Roles and municipality scope loaded from the database, owner-scoped queries, rejected role/owner mass assignment | Compromised database credentials remain outside these application checks |

Personal names reject digits and markup while allowing Unicode letters, initials,
spaces, apostrophes and hyphens. Trip/place names can contain legitimate numbers
but must also contain letters. Manual trip fields validate actual calendar dates,
bounded text and finite PHP budgets. The client highlights invalid fields; the
server independently rejects invalid or additional fields.

## Request limits

Limits use fixed time buckets in MongoDB, shared across processes and restarts.
Keys are HMAC hashes rather than raw email/IP values. Denials return HTTP 429
and `Retry-After`; unavailable limit storage fails closed. The existing
registration limits continue to apply alongside these limits.

| Scope | Limit |
| --- | --- |
| API requests per IP (except GET health) | 300/minute |
| Authentication requests per IP | 60/15 minutes |
| Login per IP / normalized email | 30 / 15 per 15 minutes |
| Password reset requests per IP | 10/hour |
| Reset requests per normalized email | 5/hour and 1/minute |
| Reset verification per IP | 20/10 minutes |
| Password changes per user / IP | 5 / 20 per 15 minutes |
| Authenticated AI POST requests per user | 10/minute |

Limits can affect users behind a shared NAT. Tune from observed traffic; do not
disable them to resolve a proxy configuration problem. Vercel's immediate proxy
is trusted only when `VERCEL` is set. Other reverse-proxy hosts need an explicit,
appropriate trust configuration before public use. CORS is an origin policy,
not authentication. Keep the Python AI service private to the API until its own
authentication and limits are configured.

## Verification and remaining work

`server/scripts/check-password-security.cjs` covers OTP expiry/attempts/reuse,
concurrent redemption, rollback on audit failure, password/session revocation,
injection, ownership, request limits, and client/server trip-validation parity.
It uses an isolated database and mocks SMTP. Registration/deletion and LGU/admin
regressions use the existing integration scripts. Deployment startup checks mock
MongoDB rather than testing cloud credentials. A successful build does not verify
live email delivery, CORS variables or the deployed model service.

Compatible dependency patches were applied without changing Expo SDK 54. The
server audit reported zero known vulnerabilities at review. The frontend audit
still reports 13 findings (8 moderate, 5 high) in inherited build dependencies:
`image-size` 1.x via Metro, the `uuid`/`xcode` dependency chain and `node-forge`
through Expo's certificate tooling. Counts include affected parent packages.
These are not resolved by the current patch. Use only trusted build assets and
signing certificates; plan and test an Expo toolchain upgrade rather than forcing
incompatible transitive major versions or the downgrade suggested by the audit.
Recheck advisories with `npm audit` and `npm audit --prefix server` as they change.

The frontend CSP restricts objects, base URLs and framing, but is not a strict
script policy. Further work includes a tested strict CSP, a browser-session
architecture that avoids JavaScript-readable tokens, host-level abuse controls,
central log retention, and independent security testing before broader release.
