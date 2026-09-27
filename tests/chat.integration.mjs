// Real Next handlers with synthetic sessions and an isolated in-memory DB.
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { encode } from 'next-auth/jwt';
import { resolve } from 'node:path';

const db=new DatabaseSync(':memory:');db.exec(readFileSync('schema.sql','utf8'));
for(const [id,login] of [['11','alice'],['22','bob'],['33','mallory']])db.prepare('INSERT INTO users(github_id,github_login,avatar_url) VALUES(?,?,?)').run(id,login,'');
const bridge=createServer(async(req,res)=>{
 if(req.headers.authorization!=='Bearer integration-only'){res.writeHead(401).end();return;}
 try {
  let body='';for await(const chunk of req)body+=chunk;
  const {sql,params}=JSON.parse(body);const stmt=db.prepare(sql);
  const result=/^SELECT/i.test(sql)?{results:stmt.all(...params),meta:{changes:0}}:{results:[],meta:{changes:Number(stmt.run(...params).changes)}};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({success:true,result:[{success:true,...result}]}));
 }catch(e){res.writeHead(500,{'Content-Type':'application/json'}).end(JSON.stringify({success:false,errors:[{message:e.message}]}));}
});
bridge.listen(3199,'127.0.0.1');await once(bridge,'listening');
const secret='isolated-integration-test-secret-2026';const base='http://localhost:3198';
const app=spawn(process.execPath,['--require',resolve('tests/fixtures/github-preload.cjs'),'node_modules/next/dist/bin/next','start','--port','3198'],{cwd:process.cwd(),env:{...process.env,NEXTAUTH_URL:base,NEXTAUTH_SECRET:secret,GITHUB_ID:'test',GITHUB_SECRET:'test',CF_D1_WORKER_URL:'http://127.0.0.1:3199',CF_D1_SERVICE_TOKEN:'integration-only'},stdio:['ignore','pipe','pipe']});
let log='';app.stdout.on('data',c=>log+=c);app.stderr.on('data',c=>log+=c);
const cookies={};for(const [name,id] of [['alice','11'],['bob','22'],['mallory','33']])cookies[name]='next-auth.session-token='+await encode({secret,token:{sub:id,githubId:id,githubLogin:name,githubAccessToken:'test-token'},maxAge:3600});
let checks=0;
async function call(user,path,method='GET',body,expected=200,origin=base){
 const response=await fetch(base+path,{method,headers:{...(user?{Cookie:cookies[user]}:{}),...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);checks++;return data;
}
try{
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/auth/session')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 await call(null,'/api/rooms','GET',undefined,401);
 await call(null,'/api/messages?scope=room&target=00000000-0000-4000-8000-000000000000','GET',undefined,401);
 await call('alice','/api/rooms','POST',{action:'create',scope:'repo',target:'alice/project'},403,'https://evil.example');
 const {id:room}=await call('alice','/api/rooms','POST',{action:'create',scope:'repo',target:'alice/project'},201);
 await call('mallory',`/api/rooms?roomId=${room}`,'GET',undefined,403);
 await call('mallory','/api/rooms','POST',{action:'invite',roomId:room,login:'bob'},403);
 await call('alice','/api/rooms','POST',{action:'invite',roomId:room,login:'bob'});
 await call('mallory','/api/rooms','POST',{action:'accept',roomId:room},403);
 cookies.impostor='next-auth.session-token='+await encode({secret,token:{sub:'33',githubId:'33',githubLogin:'bob'},maxAge:3600});
 await call('impostor','/api/rooms','POST',{action:'accept',roomId:room},403);
 await call('bob','/api/rooms','POST',{action:'accept',roomId:room});
 const {id:message}=await call('bob','/api/messages','POST',{scope:'room',target:room,body:'hello <script>plain text</script>'},201);
 assert.equal((await call('alice',`/api/messages?scope=room&target=${room}`)).messages[0].body,'hello <script>plain text</script>');
 await call('alice','/api/messages','PATCH',{id:message,body:'not mine'},403);
 await call('bob','/api/messages','PATCH',{id:message,body:'edited'});
 await call('alice','/api/rooms','POST',{action:'remove',roomId:room,userId:'22'});
 for(const method of ['PATCH','DELETE'])await call('bob','/api/messages',method,{id:message,body:'after removal'},403);
 await call('bob',`/api/messages?scope=room&target=${room}`,'GET',undefined,403);
 await call('bob','/api/messages','POST',{scope:'room',target:room,body:'after removal'},403);
 await call('alice','/api/messages','POST',{scope:'dm',target:'id:22',body:'private to bob'},201);
 assert.equal((await call('bob','/api/messages?scope=dm&target=id:11')).messages[0].body,'private to bob');
 assert.equal((await call('impostor','/api/messages?scope=dm&target=id:11')).messages.length,0);
 await call('alice','/api/messages?scope=repo&target=alice/project','GET',undefined,403);
 if(process.env.GITIUM_PLAYWRIGHT_PATH){
  const { createRequire }=await import('node:module');
  const { chromium }=createRequire(import.meta.url)(process.env.GITIUM_PLAYWRIGHT_PATH);
  const browser=await chromium.launch({executablePath:process.env.GITIUM_CHROME_PATH,headless:true});
  try{
   const context=await browser.newContext();
   await context.addCookies([{name:'next-auth.session-token',value:cookies.alice.split('=')[1],url:base}]);
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   for(const width of [320,390,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:900});
    await page.goto(base+'/spaces?room='+room);
    await page.getByRole('heading',{name:'alice/project',exact:true}).waitFor();
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${theme} chat overflow`);
    await page.getByText('edited',{exact:true}).waitFor();
    checks++;
   }
   await page.goto(base+'/spaces?dm=id%3A22');
   await page.getByRole('heading',{name:'bob',exact:true}).waitFor();
   await page.getByText('private to bob',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Edit',exact:true}).click();
   await page.getByRole('button',{name:'Save edit',exact:true}).waitFor();
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
   assert.deepEqual(errors,[]);checks++;
  }finally{await browser.close();}
 }
 const results=await Promise.all(Array.from({length:14},()=>fetch(base+'/api/messages',{method:'POST',headers:{Cookie:cookies.alice,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({scope:'room',target:room,body:'quota'})})));
 assert.equal(results.filter(r=>r.status===201).length,9);checks++;
 console.log(`PASS: ${checks} chat authorization, revocation, identity, CSRF and concurrent quota checks.`);
}catch(error){console.error(log);throw error;}finally{app.kill();bridge.close();db.close();}
