import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { encode } from "next-auth/jwt";
process.env.TEMP = process.env.TMP = 'D:/Projects/.gitium-tools/tmp';
mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = createRequire(import.meta.url)(
  process.env.GITIUM_PLAYWRIGHT_PATH ||
    "D:/Projects/.gitium-tools/gitium-visual-tools/node_modules/playwright-core",
);
const db = new DatabaseSync(":memory:");
db.exec(readFileSync("schema.sql", "utf8"));
db.exec(readFileSync("encryption-schema.sql", "utf8"));
for (const [id, login] of [
  ["11", "alice"],
  ["22", "bob"],
])
  db.prepare(
    "INSERT INTO users(github_id,github_login,avatar_url) VALUES(?,?,?)",
  ).run(id, login, "");
db.exec(
  "INSERT INTO dm_requests(pair,requester_id,recipient_id,status) VALUES('11:22','11','22','accepted')",
);
const bridge = createServer(async (req, res) => {
  try {
    if (req.headers.authorization !== "Bearer encryption-test-only") {
      res.writeHead(401).end();
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    const { sql, params } = JSON.parse(body);
    assert.ok(sql.length <= 3000);
    assert.ok(params.length <= 12);
    assert.ok(
      params.every(
        (value) => typeof value === "string" && value.length <= 131072,
      ),
    );
    const stmt = db.prepare(sql);
    const result = /^SELECT|RETURNING/.test(sql)
      ? { results: stmt.all(...params), meta: { changes: 0 } }
      : { results: [], meta: { changes: Number(stmt.run(...params).changes) } };
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ success: true, result: [{ success: true, ...result }] }),
    );
  } catch (error) {
    res
      .writeHead(500, { "Content-Type": "application/json" })
      .end(
        JSON.stringify({
          success: false,
          errors: [{ message: error.message }],
        }),
      );
  }
});
bridge.listen(3219, "127.0.0.1");
await once(bridge, "listening");
const base = "http://localhost:3218",
  secret = "isolated-e2ee-browser-test-secret";
