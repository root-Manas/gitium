import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../worker/index.js';

test('encrypted retention removes expired ciphertext and preserves active consumed keys',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync('schema.sql','utf8'));db.exec(readFileSync('encryption-schema.sql','utf8'));
 try{
 const now=Date.now(),day=86400000;
 db.exec("INSERT INTO e2ee_devices VALUES('11','ACTIVE_DEVICE','{}','ed','curve',0),('11','REVOKED_DEVICE','{}','ed2','curve2',1)");
 db.exec("INSERT INTO e2ee_used_keys VALUES('11','ACTIVE_DEVICE','consumed'),('11','REVOKED_DEVICE','consumed')");
 for(const [id,age] of [['expired',31],['current',1]]){
 db.prepare('INSERT INTO e2ee_events VALUES(?,?,?,?,?,?,?,?)').run(id,'room',1,'11','ACTIVE_DEVICE',id,'{}',now-age*day);
 db.prepare('INSERT INTO e2ee_mail VALUES(?,?,?,?,?,?,?,?)').run(id,'11','ACTIVE_DEVICE','22','OTHER_DEVICE',id,'{}',now-age*day);
 }
 const before=db.prepare('SELECT bytes FROM e2ee_storage').get().bytes;assert.equal(before,4*514);
 const DB={prepare(sql){return {sql,params:[],bind(...params){this.params=params;return this}}},async batch(statements){return statements.map(s=>db.prepare(s.sql).run(...s.params))}};
 await worker.scheduled({}, {DB});
 assert.deepEqual(db.prepare('SELECT id FROM e2ee_events').all().map(x=>x.id),['current']);
 assert.deepEqual(db.prepare('SELECT id FROM e2ee_mail').all().map(x=>x.id),['current']);
 assert.equal(db.prepare('SELECT bytes FROM e2ee_storage').get().bytes,2*514);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM e2ee_delivery_receipts').get().n,2,'receipts outlive delivery queue');
 assert.deepEqual(db.prepare('SELECT device_id FROM e2ee_used_keys').all().map(x=>x.device_id),['ACTIVE_DEVICE']);
 db.prepare('UPDATE e2ee_storage SET bytes=?').run(100663296);
 assert.throws(()=>db.prepare('INSERT INTO e2ee_events VALUES(?,?,?,?,?,?,?,?)').run('over','room',1,'11','ACTIVE_DEVICE','over','{}',now),/Encrypted storage limit/);
 }finally{db.close()}
});
