const SCHEMA=`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY,name TEXT NOT NULL,organization TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',deadline TEXT NOT NULL DEFAULT '',status TEXT NOT NULL CHECK (status IN ('OPEN','CLOSED')),fields_json TEXT NOT NULL,created_at TEXT NOT NULL,share_token TEXT NOT NULL UNIQUE,context TEXT NOT NULL CHECK (context IN ('BUSINESS','FAMILY','TEAM','EVENT','OTHER')));CREATE INDEX IF NOT EXISTS idx_campaigns_share_token ON campaigns(share_token);CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,submitted_at TEXT NOT NULL,values_json TEXT NOT NULL,FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE);CREATE INDEX IF NOT EXISTS idx_submissions_campaign_id ON submissions(campaign_id);CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);`;
interface Env{DB:D1Database;ASSETS:Fetcher}
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','access-control-allow-origin':'*'}});
async function setup(db:D1Database){for(const s of SCHEMA.split(';').map(x=>x.trim()).filter(Boolean))await db.prepare(s).run();}
async function api(r:Request,e:Env):Promise<Response>{
 const u=new URL(r.url),p=u.pathname;
 if(r.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'Content-Type'}});
 if(p==='/api/health'&&r.method==='GET'){try{await e.DB.prepare('SELECT 1').first();return json({ok:true,service:'measurement-wallet-api',database:'connected'});}catch{return json({ok:false,database:'unavailable'},503);}}
 if(p==='/api/setup'&&r.method==='POST'){try{await setup(e.DB);return json({ok:true,setup:'complete'});}catch(x){return json({ok:false,error:String(x)},500);}}
 try{
  await setup(e.DB);
  if(p==='/api/campaigns'&&r.method==='GET'){const q=await e.DB.prepare('SELECT id,name,organization,description,deadline,status,fields_json,created_at,share_token,context FROM campaigns ORDER BY created_at DESC').all();return json(q.results);}
  const sm=p.match(/^\/api\/campaigns\/share\/([^/]+)$/);
  if(sm&&r.method==='GET'){const c=await e.DB.prepare('SELECT id,name,organization,description,deadline,status,fields_json,created_at,share_token,context FROM campaigns WHERE share_token=?').bind(sm[1]).first();return c?json(c):json({error:'Campaign not found'},404);}
  const cm=p.match(/^\/api\/campaigns\/([^/]+)$/);
  if(cm){
   const id=cm[1];
   if(r.method==='GET'){const c=await e.DB.prepare('SELECT id,name,organization,description,deadline,status,fields_json,created_at,share_token,context FROM campaigns WHERE id=?').bind(id).first();if(!c)return json({error:'Campaign not found'},404);const s=await e.DB.prepare('SELECT id,campaign_id,submitted_at,values_json FROM submissions WHERE campaign_id=? ORDER BY submitted_at DESC').bind(id).all();return json({campaign:c,submissions:s.results});}
   const b=await r.json() as any,c=b.campaign??b;
   if(r.method==='POST'){const x=c.id??crypto.randomUUID();await e.DB.prepare('INSERT INTO campaigns (id,name,organization,description,deadline,status,fields_json,created_at,share_token,context) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(x,c.name??'',c.organization??'',c.description??'',c.deadline??'',c.status??'OPEN',JSON.stringify(c.fields??[]),c.createdAt??new Date().toISOString(),c.shareToken??crypto.randomUUID().slice(0,8).toUpperCase(),c.context??'BUSINESS').run();return json({ok:true,id:x});}
   if(r.method==='PUT'){await e.DB.prepare('UPDATE campaigns SET name=?,organization=?,description=?,deadline=?,status=?,fields_json=?,share_token=?,context=? WHERE id=?').bind(c.name??'',c.organization??'',c.description??'',c.deadline??'',c.status??'OPEN',JSON.stringify(c.fields??[]),c.shareToken??'',c.context??'BUSINESS',id).run();return json({ok:true});}
  }
  if(p==='/api/submissions'&&r.method==='POST'){const b=await r.json() as any,s=b.submission??b,id=s.id??crypto.randomUUID();await e.DB.prepare('INSERT INTO submissions (id,campaign_id,submitted_at,values_json) VALUES (?,?,?,?)').bind(id,s.campaignId,s.submittedAt??new Date().toISOString(),JSON.stringify(s.values??{})).run();return json({ok:true,id});}
  return json({error:'Not found'},404);
 }catch(x){return json({ok:false,error:String(x)},500);}
}
export default{async fetch(r:Request,e:Env,ctx:ExecutionContext){const u=new URL(r.url);return u.pathname.startsWith('/api/')?api(r,e):e.ASSETS.fetch(r);}};