const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') return reply({ ok: true, database: !!env.DB });
    if (request.method !== 'POST' || url.pathname !== '/query') return reply({ error: 'Not found.' }, 404);
    if (!env.SERVICE_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.SERVICE_TOKEN}`)
      return reply({ error: 'Unauthorized.' }, 401);
    if (!env.DB) return reply({ error: 'D1 binding is missing.' }, 503);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ error: 'Expected JSON.' }, 415);
    if (Number(request.headers.get('Content-Length') || 0) > 10000) return reply({ error: 'Request too large.' }, 413);
    let input;
    try { const body = await request.text(); if (body.length > 10000) return reply({ error: 'Request too large.' }, 413); input = JSON.parse(body); }
    catch { return reply({ error: 'Invalid JSON.' }, 400); }
    if (typeof input.sql !== 'string' || input.sql.length > 1200 || !/^(SELECT|INSERT|UPDATE|DELETE)\b/i.test(input.sql.trim()) || input.sql.includes(';') ||
        !Array.isArray(input.params) || input.params.length > 10 || input.params.some(value => typeof value !== 'string' || value.length > 2000))
      return reply({ error: 'Invalid query.' }, 400);
    try {
      const result = await env.DB.prepare(input.sql).bind(...input.params).run();
      return reply({ success: true, result: [result] });
    } catch { return reply({ error: 'Database query failed.' }, 500); }
  }
};
