// Application replay ledger. The crypto SDK authenticates ciphertext; this
// rejects a server presenting an already-seen ciphertext as another event.
export class ReplayStore {
  constructor(name){this.name=name;this.memory=new Map();this.db=null;}
  async open(){
    if(!this.name||typeof indexedDB==='undefined')return;
    this.db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(this.name+'-replays',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('events');
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
  }
  async remember(room,event){
    if(typeof event.event_id!=='string'||!event.event_id||!Number.isSafeInteger(event.origin_server_ts))throw new Error('Missing message identity');
    const bytes=new TextEncoder().encode(JSON.stringify([room,event.content.sender_key,event.content.session_id,event.content.ciphertext]));
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
    const identity=JSON.stringify([event.event_id,event.origin_server_ts,event.sender]);
    if(!this.db){const old=this.memory.get(hash);if(old&&old!==identity)throw new Error('Replayed message');this.memory.set(hash,identity);return;}
    await new Promise((resolve,reject)=>{
      const tx=this.db.transaction('events','readwrite');const store=tx.objectStore('events');const request=store.get(hash);
      let failure;
      request.onsuccess=()=>{if(request.result&&request.result!==identity){failure=new Error('Replayed message');tx.abort();}else if(!request.result)store.add(identity,hash);};
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure||tx.error||new Error('Replay ledger failed'));tx.onerror=()=>reject(tx.error);
    });
  }
  close(){this.db?.close();}
}
