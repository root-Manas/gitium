import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const findings=[];
const detectors=[['GitHub token',/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/],['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['AWS access key',/AKIA[0-9A-Z]{16}/]];
for(const path of files){
 if(/(^|\/)(\.env(?:\.[^/]+)?|\.dev\.vars|wrangler\.jsonc)$/.test(path)&&!path.endsWith('.example'))findings.push([path,'private configuration tracked']);
 if(/\.(?:sqlite3?|db)(?:-journal)?$/.test(path))findings.push([path,'local database tracked']);
 if(!existsSync(path)||statSync(path).size>1000000)continue;
 const text=readFileSync(path,'utf8');for(const [label,pattern] of detectors)if(pattern.test(text))findings.push([path,label]);
}
function walk(dir){if(!existsSync(dir))return;for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(path.endsWith('.js')&&/CF_D1_SERVICE_TOKEN|GITHUB_SECRET|NEXTAUTH_SECRET/.test(readFileSync(path,'utf8')))findings.push([path,'server credential reference in browser bundle']);}}
walk('.next/static');
if(findings.length){for(const [path,reason] of findings)console.error(`${path}: ${reason}`);process.exitCode=1;}else console.log(`PASS: ${files.length} tracked files checked; no matching credentials, tracked private configuration, local databases or server credential references in browser bundles.`);
