import * as sdk from "./vendor/index.mjs";
import { ReplayStore } from "./replay-store.mjs";

// The SDK owns every cryptographic operation.
// The transport supplies Matrix-shaped public keys and opaque device messages.
export class CryptoClient {
  constructor(machine, transport, replay) {
    this.machine = machine;
    this.transport = transport;
    this.rosters = new Map();
    this.replay = replay;
    this.queue = Promise.resolve();
  }
  static async open(id, device, transport, storeName, passphrase) {
    await sdk.initAsync();
    if (!/^\d+$/.test(id)) throw new Error("Use an immutable GitHub ID");
    if (storeName && (!passphrase || passphrase.length < 16))
      throw new Error(
        "An unlock passphrase of at least 16 characters is required",
      );
    let release;
    if (storeName && typeof navigator !== "undefined") {
      if (!navigator.locks)
        throw new Error("This browser does not support secure device locking.");
      release = await new Promise((resolve, reject) => {
        navigator.locks
          .request(
            "gitium-device:" + storeName,
            { ifAvailable: true },
            async (lock) => {
              if (!lock) {
                reject(
                  new Error(
                    "This device is open in another tab. Lock it there first.",
                  ),
                );
                return;
              }
              await new Promise((done) => resolve(done));
            },
          )
          .catch(reject);
      });
    }
    let machine;
    try {
      machine = await sdk.OlmMachine.initialize(
        new sdk.UserId(`@${id}:gitium.local`),
        new sdk.DeviceId(device),
        storeName,
        passphrase,
      );
    } catch (error) {
      release?.();
      throw error;
    }
    machine.roomKeyRequestsEnabled = false;
    machine.roomKeyForwardingEnabled = false;
    const replay = new ReplayStore(storeName);
    await replay.open();
    const client = new CryptoClient(machine, transport, replay);
    client.release = release;
    transport.attach?.(client);
    try {
      await client.flush();
      return client;
    } catch (error) {
      client.close();
      throw error;
    }
  }
  get userId() {
    return this.machine.userId.toString();
  }
  get deviceId() {
    return this.machine.deviceId.toString();
  }
  fingerprint() {
    return this.machine.identityKeys.ed25519.toBase64();
  }
  async request(request) {
    if (!request) return;
    const response = await this.transport.send(
      this.userId,
      this.deviceId,
      request,
    );
    await this.machine.markRequestAsSent(
      request.id,
      request.type,
      JSON.stringify(response),
    );
  }
  async flush() {
    for (const request of await this.machine.outgoingRequests())
      await this.request(request);
  }
  async discover(ids) {
    await this.machine.updateTrackedUsers(ids.map((id) => new sdk.UserId(id)));
    await this.request(
      await this.machine.queryKeysForUsers(ids.map((id) => new sdk.UserId(id))),
    );
    await this.flush();
  }
  async devices(id) {
    const devices = await this.machine.getUserDevices(new sdk.UserId(id));
    return devices.devices().map((device) => ({
      id: device.deviceId.toString(),
      fingerprint: device.ed25519Key?.toBase64(),
      verified: device.isVerified(),
    }));
  }
  async verify(id, deviceId, expectedFingerprint) {
    const device = await this.machine.getDevice(
      new sdk.UserId(id),
      new sdk.DeviceId(deviceId),
    );
    if (!device || device.ed25519Key?.toBase64() !== expectedFingerprint)
      throw new Error("Device fingerprint does not match");
    await device.setLocalTrust(sdk.LocalTrust.Verified);
  }
  async sync() {
    const batch = await this.transport.receive(this.userId, this.deviceId);
    await this.machine.receiveSyncChanges(
      JSON.stringify(batch.events),
      new sdk.DeviceLists(),
      new Map([["signed_curve25519", batch.keyCount]]),
    );
    await this.transport.ack(this.userId, this.deviceId, batch.ids);
    await this.flush();
  }
  // The caller must explicitly approve this membership list in its own UI.
  // Never silently turn a server-provided roster into an approved roster.
  approveRoster(room, ids) {
    if (!ids.includes(this.userId))
      throw new Error("Sender must be in the approved roster");
    this.rosters.set(room, [...new Set(ids)].sort());
  }
  encrypt(room, body, binding) {
    const operation = this.queue.then(() =>
      this.encryptLocked(room, body, binding),
    );
    this.queue = operation.catch(() => {});
    return operation;
  }
  async encryptLocked(room, body, binding) {
    const ids = this.rosters.get(room);
    if (!ids) throw new Error("Approve the room membership first");
    if (typeof body !== "string" || !body.trim() || body.length > 500)
      throw new Error("Message must be 1–500 characters");
    await this.discover(ids);
    for (const id of ids) {
      const devices = await this.devices(id);
      if (!devices.length || devices.some((device) => !device.verified))
        throw new Error("Verify every recipient device before sending");
    }
    await this.request(
      await this.machine.getMissingSessions(
        ids.map((id) => new sdk.UserId(id)),
      ),
    );
    // Fresh sender session per message favors revocation isolation over bandwidth.
    // Server quotas and a payload budget bound the cost of this policy.
    await this.machine.invalidateGroupSession(new sdk.RoomId(room));
    const settings = new sdk.EncryptionSettings();
    settings.algorithm = sdk.EncryptionAlgorithm.MegolmV1AesSha2;
    settings.historyVisibility = sdk.HistoryVisibility.Joined;
    settings.sharingStrategy = sdk.CollectStrategy.onlyTrustedDevices();
    settings.rotationPeriodMessages = 1n;
    for (const request of await this.machine.shareRoomKey(
      new sdk.RoomId(room),
      ids.map((id) => new sdk.UserId(id)),
      settings,
    ))
      await this.request(request);
    if (
      !binding ||
      typeof binding.id !== "string" ||
      !Number.isSafeInteger(binding.epoch)
    )
      throw new Error("Missing authenticated message identity");
    const content = JSON.parse(
      await this.machine.encryptRoomEvent(
        new sdk.RoomId(room),
        "m.room.message",
        JSON.stringify({
          msgtype: "m.text",
          body,
          gitium: { ...binding, sender: this.userId },
        }),
      ),
    );
    return { type: "m.room.encrypted", sender: this.userId, content };
  }
  async decrypt(room, event, recoveredHistory = false) {
    if (event.type !== "m.room.encrypted")
      throw new Error("Plaintext chat is rejected");
    const result = await this.machine.decryptRoomEvent(
      JSON.stringify(event),
      new sdk.RoomId(room),
      new sdk.DecryptionSettings(sdk.TrustRequirement.Untrusted),
    );
    const sender = result.sender.toString();
    if (event.sender !== sender) throw new Error("Sender identity was changed");
    const deviceId = result.senderDevice?.toString();
    if (!deviceId && !recoveredHistory)
      throw new Error("Unknown sender device");
    if (deviceId) {
      const device = await this.machine.getDevice(
        new sdk.UserId(sender),
        new sdk.DeviceId(deviceId),
      );
      if (
        !device?.isVerified() ||
        device.curve25519Key?.toBase64() !== result.senderCurve25519Key ||
        device.ed25519Key?.toBase64() !== result.senderClaimedEd25519Key
      )
        throw new Error("Unverified sender");
    }
    const plaintext = JSON.parse(result.event);
    if (
      plaintext.type !== "m.room.message" ||
      plaintext.content.msgtype !== "m.text" ||
      typeof plaintext.content.body !== "string"
    )
      throw new Error("Invalid encrypted message");
    if (
      plaintext.content.gitium?.id !== event.event_id ||
      plaintext.content.gitium?.sender !== sender ||
      !Number.isSafeInteger(plaintext.content.gitium?.epoch)
    )
      throw new Error("Message identity was changed");
    await this.replay.remember(room, event);
    return plaintext.content.body;
  }
  async exportRecovery(passphrase) {
    if (passphrase.length < 20)
      throw new Error(
        "Use a strong recovery passphrase of at least 20 characters",
      );
    return sdk.OlmMachine.encryptExportedRoomKeys(
      await this.machine.exportRoomKeys(() => true),
      passphrase,
      500000,
    );
  }
  static decryptRecovery(backup, passphrase) {
    return sdk.OlmMachine.decryptExportedRoomKeys(backup, passphrase);
  }
  async importRecovery(backup, passphrase) {
    if (typeof backup !== "string" || backup.length > 5000000)
      throw new Error("Invalid recovery file");
    const keys = CryptoClient.decryptRecovery(backup, passphrase);
    return this.machine.importExportedRoomKeys(keys, () => {});
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.replay.close();
    this.machine.close();
    this.release?.();
    this.release = null;
  }
}
