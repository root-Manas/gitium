const reply = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

export default {
  async scheduled(_event, env) {
    if (!env.DB) return;
    const day = 86400000,
      now = Date.now();
    // Bounded hourly cleanup: never remove consumed keys for an active identity.
    await env.DB.batch([
      env.DB.prepare(
        "DELETE FROM e2ee_events WHERE rowid IN (SELECT rowid FROM e2ee_events WHERE created_at<? LIMIT 5000)",
      ).bind(now - 30 * day),
      env.DB.prepare(
        "DELETE FROM e2ee_mail WHERE rowid IN (SELECT rowid FROM e2ee_mail WHERE created_at<? LIMIT 5000)",
      ).bind(now - 30 * day),
      env.DB.prepare(
        "DELETE FROM e2ee_delivery_receipts WHERE rowid IN (SELECT rowid FROM e2ee_delivery_receipts WHERE created_at<? LIMIT 5000)",
      ).bind(now - 90 * day),
      env.DB.prepare("DELETE FROM e2ee_nonces WHERE created_at<?").bind(
        now - 240000,
      ),
      env.DB.prepare(
        "DELETE FROM e2ee_otks WHERE rowid IN (SELECT k.rowid FROM e2ee_otks k JOIN e2ee_devices d ON d.user_id=k.user_id AND d.device_id=k.device_id WHERE d.revoked=1 LIMIT 5000)",
      ),
      env.DB.prepare(
        "DELETE FROM e2ee_used_keys WHERE rowid IN (SELECT k.rowid FROM e2ee_used_keys k JOIN e2ee_devices d ON d.user_id=k.user_id AND d.device_id=k.device_id WHERE d.revoked=1 LIMIT 5000)",
      ),
    ]);
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health")
      return reply({ ok: true, database: !!env.DB });
    if (request.method !== "POST" || url.pathname !== "/query")
      return reply({ error: "Not found." }, 404);
    if (
      !env.SERVICE_TOKEN ||
      request.headers.get("Authorization") !== `Bearer ${env.SERVICE_TOKEN}`
    )
      return reply({ error: "Unauthorized." }, 401);
    if (!env.DB) return reply({ error: "D1 binding is missing." }, 503);
    if (!request.headers.get("Content-Type")?.startsWith("application/json"))
      return reply({ error: "Expected JSON." }, 415);
    if (Number(request.headers.get("Content-Length") || 0) > 262144)
      return reply({ error: "Request too large." }, 413);
    let input;
    try {
      const body = await request.text();
      if (body.length > 262144)
        return reply({ error: "Request too large." }, 413);
      input = JSON.parse(body);
    } catch {
      return reply({ error: "Invalid JSON." }, 400);
    }
    if (
      typeof input.sql !== "string" ||
      input.sql.length > 3000 ||
      !/^(SELECT|INSERT|UPDATE|DELETE)\b/i.test(input.sql.trim()) ||
      input.sql.includes(";") ||
      !Array.isArray(input.params) ||
      input.params.length > 12 ||
      input.params.some(
        (value) => typeof value !== "string" || value.length > 131072,
      )
    )
      return reply({ error: "Invalid query." }, 400);
    try {
      const result = await env.DB.prepare(input.sql)
        .bind(...input.params)
        .run();
      return reply({ success: true, result: [result] });
    } catch {
      return reply({ error: "Database query failed." }, 500);
    }
  },
};
