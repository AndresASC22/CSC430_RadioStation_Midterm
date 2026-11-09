const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { handleAuth } = require('./auth');
const { handleSchedule, getPublicShows } = require('./schedule');
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data', 'requests.json');
const shows = [
 {id:1,title:'Morning Frequency',day:'Monday–Friday',start:'08:00',end:'10:00',host:'Jordan Lee',genre:'Music & news'},
 {id:2,title:'Midday Mix',day:'Monday–Friday',start:'12:00',end:'14:00',host:'Taylor Morgan',genre:'Pop & requests'},
 {id:3,title:'Evening Sessions',day:'Monday–Friday',start:'18:00',end:'20:00',host:'Casey Rivera',genre:'Indie & interviews'},
 {id:4,title:'Weekend Spotlight',day:'Saturday',start:'11:00',end:'13:00',host:'Jordan Lee',genre:'Community'}
];
const hosts = [
 {name:'Jordan Lee',role:'Morning & weekend host',bio:'Brings local stories and a lively mix of music to the station.'},
 {name:'Taylor Morgan',role:'Midday host',bio:'Curates upbeat playlists and takes listener requests.'},
 {name:'Casey Rivera',role:'Evening host',bio:'Features independent artists and interviews.'}
];
const announcements = [
 {title:'Welcome to our new website',date:'2026-11-07',body:'Browse shows, meet the hosts, and send us your song requests.'},
 {title:'Weekend Spotlight',date:'2026-11-07',body:'Explore community stories every Saturday at 11 AM.'}
];
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function handle(req,res){
 const u = new URL(req.url,'http://localhost');
 if (u.pathname === '/api/admin/schedule' || u.pathname.startsWith('/api/admin/schedule/')) {
  void handleSchedule(req, res, u.pathname);
  return;
 }
 if (u.pathname.startsWith('/api/auth/') || u.pathname === '/api/admin/users') {
  void handleAuth(req, res, u.pathname);
  return;
 }
 if(req.method==='GET' && u.pathname==='/api/content') {
  void getPublicShows().then(showsFromDb => json(res,200,{shows:showsFromDb,hosts,announcements,streamUrl:process.env.RADIO_STREAM_URL||null,streamConfigured:!!process.env.RADIO_STREAM_URL})).catch(err => { console.error('Public schedule load failed:', err); json(res,503,{error:'Station content temporarily unavailable.'}); });
  return;
 }
 if(req.method==='POST' && u.pathname==='/api/requests'){
  let body='';req.on('data',chunk=>{body+=chunk;if(body.length>10000)req.destroy();});
  return req.on('end',()=>{let data;try{data=JSON.parse(body);}catch{return json(res,400,{error:'Invalid JSON'});}
   const name=String(data.name||'').trim(),email=String(data.email||'').trim(),message=String(data.message||'').trim(),type=String(data.type||'message');
   if(name.length<2||name.length>80||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<3||message.length>1000||!['message','song request'].includes(type))return json(res,400,{error:'Enter a valid name, email, type, and message (3–1000 characters).'});
   const record={id:Date.now()+'-'+Math.random().toString(36).slice(2,8),name,email,message,type,createdAt:new Date().toISOString()};
   let existing=[];try{existing=JSON.parse(fs.readFileSync(DATA,'utf8'));}catch{}
   existing.push(record);fs.writeFileSync(DATA,JSON.stringify(existing,null,2));return json(res,201,{success:true,id:record.id});
  });
 }
 if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
 const pathname=u.pathname==='/'?'/index.html':u.pathname;
 const full=path.resolve(ROOT,'.'+pathname);
 if(!full.startsWith(ROOT+path.sep))return json(res,403,{error:'Forbidden'});
 fs.readFile(full,(err,buf)=>{if(err)return json(res,404,{error:'Not found'});const ext=path.extname(full);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'})[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(buf);});
}
if(require.main===module)http.createServer(handle).listen(PORT,()=>console.log('Radio Station Website: http://localhost:'+PORT));
module.exports={handle};
