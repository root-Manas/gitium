import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { EncryptionService } from "../src/lib/encryption-service.mjs";
import { CryptoClient } from "../public/e2ee/crypto-client.mjs";
import { HttpTransport } from "../public/e2ee/http-transport.mjs";

const nativeFetch = globalThis.fetch;
globalThis.fetch = (url, options) =>
  String(url).startsWith("file:")
    ? Promise.resolve(
        new Response(readFileSync(new URL(url)), {
          headers: { "Content-Type": "application/wasm" },
        }),
      )
    : nativeFetch(url, options);
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("schema.sql", "utf8"));
  db.exec(readFileSync("encryption-schema.sql", "utf8"));
  for (const [id, login] of [
    ["11", "alice"],
    ["22", "bob"],
    ["33", "eve"],
  ])
    db.prepare(
      "INSERT INTO users(github_id,github_login,avatar_url) VALUES(?,?,?)",
    ).run(id, login, "");
  db.exec(
    "INSERT INTO dm_requests(pair,requester_id,recipient_id,status) VALUES('11:22','11','22','accepted')",
  );
  const metrics = { statements: 0 };
  const run = async (sql, params = []) => {
    metrics.statements++;
    assert.ok(sql.length <= 3000);
    assert.ok(params.length <= 12);
    const statement = db.prepare(sql);
    return /^(SELECT)|RETURNING/.test(sql)
      ? { results: statement.all(...params), changes: 0 }
      : { results: [], changes: Number(statement.run(...params).changes) };
  };
  return { db, service: new EncryptionService(run), metrics };
}
class Transport extends HttpTransport {
  constructor(service, user) {
    super();
    this.service = service;
    this.user = user;
    this.captured = [];
  }
  async call(action, payload = {}) {
    const device = this.client.deviceId,
      time = Date.now(),
      nonce = crypto.randomUUID();
    const signatures = await this.client.machine.sign(
      JSON.stringify([this.user, device, action, payload, time, nonce]),
    );
    const input = {
      action,
      device,
      payload,
      proof: {
        time,
        nonce,
        signature: JSON.parse(signatures.asJSON())[this.client.userId][
          "ed25519:" + device
        ],
      },
    };
    this.captured.push(structuredClone(input));
    return this.service.handle(this.user, input);
  }
}
test("encrypted service: identity, consent, key claims, offline delivery, replay, revocation and recovery", async () => {
  const { db, service, metrics } = fixture();
  const transports = ["11", "22", "33"].map(
    (user) => new Transport(service, user),
  );
  const clients = [];
  try {
    for (let i = 0; i < 3; i++)
      clients.push(
        await CryptoClient.open(
          transports[i].user,
          "DEVICE_0" + i,
          transports[i],
        ),
      );
    const [alice, bob] = clients;
    const [a, b, e] = transports;
    const state = await a.call("open", { scope: "dm_v2", target: "11:22" });
    a.context = b.context = { room: state.room, epoch: state.epoch };
    e.context = a.context;
    await assert.rejects(() =>
      e.call("open", { scope: "dm_v2", target: "11:22" }),
    );
    await assert.rejects(() => e.call("messages", a.context));
    await assert.rejects(
      () => service.handle("22", a.captured[0]),
      /signature|keys/,
    );
    await assert.rejects(
      () => service.handle("11", a.captured.at(-1)),
      /Repeated/,
    );
    const ids = [alice.userId, bob.userId];
    await alice.discover(ids);
    await bob.discover(ids);
    alice.approveRoster(state.room, ids);
    bob.approveRoster(state.room, ids);
    await assert.rejects(
      () =>
        alice.encrypt(state.room, "unverified", {
          id: "$x",
          epoch: state.epoch,
        }),
      /Verify every/,
    );
    await alice.verify(bob.userId, bob.deviceId, bob.fingerprint());
    await bob.verify(alice.userId, alice.deviceId, alice.fingerprint());
    const beforeSend = metrics.statements;
    const beforeRequests = a.captured.length;
    const txn = crypto.randomUUID();
    const event = await alice.encrypt(
      state.room,
      "private only in the browser",
      { id: "$" + txn, epoch: state.epoch },
    );
    assert.ok(!JSON.stringify(event).includes("private only in the browser"));
    await a.call("send", { ...a.context, event, txn });
    console.log(
      "Local two-device first-send cost:",
      JSON.stringify({
        backendCalls: a.captured.length - beforeRequests,
        sqlStatements: metrics.statements - beforeSend,
        requestBytes: Buffer.byteLength(
          JSON.stringify(a.captured.slice(beforeRequests)),
        ),
      }),
    );
    const mails = db.prepare("SELECT * FROM e2ee_mail").all();
    assert.ok(mails.length);
    assert.ok(!JSON.stringify(mails).includes("private only in the browser"));
    assert.ok(
      !JSON.stringify(db.prepare("SELECT * FROM e2ee_events").all()).includes(
        "private only in the browser",
      ),
    );
    // Offline recipient receives the same queue until it acknowledges receipt.
    const first = await b.call("receive"),
      second = await b.call("receive");
    assert.deepEqual(first.ids, second.ids);
    await bob.sync();
    const received = (await b.call("messages", b.context)).events[0];
    assert.equal(
      await bob.decrypt(state.room, received),
      "private only in the browser",
    );
    await assert.rejects(
      () => bob.decrypt(state.room, { ...received, event_id: "$changed" }),
      /identity/,
    );
    await assert.rejects(() =>
      bob.decrypt(state.room, {
        ...received,
        content: {
          ...received.content,
          ciphertext: received.content.ciphertext.slice(0, -4) + "AAAA",
        },
      }),
    );
    await assert.rejects(() =>
      a.call("send", {
        ...a.context,
        event: {
          type: "m.room.message",
          sender: alice.userId,
          content: { body: "no" },
        },
        txn: crypto.randomUUID(),
      }),
    );
    const claim = {
      ...a.context,
      body: {
        one_time_keys: {
          [bob.userId]: { [bob.deviceId]: "signed_curve25519" },
        },
      },
    };
    const claims = await Promise.all([
      a.call("claim", claim),
      a.call("claim", claim),
    ]);
    assert.notDeepEqual(claims[0], claims[1]);
    const before = db.prepare("SELECT COUNT(*) n FROM e2ee_used_keys").get().n;
    const upload = b.captured.find((x) => x.action === "upload").payload;
    await b.call("upload", upload);
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM e2ee_used_keys").get().n,
      before,
    );
    assert.equal(
      db
        .prepare(
          "SELECT COUNT(*) n FROM e2ee_otks o JOIN e2ee_used_keys u USING(user_id,device_id,key_id)",
        )
        .get().n,
      0,
    );
    const backup = await bob.exportRecovery(
      "a strong separate recovery passphrase",
    );
    await assert.rejects(() => bob.importRecovery(backup, "wrong"));
    const b2 = new Transport(service, "22");
    const restored = await CryptoClient.open("22", "DEVICE_RESTORED", b2);
    clients.push(restored);
    b2.context = {
      ...b.context,
      epoch: (await b2.call("open", { scope: "dm_v2", target: "11:22" })).epoch,
    };
    await restored.importRecovery(
      backup,
      "a strong separate recovery passphrase",
    );
    await restored.discover(ids);
    await restored.verify(alice.userId, alice.deviceId, alice.fingerprint());
    await assert.rejects(
      () => restored.decrypt(state.room, received),
      /Unknown sender/,
    );
    assert.equal(
      await restored.decrypt(state.room, received, true),
      "private only in the browser",
    );
    await assert.rejects(
      () => a.call("send", { ...a.context, event, txn: crypto.randomUUID() }),
      /changed/,
    );
    a.context.epoch = b2.context.epoch;
    await assert.rejects(
      () =>
        alice.encrypt(state.room, "unverified new device", {
          id: "$new",
          epoch: a.context.epoch,
        }),
      /Verify every/,
    );
    await b.call("revoke", { device: "DEVICE_RESTORED" });
    await assert.rejects(() => b2.call("receive"), /unavailable/);
    db.exec("INSERT INTO chat_blocks(blocker_id,blocked_id) VALUES('22','11')");
    await assert.rejects(() => a.call("messages", a.context));
    await assert.rejects(() =>
      a.call("send", { ...a.context, event, txn: crypto.randomUUID() }),
    );
  } finally {
    for (const client of clients) client.close();
    db.close();
  }
});

