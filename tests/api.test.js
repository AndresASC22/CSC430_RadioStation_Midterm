const test=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const {handle}=require('../server');
let server,base;
test.before(async()=>{server=http.createServer(handle);await new Promise(r=>server.listen(0,r));base='http://127.0.0.1:'+server.address().port;});
test.after(async()=>{await new Promise(r=>server.close(r));});
test('homepage loads',async()=>{const r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/Waveform Radio/);});
test('content has schedule, hosts, announcements',async()=>{const r=await fetch(base+'/api/content');const d=await r.json();assert.equal(r.status,200);assert.equal(d.shows.length,4);assert.equal(d.hosts.length,3);assert.equal(d.announcements.length,2);});
test('invalid request rejected',async()=>{const r=await fetch(base+'/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'A',email:'bad',message:''})});assert.equal(r.status,400);});
test('valid song request stored',async()=>{const r=await fetch(base+'/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test User',email:'test@example.org',message:'Please play a song',type:'song request'})});assert.equal(r.status,201);assert.equal((await r.json()).success,true);});
test('unknown path returns 404',async()=>{const r=await fetch(base+'/missing');assert.equal(r.status,404);});
