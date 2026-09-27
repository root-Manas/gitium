import { createPublicKey, randomUUID, verify } from "node:crypto";

export class CryptoError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}
const requireValue = (
  condition,
  message = "Encrypted chat request rejected.",
  status = 403,
) => {
  if (!condition) throw new CryptoError(message, status);
};
const matrixId = (id) => `@${id}:gitium.local`;
const githubId = (id) =>
  /^@\d{1,20}:gitium\.local$/.test(id) ? id.slice(1, -13) : null;
const canonical = (value) =>
  value === null || typeof value !== "object"
    ? JSON.stringify(value)
    : Array.isArray(value)
      ? `[${value.map(canonical).join(",")}]`
      : `{${Object.keys(value)
          .sort()
          .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
          .join(",")}}`;
function validSignature(ed, message, signature) {
  try {
    const raw = Buffer.from(ed, "base64");
    if (raw.length !== 32) return false;
    return verify(
      null,
      Buffer.from(message),
      createPublicKey({
        key: Buffer.concat([
          Buffer.from("302a300506032b6570032100", "hex"),
          raw,
        ]),
        format: "der",
        type: "spki",
      }),
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}
const permitted =
  "EXISTS(SELECT 1 FROM e2ee_members WHERE room_id=?1 AND user_id=?2) AND EXISTS(SELECT 1 FROM e2ee_rooms WHERE id=?1 AND epoch=?3)";

// Identity comes exclusively from the authenticated NextAuth session.
// SQL adapters must execute each statement atomically and return RETURNING rows.
export class EncryptionService {
  constructor(run) {
    this.run = run;
  }
  async rows(sql, params = []) {
    return (await this.run(sql, params)).results;
  }
  async handle(user, input) {
    requireValue(/^\d{1,20}$/.test(user));
    const { action, device, payload = {}, proof } = input;
    requireValue(/^[A-Z0-9_-]{8,64}$/.test(device), "Invalid device.", 400);
    if (action === "upload") return this.upload(user, device, payload, proof);
    await this.authenticate(user, device, action, payload, proof);
    if (action === "devices")
      return {
        devices: await this.rows(
          "SELECT device_id,ed,revoked FROM e2ee_devices WHERE user_id=?",
          [user],
        ),
      };
    if (action === "own-keys") {
      const devices = await this.rows(
        "SELECT device_id,keys_json FROM e2ee_devices WHERE user_id=? AND revoked=0",
        [user],
      );
      return {
        device_keys: {
          [matrixId(user)]: Object.fromEntries(
            devices.map((item) => [item.device_id, JSON.parse(item.keys_json)]),
          ),
        },
        failures: {},
      };
    }
    if (action === "revoke") {
      requireValue(/^[A-Z0-9_-]{8,64}$/.test(payload.device));
      await this.run(
        "UPDATE e2ee_devices SET revoked=1 WHERE user_id=? AND device_id=?",
        [user, payload.device],
      );
      return {};
    }
    if (action === "receive") {
      const rows = await this.rows(
        "SELECT id,payload FROM e2ee_mail WHERE user_id=? AND device_id=? ORDER BY created_at,id LIMIT 100",
        [user, device],
      );
      const count = await this.rows(
        "SELECT COUNT(*) AS n FROM e2ee_otks WHERE user_id=? AND device_id=?",
        [user, device],
      );
      return {
        ids: rows.map((row) => row.id),
        events: rows.map((row) => JSON.parse(row.payload)),
        keyCount: count[0].n,
      };
    }
    if (action === "ack") {
      requireValue(
        Array.isArray(payload.ids) &&
          payload.ids.length <= 100 &&
          payload.ids.every((id) => typeof id === "string" && id.length < 60),
        "Invalid acknowledgements.",
        400,
      );
      await this.run(
        "DELETE FROM e2ee_mail WHERE user_id=? AND device_id=? AND id IN (SELECT value FROM json_each(?))",
        [user, device, JSON.stringify(payload.ids)],
      );
      return {};
    }
    if (action === "open") return this.open(user, payload);
    const room = payload.room;
    const epoch = payload.epoch;
    requireValue(
      typeof room === "string" &&
        room.length < 100 &&
        Number.isSafeInteger(epoch),
      "Missing room version.",
      400,
    );
    const state = await this.snapshot(user, room);
    requireValue(
      state.epoch === epoch,
      "Membership or devices changed. Review the room again.",
      409,
    );
    const ids = new Set(state.members.map((item) => matrixId(item.user_id)));
    if (action === "query") {
      requireValue(
        payload.body?.device_keys &&
          Object.keys(payload.body.device_keys).every((id) => ids.has(id)),
      );
      const device_keys = {};
      for (const id of Object.keys(payload.body.device_keys)) {
        device_keys[id] = {};
        for (const item of state.devices.filter(
          (item) => matrixId(item.user_id) === id,
        ))
          device_keys[id][item.device_id] = JSON.parse(item.keys_json);
      }
      return { device_keys, failures: {} };
    }
    if (action === "claim") {
      const one_time_keys = {};
      const claims = payload.body?.one_time_keys;
      requireValue(claims && Object.keys(claims).length <= 25);
      for (const [id, devices] of Object.entries(claims)) {
        requireValue(ids.has(id) && Object.keys(devices).length <= 4);
        one_time_keys[id] = {};
        for (const target of Object.keys(devices)) {
          requireValue(
            state.devices.some(
              (item) =>
                matrixId(item.user_id) === id && item.device_id === target,
            ),
          );
          const rows = await this.rows(
            `DELETE FROM e2ee_otks WHERE rowid=(SELECT rowid FROM e2ee_otks WHERE user_id=?4 AND device_id=?5 LIMIT 1) AND ${permitted} AND EXISTS(SELECT 1 FROM e2ee_devices WHERE user_id=?4 AND device_id=?5 AND revoked=0) RETURNING key_id,key_json`,
            [room, user, epoch, githubId(id), target],
          );
          one_time_keys[id][target] = rows.length
            ? { [rows[0].key_id]: JSON.parse(rows[0].key_json) }
            : {};
        }
      }
      return { one_time_keys, failures: {} };
    }
    if (action === "deliver") {
      requireValue(
        payload.type === "m.room.encrypted" &&
          typeof payload.txn === "string" &&
          payload.txn.length <= 100,
      );
      const entries = [];
      for (const [id, devices] of Object.entries(
        payload.body?.messages || {},
      )) {
        requireValue(ids.has(id));
        for (const [target, content] of Object.entries(devices)) {
          requireValue(
            state.devices.some(
              (item) =>
                matrixId(item.user_id) === id && item.device_id === target,
            ),
          );
          requireValue(
            content.algorithm === "m.olm.v1.curve25519-aes-sha2" &&
              typeof content.ciphertext === "object" &&
              JSON.stringify(content).length < 12000,
          );
          entries.push({
            id: randomUUID(),
            user: githubId(id),
            device: target,
            event: JSON.stringify({
              sender: matrixId(user),
              type: payload.type,
              content,
            }),
          });
        }
      }
      requireValue(
        entries.length > 0 && entries.length <= 100,
        "Invalid device delivery.",
        400,
      );
      await this.run(
        `INSERT OR IGNORE INTO e2ee_mail(id,user_id,device_id,sender_id,sender_device,txn,payload,created_at) SELECT json_extract(value,'$.id'),json_extract(value,'$.user'),json_extract(value,'$.device'),?2,?4,?5,json_extract(value,'$.event'),?6 FROM json_each(?7) WHERE ${permitted} AND (SELECT COUNT(*) FROM e2ee_mail WHERE user_id=json_extract(value,'$.user') AND device_id=json_extract(value,'$.device'))<1000 AND NOT EXISTS(SELECT 1 FROM e2ee_delivery_receipts WHERE sender_id=?2 AND sender_device=?4 AND txn=?5 AND user_id=json_extract(value,'$.user') AND device_id=json_extract(value,'$.device'))`,
        [
          room,
          user,
          epoch,
          device,
          payload.txn,
          Date.now(),
          JSON.stringify(entries),
        ],
      );
      const stored = await this.rows(
        "SELECT COUNT(*) AS n FROM e2ee_delivery_receipts WHERE sender_id=? AND sender_device=? AND txn=?",
        [user, device, payload.txn],
      );
      requireValue(
        stored[0].n === entries.length,
        "Delivery incomplete or inbox full. No message was sent.",
        409,
      );
      return {};
    }
    if (action === "send") {
      const event = payload.event;
      requireValue(
        event?.type === "m.room.encrypted" &&
          event.sender === matrixId(user) &&
          event.content?.algorithm === "m.megolm.v1.aes-sha2" &&
          typeof event.content.ciphertext === "string" &&
          JSON.stringify(event).length < 16000,
        "Only encrypted messages are accepted.",
        400,
      );
      const senderDevice = state.devices.find(
        (item) => item.user_id === user && item.device_id === device,
      );
      requireValue(
        senderDevice &&
          event.content.device_id === device &&
          event.content.sender_key === senderDevice.curve,
        "Sender device mismatch.",
      );
      requireValue(
        typeof payload.txn === "string" && /^[a-z\d-]{36}$/i.test(payload.txn),
      );
      const id = "$" + payload.txn;
      const time = Date.now();
      const result = await this.run(
        `INSERT OR IGNORE INTO e2ee_events(id,room_id,epoch,sender_id,device_id,txn,payload,created_at) SELECT ?4,?1,?3,?2,?5,?6,?7,?8 WHERE ${permitted} AND EXISTS(SELECT 1 FROM e2ee_devices WHERE user_id=?2 AND device_id=?5 AND revoked=0) AND (SELECT COUNT(*) FROM e2ee_events WHERE sender_id=?2 AND created_at>?9)<10`,
        [
          room,
          user,
          epoch,
          id,
          device,
          payload.txn,
          JSON.stringify(event),
          time,
          time - 60000,
        ],
      );
      const stored = await this.rows(
        "SELECT id,created_at FROM e2ee_events WHERE sender_id=? AND device_id=? AND txn=? AND room_id=?",
        [user, device, payload.txn, room],
      );
      requireValue(
        result.changes || stored.length,
        "Message not sent. Check membership or wait a minute.",
        409,
      );
      return stored[0];
    }
    if (action === "messages") {
      const rows = await this.rows(
        `SELECT id,payload,created_at FROM e2ee_events WHERE room_id=?1 AND ${permitted} ORDER BY created_at DESC,id DESC LIMIT 100`,
        [room, user, epoch],
      );
      return {
        events: rows
          .reverse()
          .map((row) => ({
            ...JSON.parse(row.payload),
            event_id: row.id,
            origin_server_ts: row.created_at,
          })),
      };
    }
    throw new CryptoError("Unknown encryption action.", 400);
  }
  async authenticate(user, device, action, payload, proof, initialEd) {
    const rows = await this.rows(
      "SELECT ed,revoked FROM e2ee_devices WHERE user_id=? AND device_id=?",
      [user, device],
    );
    requireValue(
      (initialEd || rows.length) && !rows[0]?.revoked,
      "This device is unavailable.",
    );
    const ed = rows[0]?.ed || initialEd;
    requireValue(
      proof &&
        Number.isSafeInteger(proof.time) &&
        Math.abs(Date.now() - proof.time) < 120000 &&
        /^[a-f\d-]{36}$/.test(proof.nonce),
      "Invalid device proof.",
    );
    requireValue(
      validSignature(
        ed,
        JSON.stringify([
          user,
          device,
          action,
          payload,
          proof.time,
          proof.nonce,
        ]),
        proof.signature,
      ),
      "Invalid device signature.",
    );
    await this.run("DELETE FROM e2ee_nonces WHERE created_at<?", [
      Date.now() - 240000,
    ]);
    const result = await this.run(
      "INSERT OR IGNORE INTO e2ee_nonces(user_id,device_id,nonce,created_at) SELECT ?1,?2,?3,?4 WHERE (SELECT COUNT(*) FROM e2ee_nonces WHERE user_id=?1 AND created_at>?5)<240",
      [user, device, proof.nonce, Date.now(), Date.now() - 60000],
    );
    requireValue(result.changes, "Repeated request or device rate limit.", 429);
  }
  async upload(user, device, payload, proof) {
    const keys = payload.device_keys;
    const id = matrixId(user);
    const old = await this.rows(
      "SELECT keys_json,ed,revoked FROM e2ee_devices WHERE user_id=? AND device_id=?",
      [user, device],
    );
    if (keys) {
      requireValue(
        keys.user_id === id &&
          keys.device_id === device &&
          keys.keys &&
          JSON.stringify(keys).length < 5000,
        "Invalid device keys.",
        400,
      );
      const signed = { ...keys };
      delete signed.signatures;
      delete signed.unsigned;
      requireValue(
        validSignature(
          keys.keys["ed25519:" + device],
          canonical(signed),
          keys.signatures?.[id]?.["ed25519:" + device],
        ),
        "Invalid device key signature.",
      );
      requireValue(
        !old.length ||
          (old[0].ed === keys.keys["ed25519:" + device] && !old[0].revoked),
        "Device identities cannot be replaced.",
      );
    }
    await this.authenticate(
      user,
      device,
      "upload",
      payload,
      proof,
      keys?.keys?.["ed25519:" + device],
    );
    if (keys && !old.length) {
      const added = await this.run(
        "INSERT OR IGNORE INTO e2ee_devices(user_id,device_id,keys_json,ed,curve) SELECT ?1,?2,?3,?4,?5 WHERE (SELECT COUNT(*) FROM e2ee_devices WHERE user_id=?1 AND revoked=0)<4",
        [
          user,
          device,
          JSON.stringify(keys),
          keys.keys["ed25519:" + device],
          keys.keys["curve25519:" + device],
        ],
      );
      requireValue(
        added.changes,
        "You can have up to four active devices.",
        409,
      );
    }
    const entries = Object.entries(payload.one_time_keys || {});
    requireValue(entries.length <= 100, "Too many one-time keys.", 400);
    for (const [key, value] of entries) {
      requireValue(
        /^signed_curve25519:[\w+/=-]+$/.test(key) &&
          JSON.stringify(value).length < 1000,
        "Invalid one-time key.",
        400,
      );
      const signed = { ...value };
      delete signed.signatures;
      delete signed.unsigned;
      requireValue(
        validSignature(
          old[0]?.ed || keys.keys["ed25519:" + device],
          canonical(signed),
          value.signatures?.[id]?.["ed25519:" + device],
        ),
        "Invalid one-time key signature.",
      );
    }
    if (entries.length)
      await this.run(
        "INSERT OR IGNORE INTO e2ee_otks(user_id,device_id,key_id,key_json) SELECT ?1,?2,key,value FROM json_each(?3) WHERE (SELECT COUNT(*) FROM e2ee_otks WHERE user_id=?1 AND device_id=?2)<100 AND NOT EXISTS(SELECT 1 FROM e2ee_used_keys WHERE user_id=?1 AND device_id=?2 AND key_id=key)",
        [user, device, JSON.stringify(payload.one_time_keys)],
      );
    const count = await this.rows(
      "SELECT COUNT(*) AS n FROM e2ee_otks WHERE user_id=? AND device_id=?",
      [user, device],
    );
    return { one_time_key_counts: { signed_curve25519: count[0].n } };
  }
  async open(user, payload) {
    requireValue(
      ["room", "dm_v2"].includes(payload.scope) &&
        typeof payload.target === "string" &&
        payload.target.length <= 100,
      "Invalid conversation.",
      400,
    );
    const allowed =
      payload.scope === "room"
        ? await this.rows(
            "SELECT 1 FROM rooms r JOIN room_members m ON r.id=m.room_id WHERE r.id=? AND m.user_id=?",
            [payload.target, user],
          )
        : await this.rows(
            "SELECT 1 FROM dm_requests d JOIN dm_allowed a ON a.pair=d.pair WHERE d.pair=? AND (d.requester_id=? OR d.recipient_id=?)",
            [payload.target, user, user],
          );
    requireValue(
      allowed.length,
      "Accept the chat request or join the room first.",
    );
    const exists = await this.rows(
      "SELECT id FROM e2ee_rooms WHERE scope=? AND target=?",
      [payload.scope, payload.target],
    );
    if (!exists.length) {
      if (payload.scope === "room") {
        const owner = await this.rows(
          "SELECT 1 FROM rooms WHERE id=? AND owner_id=?",
          [payload.target, user],
        );
        requireValue(
          owner.length,
          "The room owner must enable encryption first.",
        );
      }
      await this.run(
        "INSERT OR IGNORE INTO e2ee_rooms(id,scope,target) VALUES(?,?,?)",
        ["!" + randomUUID() + ":gitium.local", payload.scope, payload.target],
      );
    }
    const rows = await this.rows(
      "SELECT id FROM e2ee_rooms WHERE scope=? AND target=?",
      [payload.scope, payload.target],
    );
    return this.snapshot(user, rows[0].id);
  }
  async snapshot(user, room) {
    const start = await this.rows("SELECT epoch FROM e2ee_rooms WHERE id=?", [
      room,
    ]);
    requireValue(start.length);
    const members = await this.rows(
      "SELECT m.user_id,u.github_login FROM e2ee_members m JOIN users u ON u.github_id=m.user_id WHERE m.room_id=? ORDER BY m.user_id",
      [room],
    );
    requireValue(members.some((item) => item.user_id === user));
    const devices = await this.rows(
      "SELECT d.user_id,d.device_id,d.keys_json,d.ed,d.curve FROM e2ee_devices d JOIN e2ee_members m ON m.user_id=d.user_id WHERE m.room_id=? AND d.revoked=0 ORDER BY d.user_id,d.device_id",
      [room],
    );
    const end = await this.rows("SELECT epoch FROM e2ee_rooms WHERE id=?", [
      room,
    ]);
    requireValue(
      start[0].epoch === end[0].epoch,
      "Room changed. Try again.",
      409,
    );
    return { room, epoch: end[0].epoch, members, devices };
  }
}