test("group membership epochs reject stale sends and removed members cannot decrypt new sessions", async () => {
  const { db, service } = fixture();
  const roomId = crypto.randomUUID();
  db.prepare(
    "INSERT INTO rooms(id,scope,target,owner_id,owner_login) VALUES(?,'repo','alice/project','11','alice')",
  ).run(roomId);
  for (const [id, login] of [
    ["11", "alice"],
    ["22", "bob"],
    ["33", "eve"],
  ])
    db.prepare(
      "INSERT INTO room_members(room_id,user_id,login) VALUES(?,?,?)",
    ).run(roomId, id, login);
  const ts = ["11", "22", "33"].map((id) => new Transport(service, id)),
    clients = [];
  try {
    for (let i = 0; i < 3; i++)
      clients.push(await CryptoClient.open(ts[i].user, "GROUP_DEV" + i, ts[i]));
    const state = await ts[0].call("open", { scope: "room", target: roomId });
    const ids = clients.map((client) => client.userId);
    for (let i = 0; i < 3; i++) {
      ts[i].context = { room: state.room, epoch: state.epoch };
      await clients[i].discover(ids);
      for (const other of clients)
        await clients[i].verify(
          other.userId,
          other.deviceId,
          other.fingerprint(),
        );
      clients[i].approveRoster(state.room, ids);
    }
    const txn = crypto.randomUUID(),
      event = await clients[0].encrypt(state.room, "before removal", {
        id: "$" + txn,
        epoch: state.epoch,
      });
    await ts[0].call("send", { ...ts[0].context, txn, event });
    await clients[1].sync();
    assert.equal(
      await clients[1].decrypt(
        state.room,
        (await ts[1].call("messages", ts[1].context)).events[0],
      ),
      "before removal",
    );
    db.prepare("DELETE FROM room_members WHERE room_id=? AND user_id=?").run(
      roomId,
      "22",
    );
    await assert.rejects(() => ts[1].call("messages", ts[1].context));
    await assert.rejects(
      () =>
        ts[0].call("send", {
          ...ts[0].context,
          txn: crypto.randomUUID(),
          event,
        }),
      /changed/,
    );
    const next = await ts[0].call("open", { scope: "room", target: roomId });
    ts[0].context = { room: next.room, epoch: next.epoch };
    clients[0].approveRoster(next.room, [clients[0].userId, clients[2].userId]);
    const nextTxn = crypto.randomUUID(),
      nextEvent = await clients[0].encrypt(next.room, "after removal", {
        id: "$" + nextTxn,
        epoch: next.epoch,
      });
    await ts[0].call("send", {
      ...ts[0].context,
      txn: nextTxn,
      event: nextEvent,
    });
    await clients[1].sync();
    const stolen = {
      ...nextEvent,
      event_id: "$" + nextTxn,
      origin_server_ts: Date.now(),
    };
    await assert.rejects(() => clients[1].decrypt(next.room, stolen));
  } finally {
    for (const client of clients) client.close();
    db.close();
  }
});
