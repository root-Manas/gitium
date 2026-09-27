# Local encrypted-chat candidate

Status: implemented locally on `local/encrypted-chat`. **Not merged, pushed, deployed, or independently reviewed.** The live application still processes plaintext chat. Do not advertise live end-to-end encryption.

## What works

- Browser encryption uses the pinned Matrix Rust crypto WASM package 18.9.0 (Olm for device-key delivery; Megolm for message encryption). Gitium does not implement its own cipher.
- The GitHub session identifies the account. Each device also signs backend requests using its SDK-managed Ed25519 key. Short timestamp windows, nonce storage and per-account request limits reject captured request replays.
- Device identities are immutable. At most four active devices per account can register. Public device and one-time-key signatures are checked before storage.
- One-time keys are claimed using an atomic delete-and-return statement. Consumption tombstones prevent a retry of an old upload from resurrecting a used key.
- Key delivery queues contain encrypted Olm payloads. Recipients acknowledge only after the SDK processes them. Delivery receipts survive acknowledgements so retries do not enqueue duplicates.
- The sender explicitly reviews room members and verifies each device fingerprint through another trusted channel. A new device stops sending until verified. A new device does not inherit trust from its GitHub login.
- Database triggers advance a room version when membership, DM consent, blocks or devices change. Sends and key-delivery writes require that version and current membership within the write statement.
- The candidate rotates the Megolm sending session for every message. A removed member cannot decrypt later messages using an earlier session key.
- Encrypted contents bind the application message ID and room version. The SDK authenticates ciphertext; a persistent replay ledger also rejects reassignment of already-seen ciphertext.
- Browser keys use passphrase-encrypted IndexedDB. A Web Lock allows one unlocked tab per device store. Five minutes without input locks the UI. Unlock passphrases are never sent to the backend.
- Enabling encryption blocks new plaintext sends for that conversation. Existing plaintext history is not converted. Encrypted history is a separate stream; there is no automatic fallback to plaintext.
- Encrypted recovery-file export and import work. Imported room keys do not restore device identity. Recovered history that lacks verified sender information stays hidden unless the user explicitly chooses to show it, with unverified attribution labels.

## Files and local setup

`src/lib/encryption-service.mjs` is the account/device authorization and ciphertext-storage service. `/api/encryption` binds it to NextAuth. `public/e2ee/` contains the browser adapter and verification UI. The SDK assets are copied from the pinned npm package by `scripts/prepare-encryption.mjs`; generated vendor files are ignored by Git.

`encryption-schema.sql` is additive and separate from the live schema. It has **not** been applied to the production database. The candidate Worker permits larger bounded ciphertext payloads; that Worker change is also local only.

For isolated automated validation:

1. Run `npm ci`, then `npm test`.
2. Run `npm run build -- --webpack`.
3. Run `node tests/encryption.browser.mjs` to start an isolated Next server and in-memory SQLite bridge with synthetic sessions, exercise two real browser contexts, then close them. No production credentials or database are used. Playwright and Chrome paths can be supplied through `GITIUM_PLAYWRIGHT_PATH` and `GITIUM_CHROME_PATH`.

The local page `/encrypted-chat` and API are disabled unless `GITIUM_E2EE_ENABLED=local-candidate`. A manual local environment needs its own OAuth setup and database containing both schemas. Do not point this branch at the production database.

## Evidence from this pass

- Real browser round trip between two separately verified devices; the message and unlock passphrase were absent from captured API request bodies and stored ciphertext.
- Plaintext downgrade rejection, device-store restart, cross-tab lock, consent revocation, 320/390/1440px layouts and light/dark themes.
- Service checks for identity mismatch, request replay, unauthorized conversation access, concurrent one-time-key claims, consumed-key reupload, tampering, changed message IDs, recovery, newly added devices, revoked devices, group membership changes and post-removal decryption failure.
- Local two-device first-send measurement after initial device registration: **4 backend requests, 33 SQL statements, about 4.2 KB of request JSON**. This excludes initial registration, recipient sync, HTTP/TLS overhead, database trigger work and response bytes. It is not a D1 billing measurement or a concurrency guarantee.

## Before a release

1. Obtain an independent review of the full adapter, membership changes, key lifecycle, recovery treatment and migration strategy. Upstream library audits do not audit Gitium's integration.
2. Measure real Worker/D1 usage under multi-device groups, retries and concurrent sends. Establish retention and cleanup for delivery receipts, consumed-key records and ciphertext. The per-message rotation policy needs a documented cost/security decision before broad use.
3. Exercise prolonged offline delivery, crash points, device loss, deliberate database/server misbehavior and interleaved membership changes at scale. Test additional browsers and mobile storage eviction.
4. Finish product integration: a device-loss/reset journey, clear handling of legacy plaintext history, history pagination and migration notices. The current candidate requires manual fingerprint comparison; it is not the finished chat UX.
5. Agree on the local candidate's release and migration separately. No production encryption flag, schema or Worker change has been enabled in this pass.

## Limits

The server sees account IDs, device keys, membership, timing and ciphertext size. It can deny service or withhold messages. A compromised browser or malicious JavaScript served by the application's own origin can read unlocked keys and plaintext. Device verification must use an independent trusted channel. Revocation cannot erase messages or keys someone already received. The candidate is not Signal's current protocol and makes no post-quantum claim.

References: [Matrix crypto WASM](https://matrix-org.github.io/matrix-sdk-crypto-wasm/), [OlmMachine SDK API](https://matrix-org.github.io/matrix-sdk-crypto-wasm/classes/OlmMachine.html).
