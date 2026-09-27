# Encrypted messaging

New messages use the pinned Matrix Rust crypto WASM SDK 18.9.0: Olm distributes device keys and Megolm encrypts messages. This is Gitium's integration, not Signal's protocol, and makes no post-quantum claim.

## Trust and recovery

- GitHub authenticates accounts. Each device signs requests using its SDK Ed25519 identity. Nonces, timestamp windows and request limits reject replay.
- Compare fingerprints through another trusted channel before approving devices. New devices require a new review; a GitHub login alone does not establish device trust.
- Membership, consent, blocks and device changes advance the conversation epoch. Writes check current membership and epoch atomically. Every message starts a fresh Megolm sending session, so old keys do not decrypt later messages.
- Encrypted content binds sender, message ID and epoch. Persistent replay tracking rejects ciphertext reassignment. Consumed one-time keys cannot be uploaded again for an active identity.
- Browser keys use passphrase-encrypted IndexedDB, one unlocked tab per store and a five-minute inactivity lock. Passphrases never reach the server.
- Export an encrypted recovery file before losing a device. Imports recover message keys, not identity or trust. Unverified recovered attribution is hidden unless explicitly requested.
- Account-authenticated device reset revokes all of that account's devices and advances affected conversation epochs. It cannot recover old keys. Other participants must verify the new device.
- Old plaintext messages remain separately labelled and can be deleted. New plaintext sends and edits are always rejected, including when the encryption flag is disabled.

## Storage and cost

The hourly Worker job removes ciphertext older than 30 days and delivery receipts older than 90 days in bounded batches. Active consumed-key tombstones remain to prevent key reuse. History pages contain at most 50 messages. The ciphertext payload budget is 96 MiB, including a conservative per-record allowance; other tables and indexes also use D1 storage.

A local two-device first send after registration used four backend requests, 33 SQL statements and 4,277 bytes of request JSON. This excludes trigger work, setup, recipient sync, responses and transport overhead. It is not a billing or concurrency guarantee. Free provider limits still apply.

## Verification

Run `npm test`, `npm run build -- --webpack`, `npm run test:chat`, and `node tests/encryption.browser.mjs`. The browser suite uses synthetic sessions and an isolated database, two real browser contexts, verified-device messaging, recovery/reset, plaintext downgrade rejection, restart, cross-tab locking, blocking and mobile/theme checks. Supply Playwright and Chrome paths using `GITIUM_PLAYWRIGHT_PATH` and `GITIUM_CHROME_PATH` when needed. No test connects to production data.

The source review of candidate snapshot `38198f0914479a83f8d3746d77279ac2b6697372` reported no confirmed findings. Release integration, sender binding, retention and reset were subsequently covered by local review and tests. This is not an external cryptographic audit. Generated SDK internals were excluded from the application source review.

## Limits

The server can see participants, public device keys, timing and ciphertext size, and can withhold messages. Compromised browsers or malicious JavaScript from the application origin can read unlocked plaintext and keys. Revocation cannot erase material already received. Clearing browser storage without recovery can permanently lose history. Additional browsers, prolonged offline operation and large-group load need broader field testing.

Apply the additive schema and updated Worker before enabling `GITIUM_E2EE_ENABLED=enabled`. See [deployment notes](DEPLOYMENT.md). The dedicated `/encrypted-chat` page and Messages share the same client.

References: [Matrix crypto WASM](https://matrix-org.github.io/matrix-sdk-crypto-wasm/), [OlmMachine API](https://matrix-org.github.io/matrix-sdk-crypto-wasm/classes/OlmMachine.html).
