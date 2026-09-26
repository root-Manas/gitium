type D1Response<T> = { success: boolean; errors?: { message: string }[]; result?: { success: boolean; results?: T[] }[] };

export const dbConfigured = () => !!(process.env.CF_D1_WORKER_URL && process.env.CF_D1_SERVICE_TOKEN);

export async function queryD1<T>(sql: string, params: (string | number)[] = []): Promise<T[]> {
  if (!dbConfigured()) throw new Error('Cloudflare D1 is not configured.');
  const { CF_D1_WORKER_URL, CF_D1_SERVICE_TOKEN } = process.env;
  const response = await fetch(`${CF_D1_WORKER_URL?.replace(/\/$/, '')}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_D1_SERVICE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params: params.map(String) }),
    cache: 'no-store'
  });
  const data = await response.json() as D1Response<T>;
  if (!response.ok || !data.success || !data.result?.[0]?.success)
    throw new Error(data.errors?.[0]?.message || 'Cloudflare D1 query failed.');
  return data.result[0].results || [];
}
