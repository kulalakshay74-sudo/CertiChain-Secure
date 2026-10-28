# CertiChain — Security Review and End-to-End Test Report

**Review date:** 2026-10-28  
**Scope:** Express API, browser-facing routes, local Hardhat contract workflow, certificate upload/verification, authentication, and project packaging.

## Fixes applied

1. **Public certificate data exposure (High):** Public certificate lookup returned the student email, document hashes, and other internal metadata. Added a public response projection that omits student email, password hash, file path, document hash, and blockchain hash. Public verification no longer returns the student email.
2. **Unrestricted cross-origin access (Medium):** Removed wildcard CORS middleware. The app is same-origin by default.
3. **Login brute force (Medium):** Added per-IP in-memory throttling; repeated failures return HTTP 429. Successful login clears the attempt counter.
4. **Browser hardening (Medium):** Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and `Cache-Control: no-store` on API routes.
5. **File-type spoofing (Medium):** Upload validation now checks file signatures for PDF, PNG, JPEG, and WEBP in addition to extension and declared MIME type.
6. **Upload error handling:** Invalid file contents receive a client error rather than an opaque server error. Duplicate blockchain fingerprints are reported as conflicts.
7. **Transaction nonce reliability:** Wrapped the issuer signer in ethers `NonceManager` to avoid reusing nonces during multiple blockchain writes from a running server.
8. **Generated vs uploaded document checks:** Exact-byte checks are restricted to certificates registered from an uploaded original document, avoiding a misleading check against metadata hashes for generated certificates.
9. **Local setup trap:** `.env.example` now uses the well-known Hardhat local development key instead of the invalid `0xCHANGE_ME` placeholder. It is explicitly documented as unsafe for public networks.
10. **Repeatable checks:** Added `npm run test:smoke` and documented the manual full-workflow checklist.

## End-to-end test results

Tested against a fresh local Hardhat chain and a live Express server:

- API health and blockchain connectivity
- Unauthenticated admin endpoint denial
- Admin login and certificate issuance with a mined transaction
- Public certificate PII/hash redaction
- Positive blockchain verification
- PDF download and QR image response
- Student login and own-certificate access
- Role separation (admin token denied from student-only endpoint)
- On-chain revocation and subsequent `REVOKED` verification result
- Uploaded PDF signature acceptance
- Exact original-file verification succeeds
- Tampered-file verification fails as `TAMPERED`
- Spoofed PDF rejected with HTTP 400
- Security headers and API no-store policy

**Result:** 19/19 API workflow checks passed. The repeatable smoke suite also passed 4/4 checks. JavaScript syntax checks passed for the server, frontend, and scripts.

## Remaining limitations / production recommendations

- This project stores app records in a local JSON file and uses an in-memory login throttle. Neither is suitable for multiple server instances or production durability. Use a database and shared rate limiter before public deployment.
- Use HTTPS, managed secrets, backups, structured monitoring, and an explicit origin policy if deploying behind a proxy. Configure trusted proxy handling carefully before relying on IP-based throttling.
- The frontend loads QR/OCR/PDF libraries from third-party CDNs. Pinning/self-hosting these assets and adding a Content Security Policy would improve supply-chain resilience.
- Tokens are stored in browser `localStorage`; any future XSS bug could expose them. Keep dynamic HTML escaped and consider a server-managed secure, HttpOnly session for a production deployment.
- The live browser UI was syntax-checked and the backend was exercised end-to-end over HTTP; an automated real-browser visual/accessibility run was not performed in this environment.
- `npm test` invokes Hardhat and may need internet access to download Solidity compiler 0.8.24 on a clean machine. `npm run test:smoke` is for a running local server.
