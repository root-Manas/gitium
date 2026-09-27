import { RequestType } from "./vendor/index.mjs";
export class HttpTransport {
  constructor() {
    this.context = null;
  }
  attach(client) {
    this.client = client;
  }
  async call(action, payload = {}) {
    const device = this.client.deviceId;
    const user = this.client.userId.slice(1, -13);
    const time = Date.now();
    const nonce = crypto.randomUUID();
    const signatures = await this.client.machine.sign(
      JSON.stringify([user, device, action, payload, time, nonce]),
    );
    const signature = JSON.parse(signatures.asJSON())[this.client.userId][
      "ed25519:" + device
    ];
    const response = await fetch("/api/encryption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        action,
        device,
        payload,
        proof: { time, nonce, signature },
      }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Encrypted chat is unavailable.");
    return data;
  }
  async send(user, device, request) {
    if (user !== this.client.userId || device !== this.client.deviceId)
      throw new Error("Device mismatch");
    const body = JSON.parse(request.body);
    if (request.type === RequestType.KeysUpload)
      return this.call("upload", body);
    if (
      request.type === RequestType.KeysQuery &&
      Object.keys(body.device_keys).every((id) => id === this.client.userId)
    )
      return this.call("own-keys");
    if (!this.context)
      throw new Error("Review an encrypted conversation first.");
    const payload = { ...this.context, body };
    if (request.type === RequestType.KeysQuery)
      return this.call("query", payload);
    if (request.type === RequestType.KeysClaim)
      return this.call("claim", payload);
    if (request.type === RequestType.ToDevice)
      return this.call("deliver", {
        ...payload,
        type: request.event_type,
        txn: request.txn_id || request.id,
      });
    throw new Error("Unsupported encryption request.");
  }
  async receive() {
    return this.call("receive");
  }
  async ack(user, device, ids) {
    if (ids.length) await this.call("ack", { ids });
  }
}
