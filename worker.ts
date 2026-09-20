const SCHEMA=`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY,name TEXT NOT NULL,organization TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',deadline TEXT NOT NULL DEFAULT '',status TEXT NOT NULL CHECK (status IN ('OPEN','CLOSED')),fields_json TEXT NOT NULL,created_at TEXT NOT NULL,share_token TEXT NOT NULL UNIQUE,context TEXT NOT NULL CHECK (context IN ('BUSINESS','FAMILY','TEAM','EVENT','OTHER')),admin_token TEXT NOT NULL DEFAULT '');CREATE INDEX IF NOT EXISTS idx_campaigns_share_token ON campaigns(share_token);CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,submitted_at TEXT NOT NULL,values_json TEXT NOT NULL,FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE);CREATE INDEX IF NOT EXISTS idx_submissions_campaign_id ON submissions(campaign_id);CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);`;
interface Env{DB:D1Database;ASSETS:Fetcher}
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':'*'}});
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
async function setup(db:D1Database){
  for(const s of SCHEMA.split(';').map(x=>x.trim()).filter(Boolean)) await db.prepare(s).run();
  try{await db.prepare("ALTER TABLE campaigns ADD COLUMN admin_token TEXT NOT NULL DEFAULT ''").run();}catch{}
  // Remove only the original built-in demo records. Never seed demo data.
  await db.prepare("DELETE FROM submissions WHERE campaign_id IN ('camp_01','camp_02','camp_03')").run();
  await db.prepare("DELETE FROM campaigns WHERE id IN ('camp_01','camp_02','camp_03')").run();
}
async function readJson(r:Request){try{return await r.json() as any;}catch{return null;}}
async function adminCampaign(db:D1Database,id:string,r:Request){
  const supplied=r.headers.get('x-mw-admin-token')||'';
  if(!supplied) return null;
  return await db.prepare('SELECT id,name,organization,description,deadline,status,fields_json,created_at,share_token,context,admin_token FROM campaigns WHERE id=? AND admin_token=?').bind(id,supplied).first();
}
async function api(r:Request,e:Env):Promise<Response>{
  const u=new URL(r.url),p=u.pathname;
  if(r.method==='OPTIONS') return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'Content-Type,X-MW-Admin-Token'}});
  if(p==='/api/health'&&r.method==='GET'){
    try{await e.DB.prepare('SELECT 1').first();return json({ok:true,service:'measurement-wallet-api',database:'connected'});}
    catch{return json({ok:false,database:'unavailable'},503);}
  }
  if(p==='/api/setup'&&r.method==='POST'){try{await setup(e.DB);return json({ok:true,setup:'complete'});}catch(x){return json({ok:false,error:String(x)},500);}}
  try{
    await setup(e.DB);

    // Create: the server owns the admin credential. It is returned once to the creator.
    if(p==='/api/campaigns'&&r.method==='POST'){
      const b=await readJson(r),c=b?.campaign??b;
      if(!c?.name) return json({error:'Campaign name is required'},400);
      const id=c.id??crypto.randomUUID(),shareToken=c.shareToken??Array.from(crypto.getRandomValues(new Uint8Array(5)),b=>b.toString(36)).join('').slice(0,8).toUpperCase(),adminToken=token();
      await e.DB.prepare('INSERT INTO campaigns (id,name,organization,description,deadline,status,fields_json,created_at,share_token,context,admin_token) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id,c.name,c.organization??'',c.description??'',c.deadline??'',c.status??'OPEN',JSON.stringify(c.fields??[]),c.createdAt??new Date().toISOString(),shareToken,c.context??'BUSINESS',adminToken).run();
      return json({ok:true,id,adminToken});
    }

    // Public share lookup exposes only participant-safe campaign data.
    const sm=p.match(/^\/api\/campaigns\/share\/([^/]+)$/);
    if(sm&&r.method==='GET'){
      const c=await e.DB.prepare('SELECT id,name,organization,description,deadline,status,fields_json,created_at,share_token,context FROM campaigns WHERE share_token=?').bind(sm[1]).first();
      return c?json(c):json({error:'Campaign not found'},404);
    }

    const cm=p.match(/^\/api\/campaigns\/([^/]+)$/);
    if(cm){
      const id=cm[1];
      const c=await adminCampaign(e.DB,id,r);
      if(!c) return json({error:'Not authorized'},401);

      if(r.method==='GET'){
        const s=await e.DB.prepare('SELECT id,campaign_id,submitted_at,values_json FROM submissions WHERE campaign_id=? ORDER BY submitted_at DESC').bind(id).all();
        return json({campaign:c,submissions:s.results});
      }

      const b=await readJson(r),incoming=b?.campaign??b;
      if(!incoming) return json({error:'Campaign payload required'},400);

      if(r.method==='PUT'){
        await e.DB.prepare('UPDATE campaigns SET name=?,organization=?,description=?,deadline=?,status=?,fields_json=?,share_token=?,context=? WHERE id=?')
          .bind(incoming.name??c.name,incoming.organization??'',incoming.description??'',incoming.deadline??'',incoming.status==='CLOSED'?'CLOSED':'OPEN',JSON.stringify(incoming.fields??[]),incoming.shareToken??c.share_token,incoming.context??c.context,id).run();
        return json({ok:true});
      }

      if(r.method==='DELETE'){
        await e.DB.prepare('DELETE FROM submissions WHERE campaign_id=?').bind(id).run();
        await e.DB.prepare('DELETE FROM campaigns WHERE id=?').bind(id).run();
        return json({ok:true});
      }
    }

    // Public submission route: token identifies the campaign; server enforces OPEN status.
    const ps=p.match(/^\/api\/campaigns\/share\/([^/]+)\/submissions$/);
    if(ps&&r.method==='POST'){
      const campaign=await e.DB.prepare('SELECT id,status,fields_json FROM campaigns WHERE share_token=?').bind(ps[1]).first() as any;
      if(!campaign) return json({error:'Campaign not found'},404);
      if(campaign.status!=='OPEN') return json({error:'Campaign is closed'},409);
      const b=await readJson(r),s=b?.submission??b;
      if(!s?.campaignId || s.campaignId!==campaign.id) return json({error:'Invalid campaign'},400);
      const fields=JSON.parse(campaign.fields_json||'[]') as any[];
      const allowed=new Set(fields.map(f=>f.id));
      const values=s.values&&typeof s.values==='object'?s.values:{};
      const clean:Record<string,string>={};
      for(const [k,v] of Object.entries(values)) if(allowed.has(k)) clean[k]=String(v??'').slice(0,2000);
      for(const f of fields) if(f.required&&!String(clean[f.id]??'').trim()) return json({error:`${f.label} is required`},400);
      const id=crypto.randomUUID();
      await e.DB.prepare('INSERT INTO submissions (id,campaign_id,submitted_at,values_json) VALUES (?,?,?,?)').bind(id,campaign.id,new Date().toISOString(),JSON.stringify(clean)).run();
      return json({ok:true,id});
    }

    return json({error:'Not found'},404);
  }catch(x){return json({ok:false,error:String(x)},500);}
}
export default{async fetch(r:Request,e:Env,ctx:ExecutionContext){const u=new URL(r.url);return u.pathname.startsWith('/api/')?api(r,e):e.ASSETS.fetch(r);}};