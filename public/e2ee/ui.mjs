import { CryptoClient } from "./crypto-client.mjs";
import { HttpTransport } from "./http-transport.mjs";

export function mount(root, initialConversation) {
  root.classList.add("encryption-page");
  root.innerHTML = `<style>.encryption-page{overflow-wrap:anywhere}.encryption-page input:not([type=checkbox]),.encryption-page select{min-width:0;max-width:100%;width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--line);border-radius:6px;color:var(--ink);background:var(--paper)}.encryption-page button{max-width:100%;white-space:normal}.encryption-page .chat-consent label{display:block;margin:10px 0}.encryption-page .chat-messages{min-height:100px}.encryption-page #workspace{min-width:0}</style><div class="page-heading"><span class="eyebrow">END-TO-END ENCRYPTED</span><h1>Encrypted conversations.</h1><p>Messages are encrypted in your browser. Verify each device with its owner before sending.</p></div>
  <p role="status" id="crypto-status"></p>
  <form id="unlock" class="contribute-filters"><label>Device unlock passphrase<input id="passphrase" type="password" minlength="16" autocomplete="off" required></label><label>Repeat passphrase for a new device<input id="confirm-passphrase" type="password" autocomplete="off"><small>Leave blank when unlocking an existing device.</small></label><button class="issue-search">Unlock this browser</button></form><details id="reset-panel"><summary>Lost your passphrase or all devices?</summary><p>Reset revokes all your devices. Contacts must verify your new fingerprint. Old messages need a recovery file and its passphrase; Gitium cannot decrypt them for you.</p><label>Type RESET MY DEVICES<input id="reset-confirm" autocomplete="off"></label><button id="reset-devices">Reset my devices</button></details>
  <section id="workspace" hidden><div class="chat-consent"><strong>Your device fingerprint</strong><p id="fingerprint" style="overflow-wrap:anywhere"></p><p>Compare fingerprints through another trusted channel. Do not verify a fingerprint just because it is displayed here. New devices require verification again.</p><button id="lock">Lock chat</button></div>
  <form id="open" class="contribute-filters"><label>Conversation<select id="conversation"><option value="">Choose an accepted chat or joined room</option></select></label><button class="issue-search">Review conversation</button></form>
  <p class="chat-consent">Encrypted messages and undelivered keys are kept for 30 days. Download a recovery file before changing browsers. Older plaintext messages remain separate in Messages.</p><div id="verification" class="chat-consent"></div><button id="older" hidden>Load older encrypted messages</button><div id="timeline" class="chat-messages" aria-live="polite"></div>
  <form id="send" class="chat-composer"><textarea id="message" aria-label="Encrypted message" maxlength="500" placeholder="Verify devices and approve membership first" disabled></textarea><button id="send-button" disabled>Send encrypted message</button></form>
  <div class="chat-consent"><button id="refresh">Refresh messages</button><button id="export">Download encrypted recovery file</button><label>Recovery passphrase<input id="recovery-pass" type="password" autocomplete="off" minlength="20"></label><label>Import recovery file<input id="recovery-file" type="file" accept=".txt"></label><p>Recovery files contain message keys, not your device identity. Keep the file and passphrase separately. Restored devices still need verification.</p><label><input type="checkbox" id="recovered-history"> Show recovered history with unverified sender attribution</label><div id="devices"></div></div></section>`;
  const el = (id) => root.querySelector("#" + id);
  let client,
    transport,
    state,
    approved = false,
    busy = false,
    session,
    disposed = false;
  let idle,
    cursor,
    generation = 0,
    pendingClose;
  const loaded = new Map();
  const message = (text) => {
    el("crypto-status").textContent = text;
  };
  const setEnabled = () => {
    root.querySelectorAll("button:not(#lock)").forEach((button) => {
      button.disabled = busy;
    });
    el("message").disabled = !approved || busy;
    el("send-button").disabled = !approved || busy;
  };
  const run = (fn) => async (event) => {
    event?.preventDefault();
    if (busy) return;
    busy = true;
    setEnabled();
    try {
      await fn();
    } catch (error) {
      approved = false;
      message(error.message);
    } finally {
      busy = false;
      pendingClose?.close();
      pendingClose = null;
      setEnabled();
    }
  };
  const resetIdle = () => {
    clearTimeout(idle);
    if (client) idle = setTimeout(lock, 5 * 60000);
  };
  function lock() {
    clearTimeout(idle);
    generation++;
    if (client) {
      if (busy) pendingClose = client;
      else client.close();
    }
    client = null;
    state = null;
    approved = false;
    el("workspace").hidden = true;
    el("unlock").hidden = false;
    el("timeline").replaceChildren();
    el("verification").replaceChildren();
    el("message").value = "";
    el("passphrase").value = "";
    el("recovery-pass").value = "";
    el("recovery-file").value = "";
    el("confirm-passphrase").value = "";
    loaded.clear();
    cursor = null;
    el("older").hidden = true;
    message("Chat locked.");
  }
  async function timeline(older = false) {
    if (!state || !approved || !client) return;
    const activeGeneration = generation;
    await client.sync();
    if (activeGeneration !== generation || !client) return;
    const page = await transport.call("messages", {
      room: state.room,
      epoch: state.epoch,
      ...(older && cursor ? { before: cursor } : {}),
    });
    if (activeGeneration !== generation || !client) return;
    if (!older) loaded.clear();
    cursor = page.before;
    el("older").hidden = !cursor;
    for (const event of page.events) {
      let body;
      try {
        body = await client.decrypt(state.room, event);
      } catch {
        try {
          if (!el("recovered-history").checked) throw new Error();
          body =
            "Recovered text (sender not verified): " +
            (await client.decrypt(state.room, event, true));
        } catch {
          body =
            "Encrypted message — unable to verify or decrypt on this device.";
        }
      }
      if (activeGeneration !== generation || !client) return;
      loaded.set(event.event_id, { event, body });
    }
    el("timeline").replaceChildren();
    for (const { event, body } of [...loaded.values()].sort(
      (a, b) =>
        a.event.origin_server_ts - b.event.origin_server_ts ||
        a.event.event_id.localeCompare(b.event.event_id),
    )) {
      const item = document.createElement("p");
      item.className = "crypto-message";
      // Sender identity is bound inside authenticated ciphertext by CryptoClient.
      const content = document.createElement('span');content.textContent = event.sender + ": " + body;item.append(content);
      const time = document.createElement("small");
      time.textContent = new Date(event.origin_server_ts).toLocaleString();
      item.append(time);
      el("timeline").append(item);
    }
  }
  async function deviceList() {
    const { devices } = await transport.call("devices");
    el("devices").replaceChildren();
    for (const device of devices) {
      const line = document.createElement("p");
      line.textContent =
        device.device_id + (device.revoked ? " — revoked" : "");
      if (!device.revoked) {
        const button = document.createElement("button");
        button.textContent = "Revoke device";
        button.onclick = run(async () => {
          await transport.call("revoke", { device: device.device_id });
          if (device.device_id === client.deviceId) lock();
          else {
            approved = false;
            await deviceList();
            message("Device revoked. Review room membership again.");
          }
        });
        line.append(button);
      }
      el("devices").append(line);
    }
  }
  el("unlock").onsubmit = run(async () => {
    session = await (
      await fetch("/api/auth/session", { cache: "no-store" })
    ).json();
    if (!session.user?.id)
      throw new Error("Sign in to Gitium first, then return here.");
    let device = localStorage.getItem(
      "gitium-crypto-device:" + session.user.id,
    );
    if (!device && el("passphrase").value !== el("confirm-passphrase").value)
      throw new Error("Repeat the same passphrase to create this device.");
    if (!device) {
      device =
        "GITIUM_" + crypto.randomUUID().replaceAll("-", "").toUpperCase();
      localStorage.setItem("gitium-crypto-device:" + session.user.id, device);
    }
    transport = new HttpTransport();
    client = await CryptoClient.open(
      session.user.id,
      device,
      transport,
      "gitium-crypto:" + session.user.id + ":" + device,
      el("passphrase").value,
    );
    el("passphrase").value = "";
    el("confirm-passphrase").value = "";
    if (disposed) {
      client.close();
      return;
    }
    el("unlock").hidden = true;
    el("workspace").hidden = false;
    el("fingerprint").textContent = client.fingerprint();
    resetIdle();
    const [rooms, requests] = await Promise.all(
      ["/api/rooms", "/api/chat-requests"].map(async (path) => {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load your conversations.");
        return response.json();
      }),
    );
    el("conversation").replaceChildren();
    for (const room of rooms.rooms) {
      const option = document.createElement("option");
      option.value = JSON.stringify({ scope: "room", target: room.id });
      option.textContent = room.target;
      el("conversation").append(option);
    }
    for (const peer of requests.requests.filter(
      (item) => item.status === "accepted",
    )) {
      const option = document.createElement("option");
      option.value = JSON.stringify({
        scope: "dm_v2",
        target: [session.user.id, peer.id].sort().join(":"),
      });
      option.textContent = "Direct chat: " + peer.login;
      el("conversation").append(option);
    }
    if (initialConversation) {
      const selected = JSON.stringify(initialConversation);
      if (
        [...el("conversation").options].some(
          (option) => option.value === selected,
        )
      )
        el("conversation").value = selected;
    }
    if (!el("conversation").options.length)
      message(
        "No accepted conversations yet. Open Messages to accept a request or join a room.",
      );
    await deviceList();
    message(
      "Device unlocked. Select a conversation to review its members and devices.",
    );
  });
  el("open").onsubmit = run(async () => {
    approved = false;
    loaded.clear();
    cursor = null;
    el("older").hidden = true;
    if (!el("conversation").value)
      throw new Error(
        "Open Messages to accept a chat request or join a room first.",
      );
    state = await transport.call("open", JSON.parse(el("conversation").value));
    transport.context = { room: state.room, epoch: state.epoch };
    const ids = state.members.map(
      (item) => "@" + item.user_id + ":gitium.local",
    );
    await client.discover(ids);
    el("verification").replaceChildren();
    el("timeline").replaceChildren();
    const heading = document.createElement("p");
    heading.textContent =
      "Members: " +
      state.members.map((item) => item.github_login).join(", ") +
      ". Review every device below.";
    el("verification").append(heading);
    for (const member of state.members) {
      const devices = await client.devices(
        "@" + member.user_id + ":gitium.local",
      );
      if (!devices.length) {
        const missing = document.createElement("p");
        missing.textContent =
          member.github_login +
          " must unlock encrypted chat on a device first.";
        el("verification").append(missing);
      }
      for (const device of devices) {
        const line = document.createElement("div");
        line.className = "chat-consent";
        const label = document.createElement("p");
        label.textContent =
          member.github_login +
          " / " +
          device.id +
          (device.verified ? " — verified" : " — verification needed");
        line.append(label);
        if (!device.verified) {
          const input = document.createElement("input");
          input.placeholder =
            "Paste fingerprint received through a trusted channel";
          input.setAttribute(
            "aria-label",
            "Fingerprint for " + member.github_login,
          );
          const button = document.createElement("button");
          button.textContent = "Verify device";
          button.onclick = run(async () => {
            await client.verify(
              "@" + member.user_id + ":gitium.local",
              device.id,
              input.value.trim(),
            );
            label.textContent =
              member.github_login + " / " + device.id + " — verified";
            input.remove();
            button.remove();
            message("Device verified.");
          });
          line.append(input, button);
        }
        el("verification").append(line);
      }
    }
    const approve = document.createElement("button");
    approve.textContent = "Approve these members and devices";
    approve.onclick = run(async () => {
      const latest = await transport.call(
        "open",
        JSON.parse(el("conversation").value),
      );
      if (latest.epoch !== state.epoch)
        throw new Error(
          "Membership or devices changed. Review the conversation again.",
        );
      for (const id of ids) {
        const devices = await client.devices(id);
        if (!devices.length || devices.some((item) => !item.verified))
          throw new Error("Verify every member’s devices first.");
      }
      client.approveRoster(state.room, ids);
      approved = true;
      await timeline();
      message("Ready. Messages will be encrypted before leaving this browser.");
    });
    el("verification").append(approve);
    message(
      "Compare fingerprints before approving. Existing plaintext messages are not converted.",
    );
  });
  el("send").onsubmit = run(async () => {
    if (!approved || !state)
      throw new Error("Review and approve the conversation first.");
    const txn = crypto.randomUUID();
    const event = await client.encrypt(state.room, el("message").value, {
      id: "$" + txn,
      epoch: state.epoch,
    });
    await transport.call("send", {
      room: state.room,
      epoch: state.epoch,
      event,
      txn,
    });
    el("message").value = "";
    await timeline();
    message("Encrypted message sent.");
  });
  el("refresh").onclick = run(() => timeline());
  el("older").onclick = run(() => timeline(true));
  el("recovered-history").onchange = run(() => timeline());
  el("lock").onclick = lock;
  el("export").onclick = run(async () => {
    const backup = await client.exportRecovery(el("recovery-pass").value);
    el("recovery-pass").value = "";
    const url = URL.createObjectURL(new Blob([backup], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "gitium-encrypted-message-keys.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message("Encrypted recovery file downloaded.");
  });
  el("recovery-file").onchange = run(async () => {
    const file = el("recovery-file").files[0];
    if (!file || file.size > 5000000)
      throw new Error("Choose a recovery file smaller than 5 MB.");
    await client.importRecovery(await file.text(), el("recovery-pass").value);
    el("recovery-pass").value = "";
    el("recovery-file").value = "";
    message("Message keys imported. Device verification is still required.");
  });
  el("reset-devices").onclick = run(async () => {
    const response = await fetch("/api/encryption/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: el("reset-confirm").value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    const identity = await (
      await fetch("/api/auth/session", { cache: "no-store" })
    ).json();
    if (identity.user?.id)
      localStorage.removeItem("gitium-crypto-device:" + identity.user.id);
    lock();
    el("reset-confirm").value = "";
    message(
      "Devices revoked. Create a new device, restore your recovery file if available, and ask contacts to verify your new fingerprint.",
    );
  });
  el("message").onkeydown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (approved && !busy) el("send").requestSubmit();
    }
  };
  const refreshTimer = setInterval(() => {
    if (
      !disposed &&
      client &&
      state &&
      approved &&
      !busy &&
      document.visibilityState === "visible" &&
      !cursor
    )
      void run(() => timeline())();
  }, 30000);
  root.addEventListener("pointerdown", resetIdle);
  root.addEventListener("keydown", resetIdle);
  return () => {
    disposed = true;
    clearInterval(refreshTimer);
    lock();
    root.removeEventListener("pointerdown", resetIdle);
    root.removeEventListener("keydown", resetIdle);
  };
}
