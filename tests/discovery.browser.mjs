import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { encode } from 'next-auth/jwt';
process.env.TEMP = process.env.TMP = 'D:/Projects/.gitium-tools/tmp';
mkdirSync(process.env.TEMP, { recursive: true });
const { chromium } = createRequire(import.meta.url)(process.env.GITIUM_PLAYWRIGHT_PATH || 'D:/Projects/.gitium-tools/gitium-visual-tools/node_modules/playwright-core');
const base = 'http://localhost:3228', secret = 'isolated-discovery-test-secret';
const app = spawn(process.execPath, ['--require', resolve('tests/fixtures/discovery-preload.cjs'), 'node_modules/next/dist/bin/next', 'start', '--port', '3228'], { env: { ...process.env, NEXTAUTH_URL: base, NEXTAUTH_SECRET: secret, GITHUB_ID: 'test', GITHUB_SECRET: 'test', CF_D1_WORKER_URL: '', CF_D1_SERVICE_TOKEN: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '', browser;
app.stdout.on('data', c => logs += c); app.stderr.on('data', c => logs += c);
try {
  for (let i=0;i<100;i++) { try { if ((await fetch(base+'/api/auth/session')).ok) break; } catch {} await new Promise(r=>setTimeout(r,250)); }
  browser = await chromium.launch({ executablePath: process.env.GITIUM_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext(); const page = await context.newPage(); const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  // Avoid third-party analytics delivery during isolated tests.
  await context.route('**/_vercel/insights/**', route=>route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/explore?view=essentials','/code','/insights','/contribute','/saved','/search?q=alice','/spaces']) {
      await page.goto(base+path);
      await page.getByRole('textbox',{name:'Search Gitium',exact:true}).waitFor();
      assert.equal(await page.getByRole('search').count(),1,path+' one search');
      for (const theme of ['light','dark']) {
        await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${theme} ${path} overflow`);
        assert.equal(await page.getByRole('textbox',{name:'Search Gitium',exact:true}).isVisible(),true);
      }
    }
  }
  await page.goto(base+'/explore?view=essentials');
  await page.getByRole('textbox',{name:'Search Gitium',exact:true}).fill('zzzxxy-no-match');
  await page.getByRole('heading',{name:'No tools found'}).waitFor();
  await page.getByRole('button',{name:'Clear search',exact:true}).click();
  await page.locator('.project-tile').first().waitFor();
  await page.goto(base+'/code');
  await page.getByRole('heading',{name:'Explore a repository.'}).waitFor();
  await page.getByRole('textbox',{name:'Search Gitium',exact:true}).fill('alice');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Enter a public repository'}).waitFor();
  await page.getByRole('textbox',{name:'Search Gitium',exact:true}).fill('https://github.com/alice/project');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.getByRole('heading',{name:'Commit cadence'}).waitFor();
  const token = await encode({ secret, token: { sub:'11',githubId:'11',githubLogin:'alice',githubAccessToken:'expired-test-token' }, maxAge:3600 });
  const cookie = `next-auth.session-token=${token}`;
  const issueResponse=await fetch(base+'/api/contribute?kind=all',{headers:{Cookie:cookie}});
  assert.equal(issueResponse.status,200);assert.equal((await issueResponse.json()).issues[0].id,9);
  for(const path of ['/api/feed','/api/recommendations','/api/stars','/api/insights?login=alice']) {
    const response=await fetch(base+path,{headers:{Cookie:cookie}});
    assert.equal(response.status,401,path);assert.equal((await response.json()).code,'GITHUB_RECONNECT');
  }
  await context.addCookies([{name:'next-auth.session-token',value:token,url:base}]);
  await page.goto(base+'/explore/following');
  await page.getByRole('button',{name:'Reconnect GitHub',exact:true}).first().waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: one shared search on seven pages, three widths, both themes, catalog filtering, code input formats, expired-token public retry and private reconnect.');
} catch(error) { console.error(logs); throw error; }
finally { await browser?.close();app.kill(); }