const app = spawn(
  process.execPath,
  [
    "--require",
    resolve("tests/fixtures/github-preload.cjs"),
    "node_modules/next/dist/bin/next",
    "start",
    "--port",
    "3218",
  ],
  {
    env: {
      ...process.env,
      NEXTAUTH_URL: base,
      NEXTAUTH_SECRET: secret,
      GITHUB_ID: "test",
      GITHUB_SECRET: "test",
      CF_D1_WORKER_URL: "http://127.0.0.1:3219",
      CF_D1_SERVICE_TOKEN: "encryption-test-only",
      GITIUM_E2EE_ENABLED: "enabled",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let log = "";
app.stdout.on("data", (c) => (log += c));
app.stderr.on("data", (c) => (log += c));
let browser;
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base + "/api/auth/session")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  browser = await chromium.launch({
    executablePath:
      process.env.GITIUM_CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const contexts = [],
    pages = [],
    bodies = [],
    errors = [];
  for (const [id, login] of [
    ["11", "alice"],
    ["22", "bob"],
  ]) {
    const context = await browser.newContext();
    contexts.push(context);
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: await encode({
          secret,
          token: { sub: id, githubId: id, githubLogin: login },
          maxAge: 3600,
        }),
        url: base,
      },
    ]);
    const page = await context.newPage();
    pages.push(page);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (request.url().endsWith("/api/encryption"))
        bodies.push(request.postData());
    });
    await page.goto(base + "/encrypted-chat");
    await page.locator("#passphrase").fill("unique browser unlock phrase");
    await page.locator("#confirm-passphrase").fill("unique browser unlock phrase");
    await page.getByRole("button", { name: "Unlock this browser" }).click();
    await page.getByRole("button", { name: "Review conversation" }).waitFor();
  }
  const [alice, bob] = pages;
  const fingerprints = await Promise.all(
    pages.map((page) => page.locator("#fingerprint").textContent()),
  );
  for (let i = 0; i < 2; i++) {
    await pages[i].getByRole("button", { name: "Review conversation" }).click();
    await pages[i]
      .getByRole("button", { name: "Verify device", exact: true })
      .waitFor();
    await pages[i]
      .getByRole("textbox", {
        name: "Fingerprint for " + (i ? "alice" : "bob"),
      })
      .fill(fingerprints[1 - i]);
    await pages[i]
      .getByRole("button", { name: "Verify device", exact: true })
      .click();
    await pages[i].getByText("Device verified.", { exact: true }).waitFor();
    await pages[i]
      .getByRole("button", { name: "Approve these members and devices" })
      .click();
    await pages[i]
      .getByText(
        "Ready. Messages will be encrypted before leaving this browser.",
        { exact: true },
      )
      .waitFor();
  }
  await alice.locator("#message").fill("browser-only confidential phrase");
  await alice
    .getByRole("button", { name: "Send encrypted message", exact: true })
    .click();
  await alice.getByText("Encrypted message sent.", { exact: true }).waitFor();
  await bob
    .getByRole("button", { name: "Refresh messages", exact: true })
    .click();
  await bob
    .locator("#timeline")
    .getByText("@11:gitium.local: browser-only confidential phrase", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    bodies.some(
      (body) =>
        body?.includes("browser-only confidential phrase") ||
        body?.includes("unique browser unlock phrase"),
    ),
    false,
  );
  assert.equal(
    JSON.stringify(
      db.prepare("SELECT payload FROM e2ee_events").all(),
    ).includes("browser-only confidential phrase"),
    false,
  );
  const plain = await contexts[0].request.post(base + "/api/messages", {
    headers: { Origin: base },
    data: { scope: "dm", target: "id:22", body: "must reject plaintext" },
  });
  assert.equal(plain.status(), 409);
  const editPlain=await contexts[0].request.patch(base+'/api/messages',{headers:{Origin:base},data:{id:'old-message',body:'must also reject plaintext edits'}});
  assert.equal(editPlain.status(),409);
  for (const width of [320, 390, 1440])
    for (const theme of ["light", "dark"]) {
      await alice.setViewportSize({ width, height: 900 });
      await alice.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      assert.equal(
        await alice.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${width} ${theme} overflow`,
      );
    }
  const duplicate = await contexts[0].newPage();
  await duplicate.goto(base + "/encrypted-chat");
  await duplicate.locator("#passphrase").fill("unique browser unlock phrase");
  await duplicate.getByRole("button", { name: "Unlock this browser" }).click();
  await duplicate
    .getByText("This device is open in another tab. Lock it there first.", {
      exact: true,
    })
    .waitFor();
  await duplicate.close();
  await alice.getByRole("button", { name: "Lock chat", exact: true }).click();
  await alice.locator("#passphrase").fill("unique browser unlock phrase");
  await alice.getByRole("button", { name: "Unlock this browser" }).click();
  await alice.getByRole("button", { name: "Review conversation" }).waitFor();
  await alice.getByRole("button", { name: "Review conversation" }).click();
  await alice
    .getByRole("button", { name: "Approve these members and devices" })
    .click();
  await alice
    .getByText(
      "Ready. Messages will be encrypted before leaving this browser.",
      { exact: true },
    )
    .waitFor();
  db.exec("INSERT INTO chat_blocks(blocker_id,blocked_id) VALUES('22','11')");
  await alice.locator("#message").fill("after access revoked");
  await alice
    .getByRole("button", { name: "Send encrypted message", exact: true })
    .click();
  await alice
    .getByText("Encrypted chat request rejected.", { exact: true })
    .waitFor();
  assert.equal(db.prepare("SELECT COUNT(*) n FROM e2ee_events").get().n, 1);
  db.exec("DELETE FROM chat_blocks");
  await alice.getByRole('button',{name:'Lock chat',exact:true}).click();
  await alice.goto(base+'/spaces?dm=id:22');
  await alice.locator('#passphrase').fill('unique browser unlock phrase');
  await alice.getByRole('button',{name:'Unlock this browser'}).click();
  await alice.getByRole('button',{name:'Review conversation'}).click();
  await alice.getByRole('button',{name:'Approve these members and devices'}).click();
  await alice.locator('#timeline').getByText('@11:gitium.local: browser-only confidential phrase',{exact:true}).waitFor();
  assert.equal(await alice.locator('textarea[aria-label="Message"]').count(),0,'No legacy plaintext composer');
  const rejectedReset=await contexts[0].request.post(base+'/api/encryption/reset',{headers:{Origin:base},data:{confirmation:'no'}});
  assert.equal(rejectedReset.status(),400);
  const foreignReset=await contexts[0].request.post(base+'/api/encryption/reset',{headers:{Origin:'https://other.invalid'},data:{confirmation:'RESET MY DEVICES'}});
  assert.equal(foreignReset.status(),403);
  const reset=await contexts[0].request.post(base+'/api/encryption/reset',{headers:{Origin:base},data:{confirmation:'RESET MY DEVICES'}});
  assert.equal(reset.status(),200);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM e2ee_devices WHERE user_id='11' AND revoked=0").get().n,0);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM e2ee_devices WHERE user_id='22' AND revoked=0").get().n,1);
  const again=await contexts[0].request.post(base+'/api/encryption/reset',{headers:{Origin:base},data:{confirmation:'RESET MY DEVICES'}});
  assert.equal(again.status(),429);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: actual browser encryption, two verified devices, no plaintext on wire/database, plaintext downgrade rejection, cross-tab lock, restart, revocation, mobile and themes.",
  );
} catch (error) {
  console.error(log);
  throw error;
} finally {
  await browser?.close();
  app.kill();
  bridge.close();
  db.close();
}
