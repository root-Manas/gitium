import fs from 'node:fs/promises';

const { CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_D1_API_TOKEN } = process.env;
if (!CF_ACCOUNT_ID || !CF_D1_DATABASE_ID || !CF_D1_API_TOKEN) {
  console.error('Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and CF_D1_API_TOKEN in .env.local first.');
  process.exit(1);
}

const sql = await fs.readFile(new URL('../schema.sql', import.meta.url), 'utf8');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${CF_D1_API_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sql })
});
const data = await response.json();
if (!response.ok || !data.success || data.result?.some(result => !result.success)) {
  console.error('D1 setup failed:', data.errors?.map(error => error.message).join('; ') || response.status);
  process.exit(1);
}
console.log('Cloudflare D1 schema is ready.');
