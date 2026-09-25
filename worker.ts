const SCHEMA=`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY,name TEXT NOT NULL,organization TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',deadline TEXT NOT NULL DEFAULT '',status TEXT NOT NULL CHECK (status IN ('OPEN','CLOSED')),fields_json TEXT NOT NULL,created_at TEXT NOT NULL,share_token TEXT NOT NULL UNIQUE,context TEXT NOT NULL CHECK (context IN ('BUSINESS','FAMILY','TEAM','EVENT','OTHER')),admin_token TEXT NOT NULL DEFAULT '',owner_key TEXT NOT NULL DEFAULT '');CREATE INDEX IF NOT EXISTS idx_campaigns_share_token ON campaigns(share_token);CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,submitted_at TEXT NOT NULL,values_json TEXT NOT NULL,FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE);CREATE INDEX IF NOT EXISTS idx_submissions_campaign_id ON submissions(campaign_id);CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at);`;
interface Env{DB:D1Database;ASSETS:Fetcher;STRIPE_SECRET_KEY:string;STRIPE_WEBHOOK_SECRET:string}
const json=(d:unknown,s=200,origin='')=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':origin,'vary':'Origin'}});
const allowedOrigin=(r:Request)=>{const o=r.headers.get('Origin')||'';return /^https:\/\/(mw\.geeskit\.com|measurement-wallet\.geeskitgsp\.workers\.dev)$/.test(o)||/^https?:\/\/localhost(?::\d+)?$/.test(o)?o:''};
const stripeFetch=async(e:Env,path:string,body?:URLSearchParams)=>{const res=await fetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+e.STRIPE_SECRET_KEY,'Content-Type':'application/x-www-form-urlencoded'},body});const data=await res.json().catch(()=>null);if(!res.ok)throw new Error(data?.error?.message||'Stripe request failed');return data;};
const cleanText=(v:unknown,max=5000)=>String(v??'').trim().slice(0,max);
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
async function hashToken(value:string){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
async function setup(db:D1Database){
  for(const s of SCHEMA.split(';').map(x=>x.trim()).filter(Boolean)) await db.prepare(s).run();
  try{await db.prepare("ALTER TABLE campaigns ADD COLUMN admin_token TEXT NOT NULL DEFAULT ''").run();}catch{} try{await db.prepare("ALTER TABLE campaigns ADD COLUMN owner_key TEXT NOT NULL DEFAULT ''").run();}catch{}
  // Remove only the original built-in demo records. Never seed demo data.
  await db.prepare("DELETE FROM submissions WHERE campaign_id IN ('camp_01','camp_02','camp_03')").run();
  await db.prepare("DELETE FROM campaigns WHERE id IN ('camp_01','camp_02','camp_03')").run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS billing (owner_key TEXT PRIMARY KEY, stripe_customer_id TEXT, subscription_id TEXT, status TEXT NOT NULL DEFAULT 'inactive', email TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)`).run();
}

async function getOwnerPlan(db:D1Database,e:Env,ownerKey:string){
  if(!ownerKey) return 'FREE';
  const row=await db.prepare('SELECT status,stripe_customer_id FROM billing WHERE owner_key=?').bind(ownerKey).first() as any;
  let status=row?.status||'inactive';
  if(row?.stripe_customer_id){try{const qs=new URLSearchParams({customer:row.stripe_customer_id,status:'all',limit:'10'});const subs=await stripeFetch(e,'subscriptions?'+qs.toString());const matching=(subs?.data||[]).find((s:any)=>s?.metadata?.product==='measurement_wallet'||s?.items?.data?.some((i:any)=>i?.price?.id==='price_1UHvf2CMdtEyhy9yDTNSGK30'));if(matching){status=matching.status||status;await db.prepare('UPDATE billing SET subscription_id=?,status=?,updated_at=? WHERE owner_key=?').bind(matching.id||'',status,new Date().toISOString(),ownerKey).run();}}catch{}}
  return ['active','trialing'].includes(status)?'PRO':'FREE';
}
async function readJson(r:Request){try{return await r.json() as any;}catch{return null;}}
async function adminCampaign(db:D1Database,id:string,r:Request){
  const supplied=r.headers.get('x-mw-admin-token')||'';
  if(!supplied) return null;
  const hashed=await hashToken(supplied);
  const c=await db.prepare('SELECT id,name,organization,description,deadline,status,fields_json,created_at,share_token,context,owner_key FROM campaigns WHERE id=? AND admin_token=?').bind(id,hashed).first() as any;
  if(c && !c.owner_key){
    const ownerKey=cleanText(r.headers.get('x-mw-owner-key'),128);
    if(ownerKey){await db.prepare('UPDATE campaigns SET owner_key=? WHERE id=?').bind(ownerKey,id).run();c.owner_key=ownerKey;}
  }
  return c;
}
async function api(r:Request,e:Env):Promise<Response>{
  const u=new URL(r.url),p=u.pathname;
  const origin=allowedOrigin(r);
  if(r.method==='OPTIONS') return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'Content-Type,X-MW-Admin-Token,X-MW-Owner-Key','vary':'Origin'}});
  if(p==='/api/health'&&r.method==='GET'){
    try{await e.DB.prepare('SELECT 1').first();return json({ok:true,service:'measurement-wallet-api',database:'connected'},200,origin);}
    catch{return json({ok:false,database:'unavailable'},503,origin);}
  }
  if(p==='/api/stripe/webhook'&&r.method==='POST'){
    const sig=r.headers.get('stripe-signature')||'', raw=await r.text();
    const parts=Object.fromEntries(sig.split(',').map(x=>x.split('=')));
    const ts=Number(parts.t), v1=parts.v1||'';
    const secret=e.STRIPE_WEBHOOK_SECRET||'';
    if(!secret||!ts||Math.abs(Date.now()/1000-ts)>300) return json({error:'Invalid webhook'},400,origin);
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ts+'.'+raw));
    const expected=Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,'0')).join('');
    if(expected!==v1) return json({error:'Invalid signature'},400,origin);
    try{
      const event=JSON.parse(raw), obj=event.data?.object||{}, meta=obj.metadata||{}, ownerKey=meta.owner_key||obj.subscription_details?.metadata?.owner_key||'';
      if(ownerKey){
        if(event.type==='checkout.session.completed'){
          await e.DB.prepare('INSERT INTO billing (owner_key,stripe_customer_id,subscription_id,status,email,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(owner_key) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id,subscription_id=excluded.subscription_id,status=excluded.status,email=excluded.email,updated_at=excluded.updated_at')
            .bind(ownerKey,obj.customer||'',obj.subscription||'','active',obj.customer_details?.email||'',new Date().toISOString()).run();
        } else if(event.type.startsWith('customer.subscription.')){
          await e.DB.prepare('UPDATE billing SET subscription_id=?,status=?,updated_at=? WHERE owner_key=?')
            .bind(obj.id||'',obj.status||'inactive',new Date().toISOString(),ownerKey).run();
        }
      }
      return json({received:true},200,origin);
    }catch(x){return json({error:String(x)},400,origin);}
  }

  if(p==='/api/setup'&&r.method==='POST'){try{await setup(e.DB);return json({ok:true,setup:'complete'},200,origin);}catch(x){return json({ok:false,error:String(x)},500,origin);}}
  try{
    await setup(e.DB);

    // ===== STRIPE BILLING =====
    if(p==='/api/billing/checkout'&&r.method==='POST'){
      const supplied=r.headers.get('x-mw-admin-token')||'';
      if(!supplied) return json({error:'Not authorized'},401,origin);
      const durableOwnerKey=cleanText(r.headers.get('x-mw-owner-key'),128); const legacyOwnerKey=await hashToken(supplied); const ownerKey=durableOwnerKey||legacyOwnerKey; const b=await readJson(r), email=cleanText(b?.email,320);
      const existing=await e.DB.prepare('SELECT stripe_customer_id,status FROM billing WHERE owner_key=?').bind(ownerKey).first() as any;
      let customerId=existing?.stripe_customer_id||'';
      if(!customerId){
        const customer=await stripeFetch(e,'customers',new URLSearchParams({email:email||'unknown@invalid.local','metadata[owner_key]':ownerKey,'metadata[product]':'measurement_wallet'}));
        customerId=customer.id;
      }
      const form=new URLSearchParams();
      form.set('mode','subscription'); form.set('customer',customerId); form.set('line_items[0][price]','price_1UHvf2CMdtEyhy9yDTNSGK30'); form.set('line_items[0][quantity]','1');
      form.set('success_url','https://mw.geeskit.com/?billing=success'); form.set('cancel_url','https://mw.geeskit.com/?billing=cancelled');
      form.set('client_reference_id',ownerKey); form.set('metadata[owner_key]',ownerKey); form.set('metadata[product]','measurement_wallet');
      form.set('subscription_data[metadata][owner_key]',ownerKey); form.set('subscription_data[metadata][product]','measurement_wallet');
      const session=await stripeFetch(e,'checkout/sessions',form);
      await e.DB.prepare('INSERT INTO billing (owner_key,stripe_customer_id,status,email,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(owner_key) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id,email=excluded.email,updated_at=excluded.updated_at')
        .bind(ownerKey,customerId,existing?.status||'inactive',email,new Date().toISOString()).run();
      return json({ok:true,url:session.url},200,origin);
    }
    if(p==='/api/billing/status'&&r.method==='GET'){
      const supplied=r.headers.get('x-mw-admin-token')||'';
      if(!supplied) return json({error:'Not authorized'},401,origin);
      const legacyOwnerKey=await hashToken(supplied); const durableOwnerKey=cleanText(r.headers.get('x-mw-owner-key'),128); let ownerKey=durableOwnerKey||legacyOwnerKey;
      let row=await e.DB.prepare('SELECT status,email,subscription_id,stripe_customer_id FROM billing WHERE owner_key=?').bind(ownerKey).first() as any;
      if(durableOwnerKey && !row){ const legacy=await e.DB.prepare('SELECT status,email,subscription_id,stripe_customer_id FROM billing WHERE owner_key=?').bind(legacyOwnerKey).first() as any; if(legacy && ['active','trialing'].includes(legacy.status||'')){ await e.DB.prepare('INSERT INTO billing (owner_key,stripe_customer_id,subscription_id,status,email,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(owner_key) DO UPDATE SET stripe_customer_id=excluded.stripe_customer_id,subscription_id=excluded.subscription_id,status=excluded.status,email=excluded.email,updated_at=excluded.updated_at').bind(durableOwnerKey,legacy.stripe_customer_id||'',legacy.subscription_id||'',legacy.status||'inactive',legacy.email||'',new Date().toISOString()).run(); row=legacy; } }
      let status=row?.status||'inactive';
      let subscriptionId=row?.subscription_id||'';
      if(row?.stripe_customer_id){
        try{
          const qs=new URLSearchParams({customer:row.stripe_customer_id,status:'all',limit:'10'});
          const subs=await stripeFetch(e,'subscriptions?'+qs.toString());
          const matching=(subs?.data||[]).find((s:any)=>s?.metadata?.owner_key===ownerKey||s?.items?.data?.some((i:any)=>i?.price?.id==='price_1UHvf2CMdtEyhy9yDTNSGK30'));
          if(matching){
            status=matching.status||'inactive';
            subscriptionId=matching.id||subscriptionId;
            await e.DB.prepare('UPDATE billing SET subscription_id=?,status=?,updated_at=? WHERE owner_key=?')
              .bind(subscriptionId,status,new Date().toISOString(),ownerKey).run();
          }
        }catch{}
      }
      const active=['active','trialing'].includes(status);
      return json({plan:active?'PRO':'FREE',status,email:row?.email||'',subscriptionId},200,origin);
    }
    if(p==='/api/billing/portal'&&r.method==='POST'){
      const supplied=r.headers.get('x-mw-admin-token')||'';
      if(!supplied) return json({error:'Not authorized'},401,origin);
      const durableOwnerKey=cleanText(r.headers.get('x-mw-owner-key'),128); const legacyOwnerKey=await hashToken(supplied); const ownerKey=durableOwnerKey||legacyOwnerKey;
      let row=await e.DB.prepare('SELECT stripe_customer_id FROM billing WHERE owner_key=?').bind(ownerKey).first() as any;
      if(!row && durableOwnerKey){ row=await e.DB.prepare('SELECT stripe_customer_id FROM billing WHERE owner_key=?').bind(legacyOwnerKey).first() as any; }
      if(!row?.stripe_customer_id) return json({error:'No Stripe customer found'},404,origin);
      const form=new URLSearchParams({customer:row.stripe_customer_id,return_url:'https://mw.geeskit.com/'});
      const session=await stripeFetch(e,'billing_portal/sessions',form);
      return json({ok:true,url:session.url},200,origin);
    }

    // Create: the server owns the admin credential. It is returned once to the creator.
    if(p==='/api/campaigns'&&r.method==='POST'){
      const b=await readJson(r),c=b?.campaign??b; const ownerKey=cleanText(r.headers.get('x-mw-owner-key'),128); const plan=await getOwnerPlan(e.DB,e,ownerKey);
      if(!c?.name) return json({error:'Campaign name is required'},400,origin);
      const context=['BUSINESS','FAMILY','TEAM','EVENT','OTHER'].includes(c.context)?c.context:'BUSINESS';
      const status=c.status==='CLOSED'?'CLOSED':'OPEN';
      const fields=Array.isArray(c.fields)?c.fields.slice(0,30):[];
      if(fields.length===0) return json({error:'At least one field is required'},400,origin); if(plan==='FREE' && ownerKey){const count=await e.DB.prepare('SELECT COUNT(*) AS n FROM campaigns WHERE owner_key=?').bind(ownerKey).first() as any; if(Number(count?.n||0) >=1) return json({error:'FREE plan limit reached: 1 group. Upgrade to PRO to create more.',code:'PLAN_LIMIT',limit:'campaigns'},402,origin);}
      const id=cleanText(c.id,100)||crypto.randomUUID();
      const shareToken=cleanText(c.shareToken,32)||Array.from(crypto.getRandomValues(new Uint8Array(5)),b=>b.toString(36)).join('').slice(0,8).toUpperCase();
      const adminToken=token(),adminTokenHash=await hashToken(adminToken);
      await e.DB.prepare('INSERT INTO campaigns (id,name,organization,description,deadline,status,fields_json,created_at,share_token,context,admin_token,owner_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id,cleanText(c.name,200),cleanText(c.organization,200),cleanText(c.description,5000),cleanText(c.deadline,30),status,JSON.stringify(fields),cleanText(c.createdAt,40)||new Date().toISOString(),shareToken,context,adminTokenHash,ownerKey).run();
      return json({ok:true,id,adminToken},200,origin);
    }

    // Public share lookup exposes only participant-safe campaign data.
    const sm=p.match(/^\/api\/campaigns\/share\/([^/]+)$/);
    if(sm&&r.method==='GET'){
      const c=await e.DB.prepare('SELECT id,name,organization,description,deadline,status,fields_json,created_at,share_token,context FROM campaigns WHERE share_token=?').bind(sm[1]).first();
      return c?json(c,200,origin):json({error:'Campaign not found'},404,origin);
    }

    const cm=p.match(/^\/api\/campaigns\/([^/]+)$/);
    if(cm){
      const id=cm[1];
      const c=await adminCampaign(e.DB,id,r);
      if(!c) return json({error:'Not authorized'},401,origin);

      if(r.method==='GET'){
        const s=await e.DB.prepare('SELECT id,campaign_id,submitted_at,values_json FROM submissions WHERE campaign_id=? ORDER BY submitted_at DESC').bind(id).all();
        return json({campaign:c,submissions:s.results},200,origin);
      }

      const b=await readJson(r),incoming=b?.campaign??b;
      if(!incoming) return json({error:'Campaign payload required'},400,origin);

      if(r.method==='PUT'){
        await e.DB.prepare('UPDATE campaigns SET name=?,organization=?,description=?,deadline=?,status=?,fields_json=?,share_token=?,context=? WHERE id=?')
          .bind(incoming.name??c.name,incoming.organization??'',incoming.description??'',incoming.deadline??'',incoming.status==='CLOSED'?'CLOSED':'OPEN',JSON.stringify(incoming.fields??[]),incoming.shareToken??c.share_token,incoming.context??c.context,id).run();
        return json({ok:true},200,origin);
      }

      if(r.method==='DELETE'){
        await e.DB.prepare('DELETE FROM submissions WHERE campaign_id=?').bind(id).run();
        await e.DB.prepare('DELETE FROM campaigns WHERE id=?').bind(id).run();
        return json({ok:true},200,origin);
      }
    }

    // Public submission route: token identifies the campaign; server enforces OPEN status.
    const ps=p.match(/^\/api\/campaigns\/share\/([^/]+)\/submissions$/);
    if(ps&&r.method==='POST'){
      const campaign=await e.DB.prepare('SELECT id,status,fields_json,owner_key FROM campaigns WHERE share_token=?').bind(ps[1]).first() as any;
      if(!campaign) return json({error:'Campaign not found'},404);
      if(campaign.status!=='OPEN') return json({error:'Campaign is closed'},409,origin);
      const b=await readJson(r),s=b?.submission??b;
      if(!s?.campaignId || s.campaignId!==campaign.id) return json({error:'Invalid campaign'},400,origin);
      const fields=JSON.parse(campaign.fields_json||'[]') as any[];
      const allowed=new Set(fields.map(f=>f.id));
      const values=s.values&&typeof s.values==='object'?s.values:{};
      const clean:Record<string,string>={};
      for(const [k,v] of Object.entries(values)) if(allowed.has(k)) clean[k]=String(v??'').slice(0,2000);
      for(const f of fields) if(f.required&&!String(clean[f.id]??'').trim()) return json({error:`${f.label} is required`},400);
      const plan=await getOwnerPlan(e.DB,e,campaign.owner_key||''); const limit=plan==='PRO'?500:5; const countQuery=plan==='PRO' ? 'SELECT COUNT(*) AS n FROM submissions WHERE campaign_id IN (SELECT id FROM campaigns WHERE owner_key=?) AND submitted_at>=?' : 'SELECT COUNT(*) AS n FROM submissions WHERE campaign_id IN (SELECT id FROM campaigns WHERE owner_key=?)'; const countArgs=plan==='PRO' ? [campaign.owner_key,new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString()] : [campaign.owner_key]; const count=await e.DB.prepare(countQuery).bind(...countArgs).first() as any; if(Number(count?.n||0)>=limit) return json({error:`${plan} plan submission limit reached (${limit}). Upgrade to PRO for more capacity.`,code:'PLAN_LIMIT',limit:'submissions'},402,origin);
      const id=crypto.randomUUID();
      await e.DB.prepare('INSERT INTO submissions (id,campaign_id,submitted_at,values_json) VALUES (?,?,?,?)').bind(id,campaign.id,new Date().toISOString(),JSON.stringify(clean)).run();
      return json({ok:true,id},200,origin);
    }

    return json({error:'Not found'},404,origin);
  }catch(x){return json({ok:false,error:String(x)},500);}
}
export default{async fetch(r:Request,e:Env,ctx:ExecutionContext){const u=new URL(r.url);if(u.hostname==='measurement-wallet.geeskitgsp.workers.dev'&&!u.pathname.startsWith('/api/'))return Response.redirect('https://mw.geeskit.com'+u.pathname+u.search,301);if(u.pathname.startsWith('/api/'))return api(r,e);const asset=await e.ASSETS.fetch(r);if(u.pathname.startsWith('/c/')){const h=new Headers(asset.headers);h.set('X-Robots-Tag','noindex, nofollow');return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers:h});}return asset;}};