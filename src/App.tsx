import React, { useState, useEffect, useMemo } from 'react';
import mwLogo from "./assets/mw-logo.jpg";

// ===== DATA MODELS =====
type FieldType = 'text' | 'email' | 'size' | 'custom';
type Field = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
};
type CampaignStatus = 'OPEN' | 'CLOSED';
type UseContextType = 'BUSINESS' | 'FAMILY' | 'TEAM' | 'EVENT' | 'OTHER';
type Campaign = {
  id: string;
  adminToken?: string;
  name: string;
  organization: string;
  description: string;
  deadline: string;
  status: CampaignStatus;
  fields: Field[];
  createdAt: string;
  shareToken: string;
  context: UseContextType;
};
type Submission = {
  id: string;
  campaignId: string;
  submittedAt: string;
  values: Record<string, string>;
};
type Plan = 'FREE' | 'PRO' | 'BUSINESS';
type BillingInterval = 'monthly' | 'yearly';
type BillingTab = 'overview' | 'invoices' | 'methods' | 'org';
type View = 'landing' | 'dashboard' | 'create' | 'detail' | 'public' | 'confirmed' | 'pricing' | 'upgrade' | 'payment-success' | 'subscription' | 'billing' | 'limits';

type TemplateDef = {
  key: string;
  label: string;
  type: FieldType;
  requiredDefault: boolean;
  options?: string[];
  placeholder?: string;
};

type Invoice = {
  id: string;
  date: string;
  plan: Plan;
  amount: string;
  status: 'PAID' | 'PENDING';
  invoiceId: string;
};

type BillingData = {
  plan: Plan;
  interval: BillingInterval;
  email?: string;
};

// ===== FIELD LIBRARY =====
const FIELD_TEMPLATES: TemplateDef[] = [
  { key: 'fullName', label: 'Full Name', type: 'text', requiredDefault: true, placeholder: 'Jane Doe' },
  { key: 'email', label: 'Email', type: 'email', requiredDefault: false, placeholder: 'jane@company.com' },
  { key: 'shirt', label: 'Shirt / Top Size', type: 'size', requiredDefault: false, options: ['XS','S','M','L','XL','2XL','3XL'] },
  { key: 'pants', label: 'Pants / Bottom Size', type: 'size', requiredDefault: false, options: ['28','30','32','34','36','38','40','42'] },
  { key: 'jacket', label: 'Jacket Size', type: 'size', requiredDefault: false, options: ['S','M','L','XL','XXL'] },
  { key: 'shoe', label: 'Shoe Size', type: 'size', requiredDefault: false, options: ['EU 36','EU 37','EU 38','EU 39','EU 40','EU 41','EU 42','EU 43','EU 44','EU 45','EU 46','EU 47'] },
  { key: 'waist', label: 'Waist', type: 'text', requiredDefault: false, placeholder: 'e.g. 32in / 81cm' },
  { key: 'inseam', label: 'Inseam', type: 'text', requiredDefault: false, placeholder: 'e.g. 30in / 76cm' },
  { key: 'notes', label: 'Notes', type: 'custom', requiredDefault: false, placeholder: 'Fit preferences, allergies, etc.' },
  { key: 'custom', label: 'Other / Custom', type: 'custom', requiredDefault: false, placeholder: 'Enter value' },
];

// ===== CONTEXT CONFIG =====
const CONTEXT_OPTIONS: { key: UseContextType; label: string; desc: string; detail: string; }[] = [
  { key: 'BUSINESS', label: 'BUSINESS', desc: 'Uniforms, workwear, staff & suppliers', detail: 'Professional • CSV • Deadline' },
  { key: 'FAMILY', label: 'FAMILY', desc: 'Trip, reunion, gifts, matching shirts', detail: 'Personal • Warm • Simple' },
  { key: 'TEAM', label: 'TEAM', desc: 'Sports, crew, volunteers, clubs', detail: 'Organized • Practical' },
  { key: 'EVENT', label: 'EVENT', desc: 'Weddings, parties, retreats, gatherings', detail: 'Social • Flexible' },
  { key: 'OTHER', label: 'OTHER', desc: 'Any group needing sizes together', detail: 'General • Custom' },
];

const getCreateCopy = (ctx: UseContextType) => {
  switch(ctx){
    case 'FAMILY': return {
      title: 'CREATE A FAMILY GROUP',
      sub: "Collect your family's sizes in one place. Send one link. Everyone adds their own information.",
      nameLabel: 'GROUP NAME',
      namePh: 'Example: Rodriguez Family Trip',
      orgLabel: 'FAMILY / GROUP',
      orgPh: 'e.g. Rodriguez Family',
      showOrg: false,
      descLabel: 'OPTIONAL NOTE',
      descPh: 'Please add your shirt and shoe size.',
      fieldsHeading: 'CHOOSE WHAT TO COLLECT',
      cta: 'CREATE GROUP →',
      sideNote: 'Family trip, reunion, holiday gifts, matching shirts, vacation gear. Get everyone\'s sizes before you order.',
      hint: 'Send via WhatsApp to relatives. No corporate language.'
    };
    case 'TEAM': return {
      title: 'CREATE TEAM GROUP',
      sub: "Collect your team's sizes. One link, everyone fills their own info.",
      nameLabel: 'TEAM / GROUP NAME',
      namePh: 'e.g. Northside Football Crew',
      orgLabel: 'TEAM / ORGANIZATION',
      orgPh: 'e.g. Northside FC',
      showOrg: true,
      descLabel: 'DESCRIPTION (OPTIONAL)',
      descPh: 'What is this collection for?',
      fieldsHeading: 'CHOOSE WHAT TO COLLECT',
      cta: 'CREATE TEAM GROUP →',
      sideNote: 'Sports teams, volunteer crew, clubs, staff teams.',
      hint: 'Share with your team chat.'
    };
    case 'EVENT': return {
      title: 'CREATE EVENT GROUP',
      sub: "Collect sizes for your event. Simple link, no accounts.",
      nameLabel: 'EVENT NAME',
      namePh: 'e.g. Summer Retreat Tees',
      orgLabel: 'HOST / GROUP',
      orgPh: 'e.g. Summit Events',
      showOrg: true,
      descLabel: 'OPTIONAL NOTE',
      descPh: 'Add details for participants',
      fieldsHeading: 'CHOOSE WHAT TO COLLECT',
      cta: 'CREATE EVENT GROUP →',
      sideNote: 'Weddings, parties, retreats, family events.',
      hint: 'Send to guests and collect quickly.'
    };
    case 'OTHER': return {
      title: 'CREATE GROUP',
      sub: "Collect group sizes in one place. One link for everyone.",
      nameLabel: 'GROUP NAME',
      namePh: 'e.g. Weekend Trip Group',
      orgLabel: 'GROUP / ORGANIZATION (OPTIONAL)',
      orgPh: 'Optional',
      showOrg: true,
      descLabel: 'OPTIONAL NOTE',
      descPh: 'Any extra info for participants?',
      fieldsHeading: 'CHOOSE WHAT TO COLLECT',
      cta: 'CREATE GROUP →',
      sideNote: 'Any group needing sizes together.',
      hint: 'Flexible for any use.'
    };
    default: return {
      title: 'CREATE CAMPAIGN',
      sub: "Configure fields, generate share link, collect with confidence.",
      nameLabel: 'CAMPAIGN NAME *',
      namePh: 'e.g. Winter Staff Uniforms 2025',
      orgLabel: 'ORGANIZATION / BUSINESS *',
      orgPh: 'e.g. North Depot Logistics',
      showOrg: true,
      descLabel: 'DESCRIPTION (OPTIONAL)',
      descPh: 'What is this collection for?',
      fieldsHeading: 'INCLUDED FIELDS',
      cta: 'CREATE CAMPAIGN',
      sideNote: 'Uniforms, workwear, team clothing, promo, equipment.',
      hint: 'After create you get mw.geeskit.com/c/XXXX'
    };
  }
};

const getContextBadgeStyle = (ctx: UseContextType) => {
  switch(ctx){
    case 'BUSINESS': return 'bg-[#1A1A1E] border-[#2A2A30] text-[#C2C2CA]';
    case 'FAMILY': return 'bg-[#1E1510] border-[#FF7A18]/30 text-[#FF9A4C]';
    case 'TEAM': return 'bg-[#12151C] border-[#2A3444]/60 text-[#8AA0C2]';
    case 'EVENT': return 'bg-[#18151E] border-[#3A2E44]/60 text-[#B89AC2]';
    case 'OTHER': return 'bg-[#141414] border-[#2A2A2A] text-[#8A8A8A]';
    default: return 'bg-[#1A1A1E] border-[#2A2A30] text-[#8A8A90]';
  }
};

const simplifyLabelForFamily = (label: string) => {
  if(label === 'Full Name') return 'Name';
  if(label.includes('/')){
    const first = label.split('/')[0].trim();
    return first.replace(' Size','').trim();
  }
  if(label === 'Shirt / Top Size') return 'Shirt';
  if(label === 'Pants / Bottom Size') return 'Pants';
  return label;
};

// ===== HELPERS =====
const genId = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
const genToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = '';
  for(let i=0;i<8;i++) t+= chars[Math.floor(Math.random()*chars.length)];
  return t;
};
const slugify = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'campaign';
const fmtDate = (iso:string) => {
  if(!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
};
const fmtDateTime = (iso:string) => new Date(iso).toLocaleString('en-GB', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});

// ===== DEMO DATA =====
const makeDemoCampaigns = (): { campaigns: Campaign[], submissions: Submission[] } => {
  const now = new Date();
  const c1Fields: Field[] = [
    { id: 'f1', label: 'Full Name', type: 'text', required: true },
    { id: 'f2', label: 'Email', type: 'email', required: true },
    { id: 'f3', label: 'Shirt / Top Size', type: 'size', required: true, options: ['XS','S','M','L','XL','2XL','3XL'] },
    { id: 'f4', label: 'Pants / Bottom Size', type: 'size', required: true, options: ['28','30','32','34','36','38','40','42'] },
    { id: 'f5', label: 'Shoe Size', type: 'size', required: false, options: ['EU 36','EU 37','EU 38','EU 39','EU 40','EU 41','EU 42','EU 43','EU 44'] },
    { id: 'f6', label: 'Notes', type: 'custom', required: false },
  ];
  const c2Fields: Field[] = [
    { id: 'f1', label: 'Full Name', type: 'text', required: true },
    { id: 'f3', label: 'Jacket Size', type: 'size', required: true, options: ['S','M','L','XL','XXL'] },
    { id: 'f7', label: 'Waist', type: 'text', required: false },
    { id: 'f8', label: 'Inseam', type: 'text', required: false },
  ];
  const c3Fields: Field[] = [
    { id: 'f1', label: 'Full Name', type: 'text', required: true },
    { id: 'f3', label: 'Shirt / Top Size', type: 'size', required: true, options: ['XS','S','M','L','XL','2XL','3XL'] },
    { id: 'f4', label: 'Pants / Bottom Size', type: 'size', required: false, options: ['28','30','32','34','36','38','40'] },
    { id: 'f5', label: 'Shoe Size', type: 'size', required: false, options: ['EU 36','EU 37','EU 38','EU 39','EU 40','EU 41','EU 42','EU 43','EU 44'] },
    { id: 'f6', label: 'Notes', type: 'custom', required: false, placeholder: 'e.g. kids size' },
  ];
  const c1: Campaign = {
    id: 'camp_01',
    name: 'Winter Staff Uniforms 2025',
    organization: 'North Depot Logistics',
    description: 'Collecting sizes for winter jackets, pants and shirts. Please submit by deadline.',
    deadline: new Date(now.getTime()+ 1000*60*60*24*14).toISOString().slice(0,10),
    status: 'OPEN',
    fields: c1Fields,
    createdAt: new Date(now.getTime()- 1000*60*60*24*3).toISOString(),
    shareToken: 'NDL7X9Q2',
    context: 'BUSINESS',
  };
  const c2: Campaign = {
    id: 'camp_02',
    name: 'Event Crew Tees - Summit',
    organization: 'Summit Events Co.',
    description: 'Tees for summit crew. Quick turnaround needed.',
    deadline: '2025-09-15',
    status: 'CLOSED',
    fields: c2Fields,
    createdAt: new Date(now.getTime()- 1000*60*60*24*20).toISOString(),
    shareToken: 'SMT4K8P1',
    context: 'EVENT',
  };
  const c3: Campaign = {
    id: 'camp_03',
    name: 'Rodriguez Family Trip - Cancun 2026',
    organization: '',
    description: 'Please add your shirt and shoe size before we order matching shirts and vacation gear.',
    deadline: '',
    status: 'OPEN',
    fields: c3Fields,
    createdAt: new Date(now.getTime()- 1000*60*60*24*1).toISOString(),
    shareToken: 'RODR12AB',
    context: 'FAMILY',
  };
  const demoNames = [
    ['Alex Rivera','alex.r@northdepot.com','L','34','EU 42'],
    ['Sam Chen','sam.chen@northdepot.com','M','32','EU 41'],
    ['Jordan Blake','j.blake@northdepot.com','XL','38','EU 44'],
    ['Maya Patel','maya.p@northdepot.com','S','28','EU 37'],
    ['Chris Okonkwo','c.okonkwo@northdepot.com','L','36','EU 43'],
    ['Taylor Kim','t.kim@northdepot.com','M','30','EU 40'],
    ['Riley Morgan','riley.m@northdepot.com','2XL','40','EU 44'],
    ['Casey Wu','casey.wu@northdepot.com','M','32','EU 39'],
  ];
  const subs: Submission[] = demoNames.map(([name,email,shirt,pants,shoe],i)=>({
    id: `sub_${i+1}`,
    campaignId: 'camp_01',
    submittedAt: new Date(now.getTime()- i* 1000*60*60*5).toISOString(),
    values: { f1: name, f2: email, f3: shirt, f4: pants, f5: shoe, f6: i%3===0 ? 'Prefers regular fit' : '' },
  }));
  subs.push({
    id: 'sub_99',
    campaignId: 'camp_02',
    submittedAt: new Date(now.getTime()- 1000*60*60*24*10).toISOString(),
    values: { f1: 'Dana White', f3: 'L', f7: '32in', f8: '32in' }
  });
  const famSubs: Submission[] = [
    { id: 'fsub_1', campaignId: 'camp_03', submittedAt: new Date(now.getTime()- 1000*60*60*2).toISOString(), values: { f1: 'Carlos Rodriguez', f3: 'L', f4: '34', f5: 'EU 42', f6: '' } },
    { id: 'fsub_2', campaignId: 'camp_03', submittedAt: new Date(now.getTime()- 1000*60*60*5).toISOString(), values: { f1: 'Maria Rodriguez', f3: 'M', f4: '30', f5: 'EU 38', f6: 'Kids XL for Sofia' } },
    { id: 'fsub_3', campaignId: 'camp_03', submittedAt: new Date(now.getTime()- 1000*60*60*8).toISOString(), values: { f1: 'Sofia Rodriguez', f3: 'S', f4: '28', f5: 'EU 36', f6: '' } },
    { id: 'fsub_4', campaignId: 'camp_03', submittedAt: new Date(now.getTime()- 1000*60*60*12).toISOString(), values: { f1: 'Luis Rodriguez', f3: 'XL', f4: '36', f5: 'EU 43', f6: '' } },
    { id: 'fsub_5', campaignId: 'camp_03', submittedAt: new Date(now.getTime()- 1000*60*60*20).toISOString(), values: { f1: 'Abuela Rosa', f3: 'M', f4: '', f5: 'EU 37', f6: 'Prefers loose fit' } },
  ];
  return { campaigns: [c3,c1,c2], submissions: [...subs, ...famSubs] };
};

// ===== CSV LOGIC =====
const buildCsv = (campaign: Campaign, subs: Submission[]) => {
  const headers = ['Submitted At', ...campaign.fields.map(f=>f.label)];
  const rows = subs.map(s=>{
    const at = new Date(s.submittedAt).toISOString();
    const vals = campaign.fields.map(f=> {
      const v = s.values[f.id] || '';
      if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g,'""')}"`;
      return v;
    });
    return [at, ...vals].join(',');
  });
  return [headers.map(h=> h.includes(',')? `"${h}"`:h).join(','), ...rows].join('\n');
};
const downloadBlob = (content:string, filename:string) => {
  const blob = new Blob([content], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
};

// ===== BILLING CONFIG =====
const PLAN_LIMITS: Record<Plan, { campaigns: number; submissions: number; label: string }> = {
  FREE: { campaigns: 1, submissions: 5, label: 'FREE' },
  PRO: { campaigns: 9999, submissions: 500, label: 'PRO' },
  BUSINESS: { campaigns: 9999, submissions: 2000, label: 'BUSINESS' },
};

const PLAN_PRICING: Record<Plan, { monthly: number; yearly: number; campaigns: string; submissions: string; popular?: boolean; cta: string; desc: string }> = {
  FREE: { monthly: 0, yearly: 0, campaigns: '1 group', submissions: '5 submissions', cta: 'START FREE', desc: 'Free forever • No card' },
  PRO: { monthly: 9, yearly: 108, campaigns: 'Unlimited campaigns', submissions: '500 submissions / mo', popular: true, cta: 'UPGRADE TO PRO', desc: 'For growing teams & families' },
  BUSINESS: { monthly: 0, yearly: 0, campaigns: 'Unlimited campaigns', submissions: '500 submissions / mo', cta: 'COMING LATER', desc: 'Business plans are coming later' },
};


// ===== REAL STRIPE BILLING =====
const MW_PRO_PRICE_ID = 'price_1UHvf2CMdtEyhy9yDTNSGK30';
const startStripeCheckout = async (adminToken:string, email:string) => {
  const data = await apiJson('/billing/checkout', {method:'POST', body:JSON.stringify({email})}, adminToken);
  if(data?.url) window.location.href = data.url;
};
const fetchBillingStatus = async (adminToken?:string) => {
  if(!adminToken) return null;
  try {
    return await apiJson('/billing/status', {}, adminToken);
  } catch {
    return null;
  }
};

// ===== BACKEND API =====
const API_BASE = '/api';
const getOwnerKey = () => { try { const existing=localStorage.getItem('mw_owner_key_v1'); if(existing) return existing; const key=crypto.randomUUID(); localStorage.setItem('mw_owner_key_v1',key); return key; } catch { return ''; } };
const apiJson = async (path:string, options:RequestInit = {}, adminToken?:string) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type':'application/json', 'X-MW-Owner-Key': getOwnerKey(), ...(adminToken ? {'X-MW-Admin-Token': adminToken} : {}), ...(options.headers || {}) },
  });
  const data = await res.json().catch(()=>null);
  if(!res.ok) throw new Error(data?.error || `API request failed: ${res.status}`);
  return data;
};
const fromCampaignRow = (row:any): Campaign => ({
  id: row.id,
  name: row.name ?? '',
  organization: row.organization ?? '',
  description: row.description ?? '',
  deadline: row.deadline ?? '',
  status: row.status as CampaignStatus,
  fields: typeof row.fields_json === 'string' ? JSON.parse(row.fields_json || '[]') : (row.fields || []),
  createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  shareToken: row.share_token ?? row.shareToken ?? '',
  context: (row.context as UseContextType) || 'BUSINESS',
});
const fromSubmissionRow = (row:any): Submission => ({
  id: row.id,
  campaignId: row.campaign_id ?? row.campaignId,
  submittedAt: row.submitted_at ?? row.submittedAt ?? new Date().toISOString(),
  values: typeof row.values_json === 'string' ? JSON.parse(row.values_json || '{}') : (row.values || {}),
});

// ===== COMPONENT =====
export default function App(){
  const [view, setView] = useState<View>('landing');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [publicToken, setPublicToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [showAllSubs, setShowAllSubs] = useState(false);
  const [toast, setToast] = useState<string>('');
  const [filterCtx, setFilterCtx] = useState<'ALL' | UseContextType>('ALL');

  // BILLING STATE
  const [billing, setBilling] = useState<BillingData>({ plan: 'FREE', interval: 'monthly' });
  const [billingLoading, setBillingLoading] = useState(false);
  const [pricingInterval, setPricingInterval] = useState<BillingInterval>('monthly');
  const [upgradeTarget, setUpgradeTarget] = useState<Plan>('PRO');
  const [billingTab, setBillingTab] = useState<BillingTab>('overview');
  const [orgForm, setOrgForm] = useState({ name: '', email: '', taxId: '' });

  // CREATE FLOW STATE
  const [createStep, setCreateStep] = useState<1|2>(1);
  const [createContext, setCreateContext] = useState<UseContextType>('BUSINESS');
  const [createForm, setCreateForm] = useState({ name:'', org:'', desc:'', deadline:'' });
  const [includedFields, setIncludedFields] = useState<Field[]>([
    { id: genId(), label:'Full Name', type:'text', required:true },
    { id: genId(), label:'Shirt / Top Size', type:'size', required:true, options:['XS','S','M','L','XL','2XL','3XL'] },
  ]);

  // PUBLIC FORM STATE
  const [publicValues, setPublicValues] = useState<Record<string,string>>({});
  const [publicErrors, setPublicErrors] = useState<Record<string,string>>({});

  // LOAD / SYNC FROM CLOUDFLARE D1
  const [backendReady, setBackendReady] = useState(false);

  useEffect(()=>{
    let active = true;
    const pathMatch = window.location.pathname.match(/^\/c\/([^/]+)$/);
    if(pathMatch) {
      setPublicToken(pathMatch[1]);
      setView('public');
    }

    const load = async () => {
      let owned:Array<{id:string;adminToken:string}> = [];
      try {
        const ownedRaw = localStorage.getItem('mw_owned_campaigns_v2');
        owned = ownedRaw ? JSON.parse(ownedRaw) : [];
      } catch {}

      // Cross-device recovery: an owner link carries the existing bearer credential
      // in the URL fragment, so it is never sent to the server as a request path.
      const ownerMatch = window.location.hash.match(/^#mw-owner\/([^/]+)\/([^/]+)$/);
      if(ownerMatch){
        const recovered = {id: ownerMatch[1], adminToken: ownerMatch[2]};
        owned = [recovered, ...owned.filter(x=>x?.id!==recovered.id)];
        try { localStorage.setItem('mw_owned_campaigns_v2', JSON.stringify(owned)); } catch {}
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        setToast('OWNER LINK CONNECTED');
        setTimeout(()=>setToast(''),2200);
      }

      try {
        const details = await Promise.all(owned.filter(x=>x?.id&&x?.adminToken).map(async owner => {
          try { return await apiJson('/campaigns/'+encodeURIComponent(owner.id), {}, owner.adminToken); } catch { return null; }
        }));
        const valid = details.filter(Boolean) as any[];
        const loadedCampaigns = valid.map(d=>({ ...fromCampaignRow(d.campaign), adminToken: owned.find(x=>x.id===d.campaign.id)?.adminToken }));
        const loadedSubmissions = valid.flatMap(d=>(d.submissions||[]).map(fromSubmissionRow));
        if(active) {
          setCampaigns(loadedCampaigns);
          setSubmissions(loadedSubmissions);
          if(loadedCampaigns[0] && !pathMatch) setSelectedId(loadedCampaigns[0].id);
        }
      } catch {
        if(active) { setCampaigns([]); setSubmissions([]); }
      } finally {
        if(active) setBackendReady(true);
      }

      // Reconcile billing with Stripe after returning from hosted Checkout.
      // Check every locally owned campaign token because older MW versions
      // associate billing with the organizer credential for that campaign.
      try {
        const billingResults = await Promise.all(
          owned.filter(x=>x?.adminToken).map(x=>fetchBillingStatus(x.adminToken))
        );
        const activeBilling = billingResults.find((b:any)=>b?.plan==='PRO') || billingResults.find(Boolean);
        if(active && activeBilling?.plan){
          setBilling({
            plan: activeBilling.plan as Plan,
            interval:'monthly',
            email: activeBilling.email || undefined
          });
        }
      } catch {}
    };
    load();

    return ()=>{ active=false; };
  },[]);

  useEffect(()=>{
    if(!backendReady) return;
    try{
      localStorage.setItem('mw_campaigns_v1', JSON.stringify({campaigns, submissions}));
    }catch{}
  },[campaigns, submissions, backendReady]);

  useEffect(()=>{
    if(!publicToken) return;
    if(campaigns.some(c=>c.shareToken===publicToken)) return;
    apiJson(`/campaigns/share/${encodeURIComponent(publicToken)}`)
      .then((row:any)=>{
        const campaign=fromCampaignRow(row);
        setCampaigns(prev=>prev.some(c=>c.id===campaign.id)?prev:[campaign,...prev]);
        setSelectedId(campaign.id);
      })
      .catch(()=>{});
  },[publicToken, campaigns]);

  // DERIVED
  const selectedCampaign = campaigns.find(c=>c.id===selectedId) || campaigns[0];
  const selectedSubs = submissions.filter(s=> s.campaignId===selectedId).sort((a,b)=> +new Date(b.submittedAt)- +new Date(a.submittedAt));
  const publicCampaign = campaigns.find(c=> c.shareToken===publicToken);
  const filteredSubs = selectedSubs.filter(s=>{
    if(!search) return true;
    const nameField = selectedCampaign?.fields.find(f=> f.label.toLowerCase().includes('name'));
    const nameVal = nameField ? (s.values[nameField.id]||'') : Object.values(s.values).join(' ');
    return nameVal.toLowerCase().includes(search.toLowerCase());
  });
  const filteredCampaigns = campaigns.filter(c=> filterCtx==='ALL' ? true : c.context===filterCtx);
  const createCopy = getCreateCopy(createContext);
  const currentLimits = PLAN_LIMITS[billing.plan];
  const isFreeLimitReached = billing.plan==='FREE' && campaigns.length >= currentLimits.campaigns;
  const totalSubs = submissions.length;
  const renewalDate = useMemo(()=>{
    const d = new Date(); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,10);
  },[billing.plan]);
  const yearlyTotal = PLAN_PRICING[upgradeTarget].yearly;

  const goLanding = () => {
    setView('landing');
    setToast('MW • MEASUREMENT WALLET');
    setTimeout(()=>setToast(''),1200);
    window.scrollTo({top:0, behavior:'smooth'});
  };
  const openCreate = (ctx?: UseContextType) => {
    if(isFreeLimitReached){
      setView('limits');
      setToast('Campaign limit reached');
      setTimeout(()=>setToast(''),2500);
      return;
    }
    if(ctx) setCreateContext(ctx);
    setCreateStep(1);
    setView('create');
  };
  const handleCreateCampaign = async () => {
    const isFamily = createContext==='FAMILY';
    const isBusiness = createContext==='BUSINESS';
    if(!createForm.name.trim()){
      setToast(isFamily ? 'Group name is required' : 'Campaign name is required');
      setTimeout(()=>setToast(''),2500);
      return;
    }
    if(isBusiness && !createForm.org.trim()){
      setToast('Organization is required for business campaigns');
      setTimeout(()=>setToast(''),2500);
      return;
    }
    if(includedFields.length===0){
      setToast('Include at least one field to collect');
      setTimeout(()=>setToast(''),2500);
      return;
    }
    if(isFreeLimitReached){
      setView('limits');
      return;
    }
    const newCamp: Campaign = {
      id: genId(),
      name: createForm.name.trim(),
      organization: createForm.org.trim(),
      description: createForm.desc.trim(),
      deadline: createForm.deadline,
      status: 'OPEN',
      fields: includedFields,
      createdAt: new Date().toISOString(),
      shareToken: genToken(),
      context: createContext,
    };
    try {
      const created = await apiJson('/campaigns', { method:'POST', body:JSON.stringify({campaign:newCamp}) });
      newCamp.adminToken = created.adminToken;
      const ownedRaw = localStorage.getItem('mw_owned_campaigns_v2');
      const owned = ownedRaw ? JSON.parse(ownedRaw) : [];
      localStorage.setItem('mw_owned_campaigns_v2', JSON.stringify([{id:newCamp.id,adminToken:newCamp.adminToken}, ...owned.filter((x:any)=>x.id!==newCamp.id)]));
    } catch {
      setToast('Could not save to MW server');
      setTimeout(()=>setToast(''),2500);
      return;
    }
    setCampaigns(prev=>[newCamp, ...prev]);
    setSelectedId(newCamp.id);
    setCreateForm({name:'', org:'', desc:'', deadline:''});
    setIncludedFields([
      { id: genId(), label:'Full Name', type:'text', required:true },
      { id: genId(), label:'Shirt / Top Size', type:'size', required:true, options:['XS','S','M','L','XL','2XL','3XL'] },
    ]);
    setView('detail');
    setToast(createContext==='FAMILY' ? 'Group created' : 'Campaign created');
    setTimeout(()=>setToast(''),2000);
  };
  const toggleStatus = async (id:string) => {
    const current = campaigns.find(c=>c.id===id);
    if(!current) return;
    const updated = {...current, status: current.status==='OPEN' ? 'CLOSED' as CampaignStatus : 'OPEN' as CampaignStatus};
    try {
      await apiJson(`/campaigns/${encodeURIComponent(id)}`, { method:'PUT', body:JSON.stringify({campaign:updated}) }, current.adminToken);
      setCampaigns(prev=>prev.map(c=>c.id===id?updated:c));
    } catch {
      setToast('Could not save status');
      setTimeout(()=>setToast(''),2000);
    }
  };
  const copyLink = async (token:string) => {
    const url = `https://mw.geeskit.com/c/${token}`;
    try{ await navigator.clipboard.writeText(url); }catch{}
    setCopied(true);
    setToast('Link copied');
    setTimeout(()=>{ setCopied(false); setToast(''); },1800);
  };
  const copyOwnerLink = async (campaign:Campaign) => {
    if(!campaign.adminToken) return;
    const url = `https://mw.geeskit.com/#mw-owner/${encodeURIComponent(campaign.id)}/${encodeURIComponent(campaign.adminToken)}`;
    try{ await navigator.clipboard.writeText(url); }catch{}
    setToast('OWNER LINK COPIED • SAVE IT FOR OTHER DEVICES');
    setTimeout(()=>setToast(''),2800);
  };
  const handlePublicSubmit = async () => {
    if(!publicCampaign) return;
    const errs: Record<string,string> = {};
    publicCampaign.fields.forEach(f=>{
      if(f.required && !publicValues[f.id]?.trim()){
        errs[f.id] = 'Required';
      }
      if(f.type==='email' && publicValues[f.id]){
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicValues[f.id])) errs[f.id]='Invalid email';
      }
    });
    setPublicErrors(errs);
    if(Object.keys(errs).length>0) return;
    const newSub: Submission = {
      id: genId(),
      campaignId: publicCampaign.id,
      submittedAt: new Date().toISOString(),
      values: {...publicValues},
    };
    try {
      const saved = await apiJson(`/campaigns/share/${encodeURIComponent(publicCampaign.shareToken)}/submissions`, { method:'POST', body:JSON.stringify({submission:newSub}) });
      newSub.id = saved.id || newSub.id;
    } catch {
      setToast('Could not save submission');
      setTimeout(()=>setToast(''),2500);
      return;
    }
    setSubmissions(prev=> [newSub, ...prev]);
    setPublicValues({});
    setView('confirmed');
  };
  const doExport = (camp: Campaign) => {
    const subs = submissions.filter(s=> s.campaignId===camp.id);
    if(subs.length===0){
      setToast('No submissions to export');
      setTimeout(()=>setToast(''),2000);
      return;
    }
    const csv = buildCsv(camp, subs);
    downloadBlob(csv, `${slugify(camp.name)}-submissions.csv`);
    setToast('CSV downloaded');
    setTimeout(()=>setToast(''),2000);
  };
  const handleUpgrade = (plan: Plan) => {
    if(plan==='FREE') return;
    setUpgradeTarget(plan);
    setView('upgrade');
  };
  const handleCancelPlan = () => {
    setBilling({ plan: 'FREE', interval: 'monthly' });
    setToast('Plan cancelled • Back to FREE');
    setTimeout(()=>setToast(''),2500);
    setView('subscription');
  };

  const addTemplate = (t: TemplateDef) => {
    const exists = includedFields.some(f=> f.label===t.label);
    if(exists) return;
    setIncludedFields(prev=> [...prev, { id: genId(), label: t.label, type: t.type, required: t.requiredDefault, options: t.options, placeholder: t.placeholder }]);
  };
  const removeField = (fid:string) => setIncludedFields(prev=> prev.filter(f=> f.id!==fid));
  const toggleRequired = (fid:string) => setIncludedFields(prev=> prev.map(f=> f.id===fid ? {...f, required: !f.required}:f));
  const moveField = (fid:string, dir:-1|1) => {
    const idx = includedFields.findIndex(f=> f.id===fid);
    if(idx<0) return;
    const nIdx = idx+dir;
    if(nIdx<0 || nIdx>=includedFields.length) return;
    const arr = [...includedFields];
    const [item] = arr.splice(idx,1);
    arr.splice(nIdx,0,item);
    setIncludedFields(arr);
  };

  return (
    <div className="min-h-screen bg-[#060608] text-[#E8E8EA] selection:bg-[#FF7A18]/30 selection:text-white antialiased overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800&family=Geist+Mono:wght@400;600&display=swap');
        *{font-family: 'Geist', system-ui, -apple-system, sans-serif;}
        .mono{font-family: 'Geist Mono', monospace;}
        .faceted{ clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px)); }
        .faceted-sm{ clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px)); }
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:#222;border-radius:3px}
        input,select,textarea{font-size:16px}
      `}</style>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#060608]/90 border-b border-[#1A1A1E]">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6 h-[56px] md:h-[64px] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={()=> setView('landing')}>
            <div className="w-[36px] h-[36px] md:w-[42px] md:h-[42px] bg-black rounded-[8px] overflow-hidden border border-[#222] flex items-center justify-center">
              <img src={mwLogo} alt="MW Logo" className="w-full h-full object-contain" />
            </div>
            <div className="hidden md:block">
              <div className="leading-none text-[13px] font-[800] tracking-[0.18em]">MW</div>
              <div className="leading-none text-[10px] tracking-[0.18em] text-[#8A8A90] mono">MEASUREMENT WALLET</div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <nav className="flex items-center gap-1 bg-[#101012] border border-[#222] rounded-[10px] p-[3px] overflow-x-auto scrollbar-none max-w-[68vw] md:max-w-none">
              {[
                {k:'landing', l:'PRODUCT'},
                {k:'pricing', l:'PRICING'},
                {k:'dashboard', l:'DASHBOARD'},
                {k:'create', l:'CREATE'},
              ].map(it=>(
                <button key={it.k} onClick={()=> { if(it.k==='landing') goLanding(); else if(it.k==='create') openCreate(); else setView(it.k as View); }}
                  className={`px-3 md:px-4 h-[28px] rounded-[7px] text-[11px] font-[700] tracking-[0.12em] transition-all whitespace-nowrap ${view===it.k ? 'bg-[#FF7A18] text-black shadow-[0_0_20px_rgba(255,122,24,0.35)]' : 'text-[#8A8A90] hover:text-[#E8E8EA]'}`}>
                  {it.l}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <div className="hidden lg:flex items-center gap-2 pl-2">
                <div className={`px-2.5 h-[28px] rounded-[8px] border text-[10px] font-[800] tracking-[0.1em] flex items-center gap-1.5 ${billing.plan==='FREE' ? 'bg-[#101012] border-[#222] text-[#8A8A90]' : 'bg-[#1A120E] border-[#FF7A18]/30 text-[#FF7A18] shadow-[0_0_12px_rgba(255,122,24,0.15)]'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${billing.plan==='FREE' ? 'bg-[#5A5A66]' : 'bg-[#FF7A18] shadow-[0_0_6px_#FF7A18]'}`} />{billing.plan}
                </div>
              </div>
              <button onClick={()=> setView('billing')} className={`w-[34px] h-[34px] rounded-[9px] border flex items-center justify-center transition-colors ${view==='billing' || view==='subscription' ? 'bg-[#FF7A18] border-[#FF7A18] text-black shadow-[0_0_14px_rgba(255,122,24,0.35)]' : 'bg-[#101012] border-[#222] text-[#8A8A90] hover:text-[#E8E8EA] hover:border-[#2A2A30]'}`} title="Billing">◧</button>
              <button onClick={()=> setView('subscription')} className="md:hidden w-[34px] h-[34px] rounded-[9px] bg-[#101012] border border-[#222] flex items-center justify-center text-[11px] font-[800]">{billing.plan[0]}</button>
            </div>
          </div>
        </div>
        <div className="h-[28px] bg-[#0A0A0C] border-y border-[#141416] flex items-center overflow-hidden">
          <div className="mx-auto max-w-[1200px] w-full px-4 md:px-6 flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-none">
            {['CREATE','SHARE','COLLECT','REVIEW','EXPORT'].map((s,i)=>(
              <React.Fragment key={s}>
                <span className="text-[10px] mono tracking-[0.18em] font-[600] text-[#6A6A72] whitespace-nowrap flex items-center gap-2">
                  <span className="w-[14px] h-[14px] rounded-[3px] bg-[#101012] border border-[#222] flex items-center justify-center text-[9px] text-[#FF7A18]">{i+1}</span>
                  {s}
                </span>
                {i<4 && <span className="text-[#222]">→</span>}
              </React.Fragment>
            ))}
            <span className="ml-auto hidden md:inline text-[10px] mono text-[#3A3A44]">COLLECT GROUP SIZES WITH CONFIDENCE • BUSINESS • FAMILY • TEAM • EVENT</span>
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#101012] border border-[#FF7A18]/30 text-[#E8E8EA] px-5 py-3 rounded-[10px] text-[13px] font-[600] tracking-wide shadow-[0_10px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,122,24,0.2)] faceted-sm animate-[slideUp_0.2s_ease]">
          {toast}
        </div>
      )}

      <main className="mx-auto max-w-[1200px] px-4 md:px-6 py-6 md:py-10 overflow-x-hidden">
        {view==='landing' && (
          <div className="space-y-10 md:space-y-16">
            <div className="grid md:grid-cols-[1.15fr_0.85fr] gap-6 md:gap-10 items-center pt-2 md:pt-8">
              <div className="space-y-6 min-w-0">
                <div className="inline-flex items-center gap-2 bg-[#101012] border border-[#222] rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 bg-[#FF7A18] rounded-full shadow-[0_0_6px_#FF7A18]" />
                  <span className="text-[11px] mono tracking-[0.16em] text-[#A0A0A8]">A GEESKIT PRODUCT • GROUP SIZES • BUSINESS + FAMILY</span>
                </div>
                <div>
                  <h1 className="text-[52px] md:text-[86px] leading-[0.85] font-[800] tracking-[-0.04em] uppercase">
                    <span className="block text-white">MW</span>
                    <span className="block text-[16px] md:text-[22px] tracking-[0.22em] font-[700] text-[#FF7A18] mt-2">MEASUREMENT WALLET</span>
                  </h1>
                  <p className="mt-5 text-[20px] md:text-[28px] leading-[1.1] font-[700] tracking-[-0.02em] uppercase max-w-[22ch]">
                    COLLECT GROUP SIZES <span className="text-[#FF7A18]">WITH CONFIDENCE.</span>
                  </p>
                  <p className="mt-4 text-[14px] md:text-[15px] leading-[1.6] text-[#9A9AA3] max-w-[48ch]">
                    From teams and businesses to families and friends, MW keeps group sizes organized in one place. Replace messy WhatsApp threads, email chains and spreadsheets. One link. Every size organized.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['BUSINESS','FAMILY','TEAM','EVENT'].map(t=>(
                      <span key={t} className={`px-2.5 py-1 rounded-[6px] text-[10px] font-[800] tracking-[0.12em] border faceted-sm ${getContextBadgeStyle(t as UseContextType)}`}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={()=> openCreate()} className="h-[48px] px-7 bg-[#FF7A18] hover:bg-[#FF8A2E] text-black font-[800] tracking-[0.12em] text-[13px] rounded-[10px] faceted-sm shadow-[0_0_30px_rgba(255,122,24,0.35)] transition-colors">CREATE A GROUP →</button>
                  <button onClick={()=> { const el=document.getElementById('how'); if(el) el.scrollIntoView({behavior:'smooth'}); }} className="h-[48px] px-6 bg-[#101012] border border-[#222] hover:border-[#3A3A44] text-[#E8E8EA] font-[700] tracking-[0.12em] text-[12px] rounded-[10px] transition-colors">SEE HOW IT WORKS</button>
                </div>
                <div className="flex items-center gap-6 pt-2 text-[11px] mono flex-wrap">
                  <span className="text-[#6A6A72]">NO ACCOUNTS FOR PARTICIPANTS</span>
                  <span className="w-px h-3 bg-[#222] hidden md:block" />
                  <span className="text-[#6A6A72]">CSV EXPORT • MOBILE FIRST • WHATSAPP READY</span>
                </div>
              </div>
              <div className="relative min-w-0">
                <div className="absolute -inset-6 bg-[radial-gradient(ellipse_at_50%_50%,rgba(255,122,24,0.18),transparent_60%)] blur-[20px]" />
                <div className="relative bg-[#0B0B0D] border border-[#222] rounded-[16px] p-2 faceted overflow-hidden">
                  <div className="bg-black rounded-[12px] overflow-hidden aspect-[4/3] flex items-center justify-center relative">
                    <img src={mwLogo} alt="MW Official Logo" className="w-full h-full object-contain p-6 md:p-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-2">
                      <div className="bg-[#101012]/90 backdrop-blur border border-[#222] rounded-[8px] px-3 py-2">
                        <div className="text-[10px] mono tracking-[0.16em] text-[#FF7A18]">OFFICIAL MARK</div>
                        <div className="text-[11px] font-[700] tracking-wide">METALLIC • FACETED • GEESKIT</div>
                      </div>
                      <div className="w-[36px] h-[36px] bg-[#FF7A18] rounded-[8px] flex items-center justify-center text-black font-[800] shrink-0">MW</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      {k:'LINK', v:'mw.geeskit.com/c/XXXX'},
                      {k:'STATUS', v:'OPEN • LIVE'},
                      {k:'EXPORT', v:'CSV READY'},
                    ].map(i=>(
                      <div key={i.k} className="bg-[#101012] border border-[#222] rounded-[8px] px-3 py-2 min-w-0">
                        <div className="text-[9px] mono tracking-[0.14em] text-[#6A6A72]">{i.k}</div>
                        <div className="text-[11px] font-[600] mt-0.5 truncate">{i.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-[800] tracking-[0.18em]">START FREE • UPGRADE WHEN YOU NEED MORE</h2>
                <button onClick={()=> setView('pricing')} className="text-[11px] mono text-[#FF7A18] hover:text-[#FF8A2E]">VIEW ALL PRICING →</button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {(['FREE','PRO'] as Plan[]).map(plan=>{
                  const p = PLAN_PRICING[plan];
                  return (
                    <div key={plan} className={`bg-[#101012] border rounded-[14px] p-5 faceted-sm relative overflow-hidden ${plan==='PRO' ? 'border-[#FF7A18]/40 shadow-[0_0_24px_rgba(255,122,24,0.15)]' : 'border-[#222]'}`}>
                      {p.popular && <div className="absolute top-0 right-0 bg-[#FF7A18] text-black text-[10px] font-[800] tracking-[0.12em] px-3 py-1 rounded-bl-[8px]">POPULAR</div>}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] border ${plan==='PRO' ? 'bg-[#FF7A18] text-black border-[#FF7A18]' : 'bg-[#0A0A0C] border-[#222] text-[#8A8A90]'}`}>{plan}</span>
                        
                      </div>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-[32px] font-[800] tracking-[-0.02em]">${p.monthly}</span>
                        <span className="text-[12px] mono text-[#6A6A72]">/ month</span>
                      </div>
                      <div className="mt-1 text-[11px] mono text-[#6A6A72]">{p.campaigns} • {p.submissions}</div>
                      <button onClick={()=> plan==='FREE' ? setView('dashboard') : handleUpgrade(plan)} className={`mt-4 w-full h-[48px] rounded-[10px] text-[12px] font-[800] tracking-[0.12em] transition-colors ${plan==='PRO' ? 'bg-[#FF7A18] text-black shadow-[0_0_20px_rgba(255,122,24,0.3)]' : 'bg-[#0A0A0C] border border-[#222] text-[#C2C2CA] hover:border-[#2A2A30]'}`}>{p.cta}</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#101012] border border-[#222] rounded-[14px] p-6 md:p-7 faceted-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(255,122,24,0.12),transparent_70%)]" />
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] border ${getContextBadgeStyle('BUSINESS')}`}>BUSINESS</span>
                  <span className="text-[11px] mono text-[#5A5A66]">PROFESSIONAL • ORGANIZED GROUP</span>
                </div>
                <div className="mt-4 text-[13px] font-[700] tracking-[0.08em]">FOR TEAMS & BUSINESSES</div>
                <p className="mt-2 text-[13px] leading-[1.6] text-[#9A9AA3]">Uniforms, workwear, team clothing, events. Campaign name, organization, deadline, search, close, CSV export ready for supplier.</p>
                <div className="mt-4 flex gap-2">
                  <span className="text-[11px] mono px-2 py-1 bg-[#0A0A0C] border border-[#222] rounded-[6px]">CREATE CAMPAIGN</span>
                  <span className="text-[11px] mono text-[#6A6A72]">→ SHARE → COLLECT → EXPORT</span>
                </div>
              </div>
              <div className="bg-[#0F0F11] border border-[#FF7A18]/20 rounded-[14px] p-6 md:p-7 faceted-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[160px] h-[160px] bg-[radial-gradient(circle_at_50%_50%,rgba(255,122,24,0.18),transparent_70%)] blur-[12px]" />
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] border ${getContextBadgeStyle('FAMILY')}`}>FAMILY</span>
                  <span className="text-[11px] mono text-[#6A6A66]">PERSONAL • WARM • SIMPLE</span>
                </div>
                <div className="mt-4 text-[13px] font-[700] tracking-[0.08em]">FOR FAMILIES & FRIENDS</div>
                <p className="mt-2 text-[13px] leading-[1.6] text-[#C2C2CA] relative">Collect your family's sizes in one place. Family trip, reunion, holiday gifts, matching shirts, vacation gear. Send one link. Everyone adds their own information.</p>
                <div className="mt-4 flex gap-2 items-center">
                  <span className="text-[11px] mono px-2 py-1 bg-[#1A1510] border border-[#2A1E14] rounded-[6px] text-[#FF9A4C]">CREATE GROUP</span>
                  <span className="text-[11px] mono text-[#8A7A72]">Get everyone's sizes before you order.</span>
                </div>
              </div>
            </div>

            <div id="how" className="bg-[#0A0A0C] border border-[#18181C] rounded-[16px] faceted overflow-hidden">
              <div className="px-6 md:px-8 py-6 border-b border-[#18181C] flex items-center justify-between">
                <h2 className="text-[13px] font-[800] tracking-[0.18em]">WORKFLOW • CREATE → SHARE → COLLECT → EXPORT</h2>
                <span className="hidden md:inline text-[11px] mono text-[#5A5A66]">GROUP → PEOPLE → SIZES → LINK → COLLECTION → REVIEW → EXPORT</span>
              </div>
              <div className="grid md:grid-cols-4 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#18181C]">
                {[
                  {n:'01', t:'CREATE', d:'Choose context: Business, Family, Team, Event. Name group, optional note, choose what to collect: shirt, pants, jacket, shoe, waist, inseam.'},
                  {n:'02', t:'SHARE', d:'Get unique link mw.geeskit.com/c/XXXX. Copy, share via WhatsApp, email, Slack. No login needed for participants.'},
                  {n:'03', t:'COLLECT', d:'Participants open link on phone, fill large touch-friendly form. Family sees warm personal wording. Required fields enforced.'},
                  {n:'04', t:'EXPORT', d:'Review submissions live, search by name, close group when done. Export CSV ready for ordering or sharing.'},
                ].map(s=>(
                  <div key={s.n} className="p-6 md:p-7 space-y-3 group hover:bg-[#0E0E10] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-[32px] h-[32px] rounded-[8px] bg-[#FF7A18] text-black font-[800] text-[13px] flex items-center justify-center faceted-sm">{s.n}</div>
                      <div className="text-[14px] font-[800] tracking-[0.12em]">{s.t}</div>
                    </div>
                    <p className="text-[13px] leading-[1.6] text-[#9A9AA3]">{s.d}</p>
                    <div className="h-px w-full bg-gradient-to-r from-[#FF7A18]/50 to-transparent mt-3" />
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center py-4 border-t border-[#141416]">
              <span className="text-[11px] mono tracking-[0.22em] text-[#4A4A52]">A GEESKIT PRODUCT • MW WORKS FOR BUSINESS, FAMILY, TEAM & EVENT • SAME STRUCTURE, ADAPTIVE LANGUAGE</span>
            </div>
          </div>
        )}

        {view==='pricing' && (
          <div className="space-y-8 max-w-[1100px] mx-auto">
            <div className="text-center space-y-4 pt-2">
              <div className="inline-flex items-center gap-2 bg-[#101012] border border-[#222] rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 bg-[#FF7A18] rounded-full shadow-[0_0_6px_#FF7A18]" />
                <span className="text-[11px] mono tracking-[0.16em] text-[#A0A0A8]">BILLING • STRIPE • HOSTED CHECKOUT</span>
              </div>
              <h1 className="text-[28px] md:text-[44px] font-[800] tracking-[-0.03em] uppercase leading-[0.95]">CHOOSE YOUR PLAN</h1>
              <p className="text-[14px] text-[#8A8A90] max-w-[48ch] mx-auto leading-[1.6]">Start free. Upgrade when you need unlimited campaigns and more submissions. All plans include WhatsApp-ready links, mobile-first forms, CSV export.</p>
              <div className="flex justify-center pt-2">
                <div className="bg-[#101012] border border-[#222] rounded-[12px] p-1 flex gap-1">
                  {(['monthly','yearly'] as BillingInterval[]).map(i=>(
                    <button key={i} onClick={()=> setPricingInterval(i)} className={`h-[36px] px-6 rounded-[9px] text-[12px] font-[800] tracking-[0.12em] transition-all ${pricingInterval===i ? 'bg-[#FF7A18] text-black shadow-[0_0_14px_rgba(255,122,24,0.3)]' : 'text-[#8A8A90] hover:text-[#E8E8EA]'}`}>
                      {i.toUpperCase()} {i==='yearly' && <span className="ml-1 text-[10px] bg-[#1A1A1E] px-1.5 py-0.5 rounded-[4px] text-[#FF7A18]">SAVE 20%</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {(['FREE','PRO'] as Plan[]).map(plan=>{
                const p = PLAN_PRICING[plan];
                const price = pricingInterval==='monthly' ? p.monthly : Math.round(p.yearly/12);
                const isPopular = p.popular;
                const isCurrent = billing.plan===plan;
                return (
                  <div key={plan} className={`relative bg-[#101012] border rounded-[16px] p-6 md:p-7 faceted flex flex-col ${isPopular ? 'border-[#FF7A18]/50 shadow-[0_0_30px_rgba(255,122,24,0.18)] md:-mt-2 md:mb-2' : 'border-[#222]'}`}>
                    {isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF7A18] text-black text-[10px] font-[800] tracking-[0.14em] px-4 h-[22px] rounded-full flex items-center shadow-[0_0_20px_rgba(255,122,24,0.4)]">POPULAR • MOST CHOSEN</div>}
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-[6px] text-[11px] font-[800] tracking-[0.12em] border ${plan==='PRO' ? 'bg-[#FF7A18] text-black border-[#FF7A18]' : 'bg-[#0A0A0C] border-[#222] text-[#C2C2CA]'}`}>{plan}</span>
                      {isCurrent && <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-[800] bg-[#0F1F0F] border border-[#1E3A1E] text-[#5CFF7A]">ACTIVE • {billing.plan}</span>}
                    </div>
                    <div className="mt-5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[40px] font-[800] tracking-[-0.03em]">${price}</span>
                        <span className="text-[13px] mono text-[#6A6A72]">/ month</span>
                      </div>
                      {pricingInterval==='yearly' && plan!=='FREE' && <div className="text-[11px] mono text-[#8A8A90]">Billed ${p.yearly} yearly • Save ${(p.monthly*12)-p.yearly}</div>}
                      {plan==='FREE' && <div className="text-[11px] mono text-[#6A6A72]">Free forever • No card</div>}
                    </div>
                    <div className="mt-5 space-y-2.5 text-[13px] leading-[1.5]">
                      <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span className="text-[#C2C2CA]">{PLAN_LIMITS[plan].campaigns===9999 ? 'Unlimited campaigns' : `${PLAN_LIMITS[plan].campaigns} campaigns`}</span></div>
                      <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span className="text-[#C2C2CA]">{PLAN_LIMITS[plan].submissions} submissions {plan==='FREE' ? ' total' : '/ month'}</span></div>
                      <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span className="text-[#9A9AA3]">WhatsApp-ready share links</span></div>
                      <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span className="text-[#9A9AA3]">Mobile-first forms • CSV export</span></div>
                      {plan!=='FREE' && <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span className="text-[#9A9AA3]">Priority support • Team features</span></div>}
                      {plan==='BUSINESS' && <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span className="text-[#9A9AA3]">2000 subs • Organization billing</span></div>}
                    </div>
                    <div className="mt-6">
                      <button onClick={()=> plan==='FREE' ? setView('dashboard') : handleUpgrade(plan)} disabled={false} className={`w-full h-[48px] rounded-[10px] text-[12px] font-[800] tracking-[0.12em] transition-all ${isCurrent ? 'bg-[#1A1A1E] border border-[#222] text-[#5A5A66]' : plan==='PRO' ? 'bg-[#FF7A18] text-black shadow-[0_0_24px_rgba(255,122,24,0.35)] hover:bg-[#FF8A2E]' : 'bg-[#0A0A0C] border border-[#222] text-[#E8E8EA] hover:border-[#2A2A30]'}`}>{p.cta}</button>
                      <div className="mt-3 text-center text-[10px] mono text-[#5A5A66]">{p.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block bg-[#0A0A0C] border border-[#222] rounded-[16px] faceted overflow-hidden">
              <div className="px-7 py-5 border-b border-[#1A1A1E] flex items-center justify-between">
                <div className="text-[12px] font-[800] tracking-[0.16em]">FEATURE COMPARISON</div>
                <div className="text-[11px] mono text-[#5A5A66]">TABLE → CARDS ON MOBILE</div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#101012] border-b border-[#1A1A1E]">
                  <tr>
                    <th className="px-7 py-4 text-[11px] font-[700] tracking-[0.12em] text-[#6A6A72]">FEATURE</th>
                    <th className="px-7 py-4 text-[11px] font-[700] tracking-[0.12em] text-[#6A6A72]">FREE</th>
                    <th className="px-7 py-4 text-[11px] font-[700] tracking-[0.12em] text-[#FF7A18]">PRO • POPULAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#141416] text-[13px]">
                  {[
                    ['Campaigns', '2', 'Unlimited'],
                    ['Submissions', '25 total', '500 / month'],
                    ['Share Links', '✓', '✓'],
                    ['CSV Export', '✓', '✓'],
                    ['WhatsApp Ready', '✓', '✓'],
                    ['Organization Billing', '—', '—'],
                    ['Priority Support', '—', '✓'],
                  ].map(row=>(
                    <tr key={row[0]} className="hover:bg-[#101012]/50">
                      <td className="px-7 py-3.5 font-[600] text-[#C2C2CA]">{row[0]}</td>
                      <td className="px-7 py-3.5 text-[#8A8A90]">{row[1]}</td>
                      <td className="px-7 py-3.5 text-[#E8E8EA] font-[600]">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden grid gap-3">
              {[
                {feat:'Campaigns', free:'2', pro:'Unlimited'},
                {feat:'Submissions', free:'25 total', pro:'500 / mo'},
                {feat:'CSV Export & WhatsApp', free:'✓ Included', pro:'✓ Included'},
              ].map(r=>(
                <div key={r.feat} className="bg-[#101012] border border-[#222] rounded-[12px] p-4">
                  <div className="text-[11px] font-[800] tracking-[0.12em]">{r.feat}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] mono">
                    <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[8px] p-2"><div className="text-[#6A6A72]">FREE</div><div className="mt-1 font-[700] text-[#C2C2CA]">{r.free}</div></div>
                    <div className="bg-[#1A120E] border border-[#FF7A18]/20 rounded-[8px] p-2"><div className="text-[#FF7A18]">PRO</div><div className="mt-1 font-[700] text-[#E8E8EA]">{r.pro}</div></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button onClick={()=> setView('landing')} className="h-[48px] px-6 bg-[#101012] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em]">← BACK TO PRODUCT</button>
            </div>
          </div>
        )}

        {view==='upgrade' && (
          <div className="max-w-[900px] mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={()=> setView('pricing')} className="w-[36px] h-[36px] bg-[#101012] border border-[#222] rounded-[8px] flex items-center justify-center">←</button>
              <div>
                <h1 className="text-[20px] md:text-[24px] font-[800] tracking-[-0.01em] uppercase">UPGRADE TO {upgradeTarget}</h1>
                <p className="text-[11px] mono text-[#8A8A90]">PLAN SUMMARY • ORDER • FRONTEND ONLY</p>
              </div>
            </div>
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="bg-[#101012] border border-[#222] rounded-[16px] p-6 md:p-7 faceted-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-[48px] h-[48px] bg-black border border-[#222] rounded-[10px] overflow-hidden"><img src={mwLogo} alt="MW" className="w-full h-full object-contain p-1" /></div>
                  <div>
                    <div className="text-[11px] font-[800] tracking-[0.14em] text-[#FF7A18]">PLAN SUMMARY</div>
                    <div className="text-[16px] font-[700]">{upgradeTarget} PLAN • {pricingInterval.toUpperCase()}</div>
                  </div>
                  <span className="ml-auto px-2.5 py-1 rounded-[6px] bg-[#FF7A18] text-black text-[10px] font-[800] tracking-[0.12em]">POPULAR</span>
                </div>
                <div className="space-y-3">
                  {[
                    {l:'Campaigns', v: PLAN_LIMITS[upgradeTarget].campaigns===9999 ? 'Unlimited' : `${PLAN_LIMITS[upgradeTarget].campaigns}`},
                    {l:'Submissions', v: `${PLAN_LIMITS[upgradeTarget].submissions} / month`},
                    {l:'Billing', v: pricingInterval==='monthly' ? 'Monthly' : 'Yearly • Save 20%'},
                    {l:'Support', v: 'Priority • Email + Chat'},
                  ].map(r=>(
                    <div key={r.l} className="flex justify-between py-2.5 border-b border-[#1A1A1E] last:border-0">
                      <span className="text-[12px] text-[#8A8A90] mono">{r.l.toUpperCase()}</span>
                      <span className="text-[13px] font-[600]">{r.v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] p-4 flex gap-2">
                  <span className="text-[#FF7A18]">✓</span>
                  <span className="text-[12px] leading-[1.5] text-[#9A9AA3]">You currently have <span className="text-[#E8E8EA] font-[700]">{campaigns.length} campaigns</span> and <span className="text-[#E8E8EA] font-[700]">{totalSubs} submissions</span>. {upgradeTarget} unlocks unlimited campaigns and {PLAN_LIMITS[upgradeTarget].submissions} submissions per month.</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-[#101012] border border-[#222] rounded-[16px] p-6 faceted-sm">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">ORDER SUMMARY</div>
                  <div className="mt-5 space-y-3">
                    <div className="flex justify-between text-[13px]"><span className="text-[#8A8A90]">{upgradeTarget} • {pricingInterval}</span><span className="font-[700]">${pricingInterval==='monthly' ? PLAN_PRICING[upgradeTarget].monthly : yearlyTotal} {pricingInterval==='yearly' ? '/ year' : '/ month'}</span></div>
                    <div className="flex justify-between text-[12px] text-[#6A6A72]"><span>Subtotal</span><span>${pricingInterval==='monthly' ? PLAN_PRICING[upgradeTarget].monthly : yearlyTotal}.00</span></div>
                    <div className="flex justify-between text-[12px] text-[#6A6A72]"><span>Tax (mock)</span><span>$0.00</span></div>
                    <div className="h-px bg-[#1A1A1E]" />
                    <div className="flex justify-between text-[15px] font-[800]"><span>TOTAL</span><span className="text-[#FF7A18]">${pricingInterval==='monthly' ? PLAN_PRICING[upgradeTarget].monthly : yearlyTotal}.00</span></div>
                  </div>
                  <button disabled={billingLoading || !selectedCampaign?.adminToken} onClick={async()=>{
                    if(!selectedCampaign?.adminToken){ setToast('Open an owned group first'); setTimeout(()=>setToast(''),2200); return; }
                    try{
                      setBillingLoading(true);
                      await startStripeCheckout(selectedCampaign.adminToken, billing.email || '');
                    }catch(e:any){
                      setToast(e?.message || 'Unable to start checkout');
                      setTimeout(()=>setToast(''),2500);
                    }finally{ setBillingLoading(false); }
                  }} className="mt-6 w-full h-[48px] bg-[#FF7A18] hover:bg-[#FF8A2E] disabled:opacity-40 disabled:cursor-not-allowed text-black font-[800] tracking-[0.12em] text-[12px] rounded-[10px] shadow-[0_0_24px_rgba(255,122,24,0.3)]">{billingLoading ? 'OPENING STRIPE CHECKOUT…' : 'CONTINUE TO STRIPE →'}</button>
                  <div className="mt-3 text-center text-[10px] mono text-[#5A5A66]">SECURE HOSTED CHECKOUT • STRIPE • $9/MONTH</div>
                  <div className="mt-4 flex gap-2 justify-center text-[10px] mono text-[#3A3A44]">
                    <span className="px-2 py-1 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[5px]">STRIPE • HOSTED</span>
                    <span className="px-2 py-1 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[5px]">SECURE • NO CARD STORED HERE</span>
                  </div>
                </div>
                <button onClick={()=> setView('pricing')} className="w-full h-[48px] bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] text-[11px] mono text-[#6A6A72]">← BACK TO PRICING</button>
              </div>
            </div>
          </div>
        )}


        {view==='payment-success' && (
          <div className="max-w-[560px] mx-auto pt-6 md:pt-10">
            <div className="bg-[#101012] border border-[#222] rounded-[16px] p-8 md:p-10 text-center faceted">
              <div className="relative w-[84px] h-[84px] mx-auto">
                <div className="absolute -inset-3 bg-[radial-gradient(circle,rgba(255,122,24,0.35),transparent_70%)] blur-[12px]" />
                <div className="relative w-[84px] h-[84px] rounded-[20px] bg-[#1A120E] border border-[#FF7A18]/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,122,24,0.25)]">
                  <div className="w-[48px] h-[48px] rounded-full bg-[#FF7A18] flex items-center justify-center text-black font-[800] text-[26px] shadow-[0_0_20px_rgba(255,122,24,0.5)]">✓</div>
                </div>
              </div>
              <h1 className="mt-8 text-[22px] md:text-[28px] font-[800] tracking-[0.08em] uppercase">PAYMENT SUCCESSFUL</h1>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#9A9AA3]">Your <span className="text-[#FF7A18] font-[700]">{billing.plan}</span> plan is now active. Stripe confirms your subscription.</p>
              <div className="mt-6 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[12px] p-4 text-left">
                <div className="flex justify-between text-[12px]"><span className="text-[#6A6A72] mono">PLAN</span><span className="font-[700]">{billing.plan} • {billing.interval?.toUpperCase()}</span></div>
                <div className="flex justify-between text-[12px] mt-2"><span className="text-[#6A6A72] mono">AMOUNT</span><span className="font-[700] text-[#FF7A18]">${billing.plan==='PRO' ? '9.00' : '0.00'} • {billing.plan==='PRO' ? 'ACTIVE' : 'FREE'}</span></div>
                <div className="flex justify-between text-[12px] mt-2"><span className="text-[#6A6A72] mono">INVOICE</span><span className="font-[600] mono">STRIPE SUBSCRIPTION</span></div>
              </div>
              <button onClick={()=> setView('dashboard')} className="mt-8 w-full h-[48px] bg-[#FF7A18] hover:bg-[#FF8A2E] text-black font-[800] tracking-[0.12em] text-[13px] rounded-[10px] shadow-[0_0_24px_rgba(255,122,24,0.35)]">GO TO DASHBOARD →</button>
              <div className="mt-4 flex gap-2 justify-center">
                <button onClick={()=> setView('billing')} className="h-[40px] px-5 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] text-[11px] mono text-[#8A8A90]">VIEW BILLING</button>
                <button onClick={()=> setView('subscription')} className="h-[40px] px-5 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] text-[11px] mono text-[#8A8A90]">MANAGE SUBSCRIPTION</button>
              </div>
              <div className="mt-8 pt-6 border-t border-[#1A1A1E] flex items-center justify-center gap-2">
                <div className="w-[28px] h-[28px] bg-black border border-[#222] rounded-[6px] overflow-hidden"><img src={mwLogo} alt="MW" className="w-full h-full object-contain" /></div>
                <span className="text-[10px] mono tracking-[0.16em] text-[#5A5A66]">MW • MEASUREMENT WALLET • PAYMENT SUCCESS</span>
              </div>
            </div>
          </div>
        )}

        {view==='subscription' && (
          <div className="max-w-[900px] mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={()=> setView('dashboard')} className="w-[36px] h-[36px] bg-[#101012] border border-[#222] rounded-[8px] flex items-center justify-center">←</button>
              <div>
                <h1 className="text-[20px] md:text-[24px] font-[800] tracking-[-0.01em] uppercase">SUBSCRIPTION</h1>
                <p className="text-[11px] mono text-[#8A8A90]">MANAGE PLAN • USAGE • CANCEL → FREE</p>
              </div>
            </div>
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="space-y-4">
                <div className="bg-[#101012] border border-[#222] rounded-[16px] p-6 md:p-7 faceted-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(255,122,24,0.14),transparent_70%)]" />
                  <div className="relative flex items-center gap-3">
                    <div className="w-[44px] h-[44px] bg-black border border-[#222] rounded-[10px] overflow-hidden"><img src={mwLogo} alt="MW" className="w-full h-full object-contain p-1" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-[6px] text-[11px] font-[800] tracking-[0.12em] border ${billing.plan==='FREE' ? 'bg-[#0A0A0C] border-[#222] text-[#8A8A90]' : 'bg-[#FF7A18] text-black border-[#FF7A18] shadow-[0_0_12px_rgba(255,122,24,0.3)]'}`}>{billing.plan}</span>
                        <span className="px-2 py-0.5 rounded-[5px] text-[10px] font-[800] bg-[#0F1F0F] border border-[#1E3A1E] text-[#5CFF7A] tracking-[0.1em]">ACTIVE</span>
                      </div>
                      <div className="mt-1 text-[13px] font-[600]">Renews {fmtDate(renewalDate)} • {billing.interval?.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="relative mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-[11px] mono"><span className="text-[#6A6A72]">CAMPAIGNS USAGE</span><span className="text-[#C2C2CA]">{campaigns.length} / {currentLimits.campaigns===9999 ? '∞' : currentLimits.campaigns}</span></div>
                      <div className="mt-2 h-[8px] bg-[#0A0A0C] border border-[#1A1A1E] rounded-full overflow-hidden"><div className="h-full bg-[#FF7A18] shadow-[0_0_8px_#FF7A18]" style={{width: `${Math.min(100, (campaigns.length / (currentLimits.campaigns===9999 ? 10 : currentLimits.campaigns))*100)}%`}} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mono"><span className="text-[#6A6A72]">SUBMISSIONS USAGE</span><span className="text-[#C2C2CA]">{totalSubs} / {currentLimits.submissions}</span></div>
                      <div className="mt-2 h-[8px] bg-[#0A0A0C] border border-[#1A1A1E] rounded-full overflow-hidden"><div className="h-full bg-[#FF7A18] shadow-[0_0_8px_#FF7A18]" style={{width: `${Math.min(100, (totalSubs / currentLimits.submissions)*100)}%`}} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] p-3"><div className="text-[10px] mono text-[#6A6A72]">CURRENT PLAN</div><div className="text-[13px] font-[700] mt-1">{billing.plan} • ${billing.plan==='FREE' ? '0' : billing.plan==='PRO' ? '19' : '49'}/mo</div></div>
                      <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] p-3"><div className="text-[10px] mono text-[#6A6A72]">BILLING EMAIL</div><div className="text-[12px] font-[600] mt-1 truncate">{billing.email || billing.email || ''}</div></div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#0A0A0C] border border-[#222] rounded-[14px] p-5">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">PLAN DETAILS</div>
                  <div className="mt-3 text-[12px] leading-[1.6] text-[#8A8A90]">MW uses secure hosted Stripe Checkout. Your card details are entered on Stripe, not stored by MW.</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-[#101012] border border-[#222] rounded-[16px] p-6 faceted-sm space-y-3">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">ACTIONS</div>
                  <button onClick={()=> setView('pricing')} className="w-full h-[48px] bg-[#FF7A18] text-black font-[800] tracking-[0.12em] text-[12px] rounded-[10px] shadow-[0_0_20px_rgba(255,122,24,0.25)]">CHANGE PLAN →</button>
                  <button onClick={()=> setView('billing')} className="w-full h-[48px] bg-[#0A0A0C] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em]">VIEW BILLING • INVOICES</button>
                  {billing.plan!=='FREE' && <button onClick={handleCancelPlan} className="w-full h-[48px] bg-[#1A0A0A] border border-[#3A1A1A] text-[#FF5A5A] rounded-[10px] text-[12px] font-[700] tracking-[0.12em] hover:bg-[#2A1010]">CANCEL PLAN • BACK TO FREE</button>}
                  <div className="text-[10px] mono text-[#5A5A66] text-center pt-2">Cancellation is managed through Stripe</div>
                </div>
                <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">USAGE BREAKDOWN</div>
                  <div className="mt-4 space-y-2.5">
                    {filteredCampaigns.slice(0,4).map(c=>{
                      const count = submissions.filter(s=> s.campaignId===c.id).length;
                      return (
                        <div key={c.id} className="flex items-center justify-between bg-[#0A0A0C] border border-[#1A1A1E] rounded-[8px] px-3 py-2.5">
                          <div className="truncate text-[12px] font-[600] max-w-[14ch]">{c.name}</div>
                          <div className="text-[11px] mono text-[#8A8A90]">{count} subs</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view==='billing' && (
          <div className="max-w-[1000px] mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={()=> setView('dashboard')} className="w-[36px] h-[36px] bg-[#101012] border border-[#222] rounded-[8px] flex items-center justify-center">←</button>
              <div className="flex-1 min-w-0">
                <h1 className="text-[20px] md:text-[24px] font-[800] tracking-[-0.01em] uppercase">BILLING</h1>
                <p className="text-[11px] mono text-[#8A8A90] truncate">TABS • Overview • Invoices • Payment Methods • Organization</p>
              </div>
              <div className={`hidden md:flex px-3 h-[32px] rounded-[8px] border items-center gap-2 text-[11px] font-[800] tracking-[0.1em] ${billing.plan==='FREE' ? 'bg-[#101012] border-[#222] text-[#8A8A90]' : 'bg-[#1A120E] border-[#FF7A18]/30 text-[#FF7A18]'}`}><span className={`w-1.5 h-1.5 rounded-full ${billing.plan==='FREE' ? 'bg-[#5A5A66]' : 'bg-[#FF7A18] shadow-[0_0_6px_#FF7A18]'}`} />{billing.plan} • ACTIVE</div>
            </div>

            <div className="flex gap-1 bg-[#101012] border border-[#222] rounded-[12px] p-1 overflow-x-auto scrollbar-none">
              {[
                {k:'overview', l:'OVERVIEW'},
                {k:'invoices', l:'INVOICES'},
                {k:'methods', l:'PAYMENT METHODS'},
                {k:'org', l:'ORGANIZATION'},
              ].map(t=>(
                <button key={t.k} onClick={()=> setBillingTab(t.k as BillingTab)} className={`h-[36px] px-4 rounded-[9px] text-[11px] font-[700] tracking-[0.1em] whitespace-nowrap transition-all ${billingTab===t.k ? 'bg-[#FF7A18] text-black shadow-[0_0_12px_rgba(255,122,24,0.25)]' : 'text-[#8A8A90] hover:text-[#E8E8EA]'}`}>{t.l}</button>
              ))}
            </div>

            {billingTab==='overview' && (
              <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="space-y-4">
                  <div className="bg-[#101012] border border-[#222] rounded-[16px] p-6 faceted-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-[800] tracking-[0.14em]">CURRENT PLAN</div>
                      <span className="text-[10px] mono px-2 py-1 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[6px] text-[#6A6A72]">STRIPE BILLING • {billing.plan}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="w-[48px] h-[48px] bg-[#FF7A18] rounded-[10px] flex items-center justify-center text-black font-[800] text-[18px] shadow-[0_0_20px_rgba(255,122,24,0.3)]">{billing.plan[0]}</div>
                      <div>
                        <div className="text-[18px] font-[800] tracking-[-0.01em]">{billing.plan} PLAN • {billing.interval?.toUpperCase()}</div>
                        <div className="text-[12px] mono text-[#8A8A90]">Stripe subscription • {billing.email || 'billing email'}</div>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] p-4"><div className="text-[10px] mono text-[#6A6A72]">CAMPAIGNS</div><div className="mt-1 text-[20px] font-[800]">{campaigns.length} / {currentLimits.campaigns===9999 ? '∞' : currentLimits.campaigns}</div><div className="mt-2 h-[6px] bg-[#101012] rounded-full overflow-hidden"><div className="h-full bg-[#FF7A18]" style={{width: `${Math.min(100, (campaigns.length / (currentLimits.campaigns===9999 ? 10 : currentLimits.campaigns))*100)}%`}} /></div></div>
                      <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] p-4"><div className="text-[10px] mono text-[#6A6A72]">SUBMISSIONS</div><div className="mt-1 text-[20px] font-[800]">{totalSubs} / {currentLimits.submissions}</div><div className="mt-2 h-[6px] bg-[#101012] rounded-full overflow-hidden"><div className="h-full bg-[#FF7A18]" style={{width: `${Math.min(100, (totalSubs / currentLimits.submissions)*100)}%`}} /></div></div>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <button onClick={()=> setView('pricing')} className="flex-1 h-[48px] bg-[#FF7A18] text-black font-[800] tracking-[0.12em] text-[12px] rounded-[10px]">CHANGE PLAN</button>
                      <button onClick={()=> setView('subscription')} className="flex-1 h-[48px] bg-[#0A0A0C] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em]">MANAGE SUBSCRIPTION</button>
                    </div>
                  </div>
                  {isFreeLimitReached && (
                    <div className="bg-[#1A0A00] border border-[#FF7A18]/30 rounded-[12px] p-4 flex gap-3">
                      <div className="w-[32px] h-[32px] bg-[#FF7A18]/20 border border-[#FF7A18]/30 rounded-[8px] flex items-center justify-center text-[#FF7A18] font-[800] text-[14px]">!</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-[800] tracking-[0.12em] text-[#FF7A18]">CAMPAIGN LIMIT REACHED • {campaigns.length}/{currentLimits.campaigns}</div>
                        <div className="text-[12px] leading-[1.5] text-[#C2A080] mt-1">You’ve reached the FREE plan limit. Upgrade to PRO for unlimited campaigns and 500 submissions per month.</div>
                        <button onClick={()=> handleUpgrade('PRO')} className="mt-3 h-[36px] px-4 bg-[#FF7A18] text-black rounded-[8px] text-[11px] font-[800] tracking-[0.1em]">UPGRADE TO PRO →</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5">
                    <div className="text-[11px] font-[800] tracking-[0.14em]">QUICK STATS</div>
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-[12px]"><span className="text-[#6A6A72] mono">PLAN</span><span className="font-[700]">{billing.plan}</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-[#6A6A72] mono">STORAGE</span><span>mw_billing_v1</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-[#6A6A72] mono">DEFAULT</span><span>FREE</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-[#6A6A72] mono">INVOICES</span><span>Stripe-managed</span></div>
                    </div>
                  </div>
                  <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[14px] p-5">
                    <div className="text-[11px] font-[800] tracking-[0.14em] text-[#FF7A18]">STRIPE HOSTED</div>
                    <div className="mt-2 text-[11px] leading-[1.6] text-[#6A6A72]">Stripe handles checkout, payment methods, invoices and subscription management. Your card details are entered directly on Stripe.</div>
                  </div>
                </div>
              </div>
            )}

            {billingTab==='invoices' && (
              <div className="max-w-[700px] space-y-4">
                <div className="bg-[#101012] border border-[#222] rounded-[16px] p-6 faceted-sm">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">INVOICES • STRIPE MANAGED</div>
                  <div className="mt-3 text-[12px] leading-[1.7] text-[#8A8A90]">
                    MW does not create or display local invoice records. Your subscription, invoices and payment history are managed securely by Stripe.
                  </div>
                  <div className="mt-5 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[12px] p-4">
                    <div className="text-[10px] mono text-[#6A6A72]">PAYMENT HISTORY</div>
                    <div className="mt-1 text-[13px] font-[700]">Available through Stripe</div>
                  </div>
                </div>
              </div>
            )}

            {billingTab==='methods' && (
              <div className="max-w-[600px] space-y-4">
                <div className="bg-[#101012] border border-[#222] rounded-[16px] p-6 faceted-sm">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">PAYMENT METHODS • STRIPE</div>
                  <div className="mt-5 bg-[#0A0A0C] border border-[#222] rounded-[12px] p-4 flex items-center gap-4">
                    <div className="w-[48px] h-[32px] bg-gradient-to-br from-[#1A1A1E] to-[#0A0A0C] border border-[#222] rounded-[6px] flex items-center justify-center text-[10px] font-[800] tracking-[0.1em]">VISA</div>
                    <div className="flex-1">
                      <div className="text-[13px] font-[700]">Stripe • Payment method managed securely by Stripe</div>
                      <div className="text-[11px] mono text-[#6A6A72]">Card details are never stored by MW</div>
                    </div>
                    <span className="px-2 py-1 rounded-[6px] bg-[#0F1F0F] border border-[#1E3A1E] text-[10px] font-[800] text-[#5CFF7A]">DEFAULT</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] p-3"><div className="text-[10px] mono text-[#6A6A72]">CARDHOLDER</div><div className="text-[12px] font-[600] mt-1">{billing.email || 'Stripe customer'}</div></div>
                    <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] p-3"><div className="text-[10px] mono text-[#6A6A72]">BILLING EMAIL</div><div className="text-[12px] font-[600] mt-1 truncate">{billing.email || billing.email || ''}</div></div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button onClick={async()=>{try{const d=await apiJson('/billing/portal',{method:'POST'},selectedCampaign?.adminToken);if(d?.url) window.location.href=d.url;}catch{}}} className="flex-1 h-[48px] bg-[#101012] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em]">MANAGE BILLING IN STRIPE</button>
                  </div>
                  <div className="mt-3 text-[10px] mono text-[#5A5A66] text-center">Stripe handles payment details securely. MW does not store card data.</div>
                </div>
              </div>
            )}

            {billingTab==='org' && (
              <div className="max-w-[600px] space-y-4">
                <div className="bg-[#101012] border border-[#222] rounded-[16px] p-6 faceted-sm space-y-4">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">ORGANIZATION • BILLING PROFILE</div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-[700] tracking-[0.12em] text-[#C2C2CA]">ORGANIZATION NAME</label>
                      <input value={orgForm.name} onChange={e=> setOrgForm({...orgForm, name:e.target.value})} className="mt-2 w-full h-[52px] bg-[#060608] border border-[#222] rounded-[10px] px-4 text-[16px] focus:outline-none focus:border-[#FF7A18]/50" />
                    </div>
                    <div>
                      <label className="text-[11px] font-[700] tracking-[0.12em] text-[#C2C2CA]">BILLING EMAIL</label>
                      <input value={orgForm.email} onChange={e=> setOrgForm({...orgForm, email:e.target.value})} className="mt-2 w-full h-[52px] bg-[#060608] border border-[#222] rounded-[10px] px-4 text-[16px] focus:outline-none focus:border-[#FF7A18]/50" />
                    </div>
                    <div>
                      <label className="text-[11px] font-[700] tracking-[0.12em] text-[#C2C2CA]">TAX ID (OPTIONAL)</label>
                      <input value={orgForm.taxId} onChange={e=> setOrgForm({...orgForm, taxId:e.target.value})} className="mt-2 w-full h-[52px] bg-[#060608] border border-[#222] rounded-[10px] px-4 text-[16px] placeholder:text-[#5A5A66] focus:outline-none focus:border-[#FF7A18]/50" placeholder="Optional tax ID" />
                    </div>
                  </div>
                  <button onClick={()=> { setToast('Organization saved'); setTimeout(()=>setToast(''),2000); }} className="w-full h-[48px] bg-[#FF7A18] text-black font-[800] tracking-[0.12em] text-[12px] rounded-[10px]">SAVE ORGANIZATION</button>
                </div>
              </div>
            )}
          </div>
        )}

        {view==='limits' && (
          <div className="max-w-[720px] mx-auto space-y-6">
            <div className="bg-[#1A0A00] border border-[#FF7A18]/40 rounded-[16px] p-6 md:p-8 faceted relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-[240px] h-[240px] bg-[radial-gradient(circle,rgba(255,122,24,0.18),transparent_70%)] blur-[12px]" />
              <div className="relative flex gap-4">
                <div className="w-[48px] h-[48px] bg-[#FF7A18]/15 border border-[#FF7A18]/30 rounded-[12px] flex items-center justify-center text-[#FF7A18] font-[800] text-[20px] shadow-[0_0_20px_rgba(255,122,24,0.2)]">!</div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-[18px] md:text-[22px] font-[800] tracking-[0.06em] uppercase text-[#FF7A18]">CAMPAIGN LIMIT REACHED • {campaigns.length}/{PLAN_LIMITS.FREE.campaigns}</h1>
                  <p className="mt-2 text-[13px] leading-[1.6] text-[#C2A080]">You’ve reached the limit of your <span className="text-[#E8E8EA] font-[700]">FREE</span> plan. FREE includes <span className="text-[#E8E8EA] font-[700]">2 campaigns</span> and <span className="text-[#E8E8EA] font-[700]">25 submissions</span>. Upgrade to PRO for unlimited campaigns and 500 submissions per month.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={()=> handleUpgrade('PRO')} className="h-[48px] px-7 bg-[#FF7A18] text-black font-[800] tracking-[0.12em] text-[12px] rounded-[10px] shadow-[0_0_20px_rgba(255,122,24,0.3)]">UPGRADE TO PRO →</button>
                    <button onClick={()=> setView('pricing')} className="h-[48px] px-6 bg-[#0A0A0C] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em]">VIEW PRICING</button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-[#101012] border border-[#222] rounded-[10px] p-3"><div className="text-[10px] mono text-[#6A6A72]">CURRENT</div><div className="text-[13px] font-[700] mt-1">{campaigns.length} campaigns • {totalSubs} subs</div><div className="mt-2 h-[6px] bg-[#060608] rounded-full overflow-hidden"><div className="h-full bg-[#FF7A18]" style={{width: '100%'}} /></div></div>
                    <div className="bg-[#101012] border border-[#222] rounded-[10px] p-3"><div className="text-[10px] mono text-[#6A6A72]">PRO UNLOCKS</div><div className="text-[13px] font-[700] mt-1">Unlimited • 500/mo</div><div className="mt-2 text-[11px] mono text-[#8A8A90]">+ Priority support</div></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5">
                <div className="text-[11px] font-[800] tracking-[0.14em]">YOUR CAMPAIGNS • {campaigns.length}</div>
                <div className="mt-3 space-y-2">
                  {campaigns.slice(0,3).map(c=>(
                    <div key={c.id} className="flex justify-between items-center bg-[#0A0A0C] border border-[#1A1A1E] rounded-[8px] px-3 py-2.5">
                      <span className="text-[12px] font-[600] truncate max-w-[18ch]">{c.name}</span>
                      <span className="text-[10px] mono px-2 py-0.5 rounded-[5px] bg-[#1A1A1E] border border-[#222] text-[#8A8A90]">{c.context}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5">
                <div className="text-[11px] font-[800] tracking-[0.14em]">WHAT PRO GIVES YOU</div>
                <div className="mt-3 space-y-2 text-[13px]">
                  <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span>Unlimited campaigns • No limit banner</span></div>
                  <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span>500 submissions / month</span></div>
                  <div className="flex gap-2"><span className="text-[#FF7A18]">✓</span><span>Team & family modes • CSV • Priority</span></div>
                </div>
                <button onClick={()=> setView('dashboard')} className="mt-4 w-full h-[48px] bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] text-[11px] mono text-[#6A6A72]">← BACK TO DASHBOARD</button>
              </div>
            </div>
          </div>
        )}

        {view==='dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[22px] md:text-[28px] font-[800] tracking-[-0.02em] uppercase flex items-center gap-3 flex-wrap">
                  ADMIN DASHBOARD
                  <span className={`px-3 h-[28px] rounded-[8px] border text-[11px] font-[800] tracking-[0.1em] flex items-center gap-1.5 ${billing.plan==='FREE' ? 'bg-[#101012] border-[#222] text-[#8A8A90]' : 'bg-[#1A120E] border-[#FF7A18]/30 text-[#FF7A18] shadow-[0_0_12px_rgba(255,122,24,0.15)]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${billing.plan==='FREE' ? 'bg-[#5A5A66]' : 'bg-[#FF7A18] shadow-[0_0_6px_#FF7A18]'}`} />{billing.plan} • {billing.plan==='FREE' ? `${campaigns.length}/${PLAN_LIMITS.FREE.campaigns}` : `${campaigns.length} CAMPAIGNS`} • {totalSubs} SUBS
                  </span>
                </h1>
                <p className="text-[13px] text-[#8A8A90] mono mt-1">MANAGE GROUPS • COLLECT GROUP SIZES WITH CONFIDENCE • {billing.plan} PLAN</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={()=> setView('pricing')} className="h-[44px] px-4 bg-[#101012] border border-[#222] text-[#8A8A90] font-[700] tracking-[0.1em] text-[11px] rounded-[10px] hover:border-[#2A2A30]">PRICING</button>
                <button onClick={()=> openCreate('FAMILY')} className="h-[44px] px-5 bg-[#1A1510] border border-[#FF7A18]/20 text-[#FF9A4C] font-[800] tracking-[0.12em] text-[12px] rounded-[10px] hover:bg-[#221810]">+ FAMILY GROUP</button>
                <button onClick={()=> openCreate('BUSINESS')} className="h-[44px] px-6 bg-[#FF7A18] text-black font-[800] tracking-[0.12em] text-[12px] rounded-[10px] shadow-[0_0_24px_rgba(255,122,24,0.3)] hover:bg-[#FF8A2E]">+ CREATE</button>
              </div>
            </div>

            {isFreeLimitReached && (
              <div className="bg-[#1A0A00] border border-[#FF7A18]/30 rounded-[12px] p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-[36px] h-[36px] bg-[#FF7A18]/15 border border-[#FF7A18]/30 rounded-[8px] flex items-center justify-center text-[#FF7A18] font-[800]">!</div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-[800] tracking-[0.12em] text-[#FF7A18]">CAMPAIGN LIMIT REACHED • {campaigns.length}/{currentLimits.campaigns}</div>
                    <div className="text-[12px] text-[#C2A080] mt-0.5">You’ve reached the FREE plan limit. Upgrade to PRO for unlimited campaigns and {PLAN_LIMITS.PRO.submissions} submissions / month.</div>
                  </div>
                </div>
                <button onClick={()=> handleUpgrade('PRO')} className="shrink-0 h-[40px] px-5 bg-[#FF7A18] text-black font-[800] tracking-[0.1em] text-[11px] rounded-[8px]">UPGRADE TO PRO →</button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                {k:'TOTAL GROUPS', v: campaigns.length, sub: `${billing.plan} • ${currentLimits.campaigns===9999 ? '∞' : `${campaigns.length}/${currentLimits.campaigns}`}`},
                {k:'OPEN', v: campaigns.filter(c=>c.status==='OPEN').length, sub: `${campaigns.filter(c=>c.status==='OPEN').length} live`},
                {k:'TOTAL SUBMISSIONS', v: submissions.length, sub: `${totalSubs}/${currentLimits.submissions} • ${Math.round((totalSubs/currentLimits.submissions)*100)}%`},
              ].map(s=>(
                <div key={s.k} className="bg-[#101012] border border-[#222] rounded-[12px] p-4 faceted-sm min-w-0">
                  <div className="text-[10px] mono tracking-[0.14em] text-[#6A6A72] truncate">{s.k}</div>
                  <div className="text-[28px] font-[800] tracking-[-0.02em] mt-1">{s.v}</div>
                  <div className="text-[10px] mono text-[#8A8A90] mt-1 truncate">{s.sub}</div>
                  <div className="h-1 w-full mt-3 bg-[#0A0A0C] rounded-full overflow-hidden border border-[#1A1A1E]"><div className="h-full bg-[#FF7A18]" style={{width: `${s.k==='TOTAL SUBMISSIONS' ? Math.min(100, (totalSubs/currentLimits.submissions)*100) : s.k==='TOTAL GROUPS' ? Math.min(100, (campaigns.length/(currentLimits.campaigns===9999?10:currentLimits.campaigns))*100) : 60}%`}} /></div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {(['ALL','BUSINESS','FAMILY','TEAM','EVENT','OTHER'] as const).map(f=>(
                <button key={f} onClick={()=> setFilterCtx(f as any)} className={`px-3 h-[30px] rounded-[8px] text-[11px] font-[700] tracking-[0.1em] border faceted-sm whitespace-nowrap transition-all ${filterCtx===f ? 'bg-[#FF7A18] text-black border-[#FF7A18] shadow-[0_0_14px_rgba(255,122,24,0.25)]' : 'bg-[#101012] text-[#8A8A90] border-[#222] hover:text-[#E8E8EA]'}`}>{f}</button>
              ))}
              <span className="ml-auto text-[10px] mono text-[#5A5A66] hidden md:inline">{filteredCampaigns.length} GROUPS • {billing.plan} PLAN • {billing.plan==='FREE' ? '2 CAMPAIGN LIMIT' : 'UNLIMITED'}</span>
            </div>

            {filteredCampaigns.length===0 ? (
              <div className="bg-[#0A0A0C] border border-dashed border-[#222] rounded-[16px] p-10 md:p-16 text-center faceted">
                <div className="w-[64px] h-[64px] mx-auto bg-black border border-[#222] rounded-[12px] overflow-hidden flex items-center justify-center"><img src={mwLogo} alt="MW" className="w-full h-full object-contain p-2" /></div>
                <div className="mt-6 text-[16px] font-[700] tracking-[0.12em]">{filterCtx==='ALL' ? 'NO GROUPS YET' : `NO ${filterCtx} GROUPS`}</div>
                <div className="mt-2 text-[13px] text-[#8A8A90] max-w-[40ch] mx-auto">{filterCtx==='ALL' ? 'Create your first group to start collecting sizes. Business or family - same simple link.' : `No ${filterCtx.toLowerCase()} groups found. Create one to get started.`}</div>
                <div className="mt-6 flex justify-center gap-3 flex-wrap">
                  <button onClick={()=> openCreate('BUSINESS')} className="h-[42px] px-5 bg-[#101012] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em]">BUSINESS CAMPAIGN</button>
                  <button onClick={()=> openCreate('FAMILY')} className="h-[42px] px-6 bg-[#FF7A18] text-black font-[800] text-[12px] tracking-[0.12em] rounded-[10px]">FAMILY GROUP</button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredCampaigns.map(c=>{
                  const count = submissions.filter(s=> s.campaignId===c.id).length;
                  return (
                    <div key={c.id} className="group bg-[#101012] border border-[#222] hover:border-[#2E2E36] rounded-[12px] p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 transition-colors faceted-sm min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] border ${getContextBadgeStyle(c.context)}`}>{c.context}</span>
                          <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] ${c.status==='OPEN' ? 'bg-[#0F1F0F] text-[#5CFF7A] border border-[#1E3A1E]' : 'bg-[#101012] text-[#8A8A90] border border-[#222]'}`}>{c.status}</span>
                          <span className="text-[11px] mono text-[#5A5A66]">{c.shareToken}</span>
                          <span className="text-[11px] mono text-[#5A5A66]">• {fmtDate(c.createdAt)}</span>
                          {c.deadline && <span className="text-[11px] mono text-[#FF9A3C]">DEADLINE {fmtDate(c.deadline)}</span>}
                        </div>
                        <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                          <div className="text-[16px] md:text-[18px] font-[700] tracking-[-0.01em] truncate">{c.name}</div>
                          {c.organization && <div className="text-[12px] text-[#8A8A90] truncate">{c.organization}</div>}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="text-[12px] mono text-[#9A9AA3]">{count} SUBMISSIONS</div>
                          <div className="h-1 flex-1 max-w-[120px] bg-[#0A0A0C] border border-[#1A1A1E] rounded-full overflow-hidden"><div className="h-full bg-[#FF7A18]" style={{width: `${Math.min(100, count*12)}%`}} /></div>
                          <span className="text-[10px] mono text-[#5A5A66]">{count}/{PLAN_LIMITS[billing.plan].submissions===9999 ? '∞' : PLAN_LIMITS[billing.plan].submissions}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-stretch md:self-auto">
                        <button onClick={()=>{ setSelectedId(c.id); setView('detail'); }} className="flex-1 md:flex-none h-[36px] px-4 bg-[#0A0A0C] hover:bg-[#111] border border-[#222] rounded-[8px] text-[11px] font-[700] tracking-[0.1em]">VIEW</button>
                        <button onClick={()=> copyLink(c.shareToken)} className="h-[36px] px-4 bg-[#101012] border border-[#222] rounded-[8px] text-[11px] font-[700] tracking-[0.1em] hover:border-[#FF7A18]/40">{copied ? 'COPIED' : 'COPY LINK'}</button>
                        <button onClick={()=> toggleStatus(c.id)} className="h-[36px] px-3 bg-[#101012] border border-[#222] rounded-[8px] text-[10px] mono text-[#8A8A90] hover:text-[#E8E8EA]">{c.status==='OPEN' ? 'CLOSE' : 'REOPEN'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view==='create' && (
          <div className="max-w-[900px] mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={()=> { if(createStep===2) setCreateStep(1); else setView('dashboard'); }} className="w-[36px] h-[36px] bg-[#101012] border border-[#222] rounded-[8px] flex items-center justify-center">←</button>
              <div className="flex-1 min-w-0">
                <h1 className="text-[20px] md:text-[24px] font-[800] tracking-[-0.01em] uppercase truncate">{createStep===1 ? 'CHOOSE USE TYPE' : createCopy.title}</h1>
                <p className="text-[11px] mono text-[#8A8A90]">{createStep===1 ? 'STEP 1 • SELECT CONTEXT • SAME STRUCTURE, ADAPTIVE WORDING' : createCopy.sub}</p>
              </div>
              {createStep===2 && <span className={`px-2.5 py-1 rounded-[6px] text-[10px] font-[800] tracking-[0.12em] border faceted-sm shrink-0 ${getContextBadgeStyle(createContext)}`}>{createContext}</span>}
            </div>

            {createStep===1 && (
              <div className="space-y-6">
                <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5 md:p-6 faceted-sm">
                  <div className="text-[11px] font-[800] tracking-[0.14em] text-[#FF7A18]">SELECT YOUR USE TYPE</div>
                  <p className="text-[13px] text-[#8A8A90] mt-2 leading-[1.5]">This influences wording only. Underlying structure stays the same: GROUP → PEOPLE → SIZES → LINK → COLLECTION → REVIEW → EXPORT</p>
                  <div className="mt-6 grid md:grid-cols-2 gap-3">
                    {CONTEXT_OPTIONS.map(opt=>{
                      const selected = createContext===opt.key;
                      return (
                        <button key={opt.key} onClick={()=> setCreateContext(opt.key)} className={`text-left p-4 rounded-[12px] border faceted-sm transition-all relative overflow-hidden group ${selected ? 'bg-[#1A120E] border-[#FF7A18]/50 shadow-[0_0_20px_rgba(255,122,24,0.15)]' : 'bg-[#0A0A0C] border-[#222] hover:border-[#2A2A30] hover:bg-[#101012]'}`}>
                          {selected && <div className="absolute top-0 right-0 w-[60px] h-[60px] bg-[radial-gradient(circle,rgba(255,122,24,0.18),transparent_70%)]" />}
                          <div className="flex items-center justify-between relative">
                            <span className={`px-2 py-0.5 rounded-[5px] text-[11px] font-[800] tracking-[0.12em] border ${selected ? 'bg-[#FF7A18] text-black border-[#FF7A18]' : getContextBadgeStyle(opt.key)}`}>{opt.label}</span>
                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected ? 'bg-[#FF7A18] border-[#FF7A18] text-black' : 'border-[#222] bg-[#0A0A0C]'}`}>{selected ? '✓' : ''}</span>
                          </div>
                          <div className="mt-3 text-[13px] font-[700] tracking-[0.02em]">{opt.desc}</div>
                          <div className="mt-1 text-[11px] mono text-[#6A6A72]">{opt.detail}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button onClick={()=> setCreateStep(2)} className="h-[44px] px-8 bg-[#FF7A18] text-black rounded-[10px] text-[12px] font-[800] tracking-[0.12em] shadow-[0_0_20px_rgba(255,122,24,0.3)]">CONTINUE → {createContext}</button>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[12px] p-4"><div className="text-[11px] font-[800] tracking-[0.1em] text-[#FF7A18]">BUSINESS</div><div className="text-[12px] text-[#8A8A90] mt-1">Organization, deadline, CSV for supplier. Professional.</div></div>
                  <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[12px] p-4"><div className="text-[11px] font-[800] tracking-[0.1em] text-[#FF9A4C]">FAMILY</div><div className="text-[12px] text-[#8A8A90] mt-1">Warm, simple. Send via WhatsApp. No corporate words.</div></div>
                  <div className="bg-[#0A0A0C] border border-[#1A1A1E] rounded-[12px] p-4"><div className="text-[11px] font-[800] tracking-[0.1em] text-[#8AA0C2]">TEAM / EVENT</div><div className="text-[12px] text-[#8A8A90] mt-1">Practical, social. Same link, adaptive language.</div></div>
                </div>
              </div>
            )}

            {createStep===2 && (
            <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="space-y-4 min-w-0">
                <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5 md:p-6 faceted-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[800] tracking-[0.14em] text-[#FF7A18]">{createContext==='FAMILY' ? 'GROUP DETAILS' : 'DETAILS'}</div>
                    <span className="text-[10px] mono text-[#6A6A72]">{createCopy.hint}</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-[700] tracking-[0.12em] text-[#C2C2CA]">{createCopy.nameLabel} {createContext==='BUSINESS' ? '*' : ''}</label>
                      <input value={createForm.name} onChange={e=> setCreateForm({...createForm, name:e.target.value})} placeholder={createCopy.namePh} className="mt-1.5 w-full h-[52px] bg-[#060608] border border-[#222] rounded-[10px] px-4 text-[16px] placeholder:text-[#5A5A66] focus:outline-none focus:border-[#FF7A18]/50 focus:ring-[0_0_0_3px_rgba(255,122,24,0.12)]" />
                    </div>
                    {createCopy.showOrg && (
                      <div>
                        <label className="text-[11px] font-[700] tracking-[0.12em] text-[#C2C2CA]">{createCopy.orgLabel} {createContext==='BUSINESS' ? '*' : ''}</label>
                        <input value={createForm.org} onChange={e=> setCreateForm({...createForm, org:e.target.value})} placeholder={createCopy.orgPh} className="mt-1.5 w-full h-[52px] bg-[#060608] border border-[#222] rounded-[10px] px-4 text-[16px] placeholder:text-[#5A5A66] focus:outline-none focus:border-[#FF7A18]/50" />
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] font-[700] tracking-[0.12em] text-[#C2C2CA]">{createCopy.descLabel}</label>
                      <textarea value={createForm.desc} onChange={e=> setCreateForm({...createForm, desc:e.target.value})} placeholder={createCopy.descPh} rows={3} className="mt-1.5 w-full bg-[#060608] border border-[#222] rounded-[10px] px-4 py-3 text-[16px] placeholder:text-[#5A5A66] focus:outline-none focus:border-[#FF7A18]/50 resize-none" />
                    </div>
                    {createContext==='BUSINESS' && (
                      <div>
                        <label className="text-[11px] font-[700] tracking-[0.12em] text-[#C2C2CA]">DEADLINE (OPTIONAL)</label>
                        <input type="date" value={createForm.deadline} onChange={e=> setCreateForm({...createForm, deadline:e.target.value})} className="mt-1.5 w-full h-[52px] bg-[#060608] border border-[#222] rounded-[10px] px-4 text-[16px] focus:outline-none focus:border-[#FF7A18]/50" />
                      </div>
                    )}
                    {createContext==='FAMILY' && (
                      <div className="bg-[#0A0908] border border-[#1E1510] rounded-[10px] p-3 flex gap-2">
                        <span className="text-[#FF7A18] text-[12px]">↗</span>
                        <span className="text-[11px] leading-[1.5] text-[#8A7A6A]">Example uses: {createCopy.sideNote}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5 md:p-6 faceted-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-[800] tracking-[0.14em] text-[#FF7A18]">{createCopy.fieldsHeading} • {includedFields.length}</div>
                    <span className="text-[10px] mono text-[#6A6A72]">MUST HAVE ≥1 FIELD</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {includedFields.map(f=>(
                      <div key={f.id} className="group bg-[#0A0A0C] border border-[#222] rounded-[10px] p-3 flex items-center gap-3 min-w-0">
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={()=> moveField(f.id,-1)} className="w-5 h-4 bg-[#101012] rounded-[4px] text-[10px]">↑</button>
                          <button onClick={()=> moveField(f.id,1)} className="w-5 h-4 bg-[#101012] rounded-[4px] text-[10px]">↓</button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <input value={f.label} onChange={e=> setIncludedFields(prev=> prev.map(x=> x.id===f.id ? {...x, label:e.target.value}:x))} className="w-full bg-transparent text-[13px] font-[600] tracking-wide focus:outline-none" />
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] mono px-1.5 py-0.5 bg-[#101012] border border-[#222] rounded-[4px] text-[#8A8A90]">{f.type.toUpperCase()}</span>
                            {f.options && <span className="text-[10px] mono text-[#5A5A66] truncate">{f.options.slice(0,4).join(' • ')}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={()=> toggleRequired(f.id)} className={`h-[26px] px-2 rounded-[6px] text-[10px] font-[700] tracking-[0.08em] border ${f.required ? 'bg-[#FF7A18]/15 border-[#FF7A18]/30 text-[#FF7A18]' : 'bg-[#101012] border-[#222] text-[#6A6A72]'}`}>{f.required ? 'REQUIRED' : 'OPTIONAL'}</button>
                          <button onClick={()=> removeField(f.id)} className="w-[26px] h-[26px] rounded-[6px] bg-[#101012] border border-[#222] text-[#6A6A72] hover:text-[#FF5A5A]">✕</button>
                        </div>
                      </div>
                    ))}
                    {includedFields.length===0 && <div className="text-[12px] text-[#6A6A72] py-4 text-center">No fields yet. Add from library →</div>}
                  </div>
                </div>
              </div>

              <div className="space-y-4 min-w-0">
                <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5 faceted-sm">
                  <div className="text-[11px] font-[800] tracking-[0.14em] text-[#C2C2CA]">{createContext==='FAMILY' ? 'CHOOSE WHAT TO COLLECT' : 'FIELD LIBRARY'}</div>
                  <div className="text-[11px] mono text-[#6A6A72] mt-1">{createContext==='FAMILY' ? 'Shirt / Top, Pants / Bottom, Jacket, Shoe, Waist, Inseam, Other' : 'Tap to add to collection'}</div>
                  <div className="mt-4 grid gap-2">
                    {FIELD_TEMPLATES.map(t=>{
                      const added = includedFields.some(f=> f.label===t.label);
                      return (
                        <button key={t.key} onClick={()=> addTemplate(t)} disabled={added} className={`text-left w-full bg-[#0A0A0C] border rounded-[10px] p-3 transition-all ${added ? 'border-[#1A1A1E] opacity-40' : 'border-[#222] hover:border-[#FF7A18]/40 hover:bg-[#111]'}`}>
                          <div className="flex items-center justify-between">
                            <div className="text-[12px] font-[700] tracking-wide">{t.label}</div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-[700] ${added ? 'bg-[#101012] text-[#5A5A66]' : 'bg-[#FF7A18] text-black'}`}>{added ? 'ADDED' : '+ ADD'}</span>
                          </div>
                          <div className="mt-1 text-[11px] mono text-[#6A6A72]">{t.type} {t.options ? `• ${t.options.slice(0,3).join('/')}` : ''}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#0B0B0D] border border-[#222] rounded-[14px] p-5 faceted-sm">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">NEXT STEP</div>
                  <div className="mt-3 flex gap-2 text-[12px] mono text-[#8A8A90]"><span className="text-[#FF7A18]">→</span> {createContext==='FAMILY' ? 'You will get a shareable link to send via WhatsApp' : "After create you'll get a shareable link mw.geeskit.com/c/XXXX"}</div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={()=> setCreateStep(1)} className="flex-1 h-[44px] bg-[#0A0A0C] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em]">BACK</button>
                    <button onClick={handleCreateCampaign} className="flex-[1.4] h-[48px] bg-[#FF7A18] text-black rounded-[10px] text-[12px] font-[800] tracking-[0.12em] shadow-[0_0_20px_rgba(255,122,24,0.3)]">{createCopy.cta}</button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {view==='detail' && selectedCampaign && (
          <div className="space-y-6 max-w-[1100px] mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={()=> setView('dashboard')} className="w-[36px] h-[36px] bg-[#101012] border border-[#222] rounded-[8px] flex items-center justify-center shrink-0">←</button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] border ${getContextBadgeStyle(selectedCampaign.context)}`}>{selectedCampaign.context}</span>
                  {selectedCampaign.context==='FAMILY' && <span className="text-[11px] mono text-[#6A6A72]">PERSONAL • WARM • WHATSAPP READY</span>}
                  <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] border ${billing.plan==='FREE' ? 'bg-[#101012] border-[#222] text-[#8A8A90]' : 'bg-[#1A120E] border-[#FF7A18]/30 text-[#FF7A18]'}`}>{billing.plan} PLAN</span>
                </div>
                <h1 className="text-[20px] md:text-[26px] font-[800] uppercase tracking-[-0.02em] truncate mt-1">{selectedCampaign.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {selectedCampaign.organization && <span className="text-[12px] text-[#8A8A90]">{selectedCampaign.organization}</span>}
                  <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] border ${selectedCampaign.status==='OPEN' ? 'bg-[#0F1F0F] text-[#5CFF7A] border-[#1E3A1E]' : 'bg-[#101012] text-[#8A8A90] border-[#222]'}`}>{selectedCampaign.status}</span>
                  <span className="text-[11px] mono text-[#5A5A66]">{selectedSubs.length} {selectedCampaign.context==='FAMILY' ? 'PEOPLE' : 'SUBMISSIONS'} • {selectedSubs.length}/{currentLimits.submissions} • CREATED {fmtDate(selectedCampaign.createdAt)}</span>
                </div>
              </div>
              <button onClick={()=> toggleStatus(selectedCampaign.id)} className="h-[36px] px-4 bg-[#101012] border border-[#222] rounded-[8px] text-[11px] font-[700] tracking-[0.1em] shrink-0">{selectedCampaign.status==='OPEN' ? (selectedCampaign.context==='FAMILY' ? 'CLOSE GROUP' : 'CLOSE') : 'REOPEN'}</button>
            </div>

            <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="space-y-6 min-w-0">
                <div className="relative bg-[#101012] border border-[#FF7A18]/30 rounded-[14px] p-5 md:p-6 faceted-sm overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(255,122,24,0.12),transparent_50%)] pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-[800] tracking-[0.16em] text-[#FF7A18]">{selectedCampaign.context==='FAMILY' ? 'SHARE LINK • SEND TO FAMILY' : 'SHARE LINK • SEND TO GROUP'}</div>
                      <span className="text-[10px] mono text-[#6A6A72]">PUBLIC • NO LOGIN</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <div className="flex-1 h-[48px] bg-[#060608] border border-[#222] rounded-[10px] px-4 flex items-center gap-2 overflow-hidden min-w-0">
                        <span className="text-[#FF7A18]">↗</span>
                        <span className="text-[13px] mono truncate">https://mw.geeskit.com/c/{selectedCampaign.shareToken}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button onClick={()=> copyLink(selectedCampaign.shareToken)} className="flex-1 min-w-[120px] h-[48px] bg-[#FF7A18] text-black font-[800] tracking-[0.12em] text-[12px] rounded-[10px] shadow-[0_0_20px_rgba(255,122,24,0.25)]">{copied ? '✓ COPIED' : 'COPY LINK'}</button>
                      <button onClick={()=>{
                        const url = `https://mw.geeskit.com/c/${selectedCampaign.shareToken}`;
                        if(navigator.share){ navigator.share({title:selectedCampaign.name, url}).catch(()=>{}); } else { copyLink(selectedCampaign.shareToken); }
                      }} className="h-[48px] px-5 bg-[#0A0A0C] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em]">SHARE</button>
                      <button onClick={()=>{ setPublicToken(selectedCampaign.shareToken); setView('public'); }} className="h-[48px] px-5 bg-[#101012] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.1em]">OPEN FORM ↗</button>
                      <button onClick={()=>copyOwnerLink(selectedCampaign)} className="h-[48px] px-5 bg-[#101012] border border-[#FF7A18]/20 text-[#FF9A4C] rounded-[10px] text-[12px] font-[700] tracking-[0.1em]">SAVE OWNER LINK</button>
                    </div>
                    <p className="mt-3 text-[12px] leading-[1.5] text-[#8A8A90]">{selectedCampaign.context==='FAMILY' ? 'Send this link to your family via WhatsApp. Everyone adds their own sizes. No account needed, mobile-friendly.' : 'Send this link to your group via WhatsApp, email or Slack. Participants do NOT need an account. You’ll see submissions live here.'}</p>
                    <div className="mt-3 pt-3 border-t border-[#1A1A1E] text-[11px] leading-[1.5] text-[#6A6A72]"><span className="text-[#FF9A4C] font-[700]">OWNER LINK:</span> Save this private link to open this group from another device. It gives organizer access — do not share it with participants.</div>
                  </div>
                </div>

                <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5 md:p-6 faceted-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[11px] font-[800] tracking-[0.16em]">{selectedCampaign.context==='FAMILY' ? `FAMILY • ${selectedSubs.length}` : `SUBMISSIONS • ${selectedSubs.length}/${currentLimits.submissions}`} • {billing.plan}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Search name..." className="h-[36px] w-[140px] md:w-[180px] bg-[#060608] border border-[#222] rounded-[8px] px-3 text-[12px] focus:outline-none focus:border-[#2A2A30]" />
                      <button onClick={()=> setShowAllSubs(!showAllSubs)} className="h-[36px] px-3 bg-[#0A0A0C] border border-[#222] rounded-[8px] text-[11px] font-[700] tracking-[0.08em]">{showAllSubs ? 'SHOW LESS' : 'VIEW ALL'}</button>
                      <button onClick={()=> doExport(selectedCampaign)} className="h-[36px] px-3 bg-[#101012] border border-[#222] rounded-[8px] text-[11px] font-[700]">EXPORT CSV</button>
                    </div>
                  </div>
                  <div className="mt-4 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] mono"><span className="text-[#6A6A72]">SUBMISSIONS VS LIMIT</span><span className="text-[#C2C2CA]">{selectedSubs.length} / {currentLimits.submissions} • {Math.round((selectedSubs.length/currentLimits.submissions)*100)}%</span></div>
                      <div className="mt-2 h-[6px] bg-[#101012] border border-[#1A1A1E] rounded-full overflow-hidden"><div className="h-full bg-[#FF7A18]" style={{width: `${Math.min(100, (selectedSubs.length/currentLimits.submissions)*100)}%`}} /></div>
                    </div>
                    <div className={`px-2 py-1 rounded-[6px] text-[10px] font-[800] border ${billing.plan==='FREE' ? 'bg-[#1A120E] border-[#FF7A18]/20 text-[#FF7A18]' : 'bg-[#0F1F0F] border-[#1E3A1E] text-[#5CFF7A]'}`}>{billing.plan} • {billing.plan==='FREE' ? 'LIMITED' : 'UNLIMITED CAMPAIGNS'}</div>
                  </div>

                  {selectedSubs.length===0 ? (
                    <div className="mt-6 border border-dashed border-[#222] rounded-[12px] p-8 text-center">
                      <div className="text-[12px] font-[700] tracking-[0.12em]">NO {selectedCampaign.context==='FAMILY' ? 'SIZES YET' : 'SUBMISSIONS YET'}</div>
                      <div className="text-[12px] text-[#6A6A72] mt-1">{selectedCampaign.context==='FAMILY' ? 'Share your link to collect family sizes.' : 'Share your link to start collecting sizes.'}</div>
                    </div>
                  ) : (
                    <>
                      <div className="hidden md:block mt-5 overflow-auto rounded-[10px] border border-[#222]">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#0A0A0C] border-b border-[#222]">
                            <tr>
                              {selectedCampaign.fields.slice(0,5).map(f=>(
                                <th key={f.id} className="px-4 py-3 text-[10px] font-[700] tracking-[0.12em] text-[#6A6A72]">{(selectedCampaign.context==='FAMILY' ? simplifyLabelForFamily(f.label) : f.label).toUpperCase()}</th>
                              ))}
                              <th className="px-4 py-3 text-[10px] font-[700] tracking-[0.12em] text-[#6A6A72]">DATE</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#141416]">
                            {(showAllSubs ? filteredSubs : filteredSubs.slice(0,5)).map(s=>(
                              <tr key={s.id} className="hover:bg-[#0E0E10]">
                                {selectedCampaign.fields.slice(0,5).map(f=>(
                                  <td key={f.id} className="px-4 py-3 text-[13px] text-[#C2C2CA] truncate max-w-[140px]">{s.values[f.id] || '—'}</td>
                                ))}
                                <td className="px-4 py-3 text-[11px] mono text-[#6A6A72]">{fmtDateTime(s.submittedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden mt-4 grid gap-3">
                        {(showAllSubs ? filteredSubs : filteredSubs.slice(0,5)).map(s=>(
                          <div key={s.id} className="bg-[#0A0A0C] border border-[#222] rounded-[12px] p-4">
                            <div className="flex justify-between items-start">
                              <div className="text-[13px] font-[700]">{selectedCampaign.fields[0] ? (s.values[selectedCampaign.fields[0].id] || 'Unknown') : 'Submission'}</div>
                              <div className="text-[10px] mono text-[#6A6A72]">{fmtDateTime(s.submittedAt)}</div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {selectedCampaign.fields.slice(1,5).map(f=>(
                                <div key={f.id} className="bg-[#101012] border border-[#1A1A1E] rounded-[8px] px-3 py-2">
                                  <div className="text-[9px] mono tracking-[0.12em] text-[#6A6A72]">{(selectedCampaign.context==='FAMILY' ? simplifyLabelForFamily(f.label) : f.label).toUpperCase()}</div>
                                  <div className="text-[12px] font-[600] mt-0.5 truncate">{s.values[f.id] || '—'}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4 min-w-0">
                <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5 faceted-sm">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">{selectedCampaign.context==='FAMILY' ? 'WHAT TO COLLECT' : `FIELDS • ${selectedCampaign.fields.length}`}</div>
                  <div className="mt-4 space-y-2">
                    {selectedCampaign.fields.map(f=>(
                      <div key={f.id} className="flex items-center justify-between bg-[#0A0A0C] border border-[#1A1A1E] rounded-[8px] px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="text-[12px] font-[600] truncate">{selectedCampaign.context==='FAMILY' ? simplifyLabelForFamily(f.label) : f.label}</div>
                          <div className="text-[10px] mono text-[#6A6A72]">{f.type} {f.required ? '• REQUIRED' : '• OPTIONAL'} {f.options ? `• ${f.options.length} options` : ''}</div>
                        </div>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${f.required ? 'bg-[#FF7A18] shadow-[0_0_6px_#FF7A18]' : 'bg-[#222]'}`} />
                      </div>
                    ))}
                  </div>
                  {selectedCampaign.description && (
                    <div className="mt-4 pt-4 border-t border-[#1A1A1E]">
                      <div className="text-[10px] mono tracking-[0.12em] text-[#6A6A72]">{selectedCampaign.context==='FAMILY' ? 'NOTE' : 'DESCRIPTION'}</div>
                      <div className="mt-1 text-[12px] leading-[1.6] text-[#9A9AA3]">{selectedCampaign.description}</div>
                    </div>
                  )}
                  {selectedCampaign.deadline && <div className="mt-3 text-[11px] mono"><span className="text-[#6A6A72]">DEADLINE:</span> <span className="text-[#FF9A3C]">{fmtDate(selectedCampaign.deadline)}</span></div>}
                </div>

                <div className="bg-[#101012] border border-[#222] rounded-[14px] p-5 faceted-sm">
                  <div className="text-[11px] font-[800] tracking-[0.14em]">EXPORT • {billing.plan} PLAN</div>
                  <p className="mt-2 text-[12px] leading-[1.5] text-[#8A8A90]">CSV contains: {selectedCampaign.fields.map(f=>f.label).join(', ')} + submitted date. {billing.plan} allows {currentLimits.submissions} submissions.</p>
                  <button onClick={()=> doExport(selectedCampaign)} className="mt-4 w-full h-[48px] bg-[#101012] hover:bg-[#0A0A0C] border border-[#FF7A18]/30 text-[#FF7A18] font-[800] tracking-[0.12em] text-[12px] rounded-[10px]">↓ EXPORT CSV</button>
                  <div className="mt-3 text-[10px] mono text-[#5A5A66] text-center">{slugify(selectedCampaign.name)}-submissions.csv • {billing.plan} • {selectedSubs.length}/{currentLimits.submissions}</div>
                </div>

                <div className="bg-[#0A0A0C] border border-[#222] rounded-[14px] p-4 flex gap-3">
                  <div className="w-[36px] h-[36px] bg-black border border-[#222] rounded-[8px] overflow-hidden flex-shrink-0"><img src={mwLogo} alt="mw" className="w-full h-full object-contain" /></div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-[700] tracking-[0.1em]">A GEESKIT PRODUCT • {billing.plan}</div>
                    <div className="text-[11px] leading-[1.5] text-[#6A6A72] mt-1">{selectedCampaign.context==='FAMILY' ? 'Family mode keeps it warm, simple, and WhatsApp-ready. Same MW reliability.' : 'MW keeps group sizes organized with confidence.'} • Stripe billing • secure hosted checkout.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view==='public' && (
          <div className="max-w-[560px] mx-auto">
            {!publicCampaign ? (
              <div className="bg-[#101012] border border-[#222] rounded-[16px] p-8 md:p-10 text-center faceted">
                <div className="w-[48px] h-[48px] mx-auto bg-[#0A0A0C] rounded-[10px] flex items-center justify-center text-[20px]">⚠</div>
                <div className="mt-5 text-[16px] font-[800] tracking-[0.12em]">GROUP NOT FOUND</div>
                <p className="mt-2 text-[13px] text-[#8A8A90]">This link is invalid or expired. Please check with your organizer.</p>
                <button onClick={()=> setView('landing')} className="mt-6 h-[48px] px-6 bg-[#0A0A0C] border border-[#222] rounded-[10px] text-[12px] font-[700]">GO TO MW</button>
              </div>
            ) : publicCampaign.status==='CLOSED' ? (
              <div className="bg-[#101012] border border-[#222] rounded-[16px] p-8 md:p-10 text-center faceted">
                <div className="w-[56px] h-[56px] mx-auto bg-[#0A0A0C] border border-[#222] rounded-[12px] flex items-center justify-center text-[#8A8A90] font-[800]">CLOSED</div>
                <div className="mt-5 text-[18px] font-[800] tracking-[0.08em]">THIS {publicCampaign.context==='FAMILY' ? 'GROUP' : 'CAMPAIGN'} IS CLOSED</div>
                <p className="mt-2 text-[13px] text-[#8A8A90] leading-[1.6]">This collection is no longer accepting responses for <span className="text-[#E8E8EA] font-[600]">{publicCampaign.name}</span>.</p>
                {publicCampaign.organization && (
                  <div className="mt-6 p-4 bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] text-left">
                    <div className="text-[11px] mono text-[#6A6A72]">{publicCampaign.context==='FAMILY' ? 'GROUP' : 'ORGANIZATION'}</div>
                    <div className="text-[13px] font-[600] mt-1">{publicCampaign.organization}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-[#0B0B0D] border border-[#222] rounded-[16px] p-6 md:p-7 faceted">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-[5px] text-[10px] font-[800] tracking-[0.12em] border ${getContextBadgeStyle(publicCampaign.context)}`}>{publicCampaign.context}</span>
                        {publicCampaign.context==='FAMILY' && <span className="text-[11px] mono text-[#6A6A72]">PERSONAL • NO LOGIN</span>}
                      </div>
                      <h1 className="mt-3 text-[22px] md:text-[26px] font-[800] tracking-[-0.02em] uppercase leading-[1.05]">{publicCampaign.name}</h1>
                      <p className="mt-3 text-[13px] leading-[1.6] text-[#9A9AA3]">{publicCampaign.context==='FAMILY' ? (publicCampaign.description || "Add your sizes below. Simple, no account needed. Send one link, everyone adds their own info.") : (publicCampaign.description || '')}</p>
                      {publicCampaign.context!=='FAMILY' && publicCampaign.organization && <div className="mt-2 text-[11px] mono tracking-[0.16em] text-[#FF7A18]">{publicCampaign.organization.toUpperCase()}</div>}
                    </div>
                    <div className="hidden md:flex w-[40px] h-[40px] bg-black border border-[#222] rounded-[10px] overflow-hidden shrink-0"><img src={mwLogo} alt="MW" className="w-full h-full object-contain p-1" /></div>
                  </div>
                  {publicCampaign.context==='BUSINESS' && publicCampaign.deadline && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-[#101012] border border-[#FF7A18]/20 rounded-full px-3 py-1">
                      <span className="w-1.5 h-1.5 bg-[#FF7A18] rounded-full" />
                      <span className="text-[11px] mono">DEADLINE {fmtDate(publicCampaign.deadline)}</span>
                    </div>
                  )}
                  {publicCampaign.context==='FAMILY' && <div className="mt-4 text-[13px] font-[600] tracking-[0.02em] text-[#E8E8EA]">Add your sizes below.</div>}
                  <div className="mt-5 h-px bg-gradient-to-r from-[#FF7A18]/30 via-[#222] to-transparent" />
                  <div className="mt-4 flex items-center gap-2 text-[11px] mono text-[#6A6A72] flex-wrap"><span className="px-2 py-0.5 bg-[#101012] border border-[#222] rounded-[5px]">{publicCampaign.context==='FAMILY' ? 'FAMILY • WHATSAPP READY • MOBILE FIRST' : 'SECURE • NO LOGIN • MOBILE FIRST'}</span></div>
                </div>

                <div className="bg-[#101012] border border-[#222] rounded-[16px] p-5 md:p-7 faceted-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] font-[800] tracking-[0.14em]">{publicCampaign.context==='FAMILY' ? 'YOUR SIZES' : 'YOUR MEASUREMENTS'}</div>
                    <div className="text-[10px] mono text-[#6A6A72]">* REQUIRED</div>
                  </div>
                  {publicCampaign.fields.map(field=>{
                    const err = publicErrors[field.id];
                    const displayLabel = publicCampaign.context==='FAMILY' ? simplifyLabelForFamily(field.label) : field.label;
                    return (
                      <div key={field.id} className="space-y-2">
                        <label className="flex items-center gap-2 text-[11px] font-[700] tracking-[0.12em] text-[#C2C2CA]">{displayLabel.toUpperCase()} {field.required && <span className="text-[#FF7A18]">*</span>}</label>
                        {field.options ? (
                          <select value={publicValues[field.id]||''} onChange={e=> setPublicValues({...publicValues, [field.id]: e.target.value})} className={`w-full h-[52px] bg-[#060608] border rounded-[10px] px-4 text-[16px] focus:outline-none focus:border-[#FF7A18]/50 ${err ? 'border-[#FF4A4A] bg-[#1A0A0A]' : 'border-[#222]'}`}>
                            <option value="">Select {displayLabel.toLowerCase()}</option>
                            {field.options.map(o=> <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : field.label.toLowerCase().includes('notes') || field.type==='custom' && field.label.toLowerCase().includes('notes') ? (
                          <textarea value={publicValues[field.id]||''} onChange={e=> setPublicValues({...publicValues, [field.id]: e.target.value})} placeholder={publicCampaign.context==='FAMILY' ? 'e.g. kids size, loose fit' : field.placeholder} rows={3} className={`w-full bg-[#060608] border rounded-[10px] px-4 py-3 text-[16px] placeholder:text-[#5A5A66] focus:outline-none focus:border-[#FF7A18]/50 resize-none ${err ? 'border-[#FF4A4A] bg-[#1A0A0A]' : 'border-[#222]'}`} />
                        ) : (
                          <input value={publicValues[field.id]||''} onChange={e=> setPublicValues({...publicValues, [field.id]: e.target.value})} type={field.type==='email' ? 'email' : 'text'} placeholder={field.placeholder || (publicCampaign.context==='FAMILY' ? `Enter ${displayLabel.toLowerCase()}` : `Enter ${field.label.toLowerCase()}`)} className={`w-full h-[52px] bg-[#060608] border rounded-[10px] px-4 text-[16px] placeholder:text-[#5A5A66] focus:outline-none focus:border-[#FF7A18]/50 ${err ? 'border-[#FF4A4A] bg-[#1A0A0A]' : 'border-[#222]'}`} />
                        )}
                        {err && <div className="text-[11px] text-[#FF5A5A] font-[600]">{err}</div>}
                      </div>
                    );
                  })}
                  <button onClick={handlePublicSubmit} className="w-full h-[52px] bg-[#FF7A18] hover:bg-[#FF8A2E] text-black font-[800] tracking-[0.14em] text-[14px] rounded-[12px] faceted-sm shadow-[0_0_30px_rgba(255,122,24,0.35)] transition-colors">{publicCampaign.context==='FAMILY' ? 'SUBMIT →' : 'SUBMIT MEASUREMENTS →'}</button>
                  <p className="text-center text-[11px] mono text-[#5A5A66]">{publicCampaign.context==='FAMILY' ? "Your sizes will be added to the group. You won't see others' responses." : `Your information will be submitted to ${publicCampaign.organization || 'the organizer'}. You won’t see other participants’ responses.`}</p>
                </div>
                <div className="text-center"><span className="text-[11px] mono tracking-[0.16em] text-[#3A3A44]">POWERED BY MW • A GEESKIT PRODUCT • COLLECT GROUP SIZES WITH CONFIDENCE</span></div>
              </div>
            )}
          </div>
        )}

        {view==='confirmed' && publicCampaign && (
          <div className="max-w-[560px] mx-auto">
            <div className="bg-[#101012] border border-[#222] rounded-[16px] p-8 md:p-10 text-center faceted">
              <div className={`w-[72px] h-[72px] mx-auto rounded-[16px] border flex items-center justify-center ${publicCampaign.context==='FAMILY' ? 'bg-[#1A120E] border-[#FF7A18]/20 shadow-[0_0_30px_rgba(255,122,24,0.15)]' : 'bg-[#0F1F0F] border-[#1E3A1E] shadow-[0_0_30px_rgba(92,255,122,0.15)]'}`}>
                <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center text-black font-[800] text-[20px] ${publicCampaign.context==='FAMILY' ? 'bg-[#FF7A18]' : 'bg-[#5CFF7A]'}`}>✓</div>
              </div>
              <h1 className="mt-6 text-[22px] font-[800] tracking-[0.06em] uppercase">{publicCampaign.context==='FAMILY' ? 'DONE' : 'SUBMISSION RECEIVED'}</h1>
              <p className="mt-3 text-[14px] leading-[1.6] text-[#9A9AA3]">{publicCampaign.context==='FAMILY' ? `Your sizes have been added to ${publicCampaign.name}.` : <>Your information has been successfully submitted to <span className="text-[#E8E8EA] font-[600]">{publicCampaign.organization || 'the organizer'}</span> for <span className="text-[#E8E8EA] font-[600]">{publicCampaign.name}</span>.</>}</p>
              <div className="mt-8 grid gap-3">
                <button onClick={()=> { setPublicValues({}); setPublicErrors({}); setView('public'); }} className="w-full h-[48px] bg-[#0A0A0C] border border-[#222] rounded-[10px] text-[12px] font-[700] tracking-[0.12em] hover:bg-[#111]">{publicCampaign.context==='FAMILY' ? 'ADD ANOTHER FAMILY MEMBER' : 'SUBMIT ANOTHER RESPONSE'}</button>
                <button onClick={()=> setView('landing')} className="w-full h-[48px] bg-[#0A0A0C] border border-[#1A1A1E] rounded-[10px] text-[11px] mono text-[#6A6A72]">WHAT IS MW? • LEARN MORE</button>
              </div>
              <div className="mt-8 pt-6 border-t border-[#1A1A1E] flex items-center justify-center gap-2">
                <div className="w-[28px] h-[28px] bg-black border border-[#222] rounded-[6px] overflow-hidden"><img src={mwLogo} alt="MW" className="w-full h-full object-contain" /></div>
                <span className="text-[10px] mono tracking-[0.16em] text-[#5A5A66]">MW • MEASUREMENT WALLET • A GEESKIT PRODUCT</span>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-16 md:mt-24 border-t border-[#141416] pt-6 pb-10 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[28px] h-[28px] bg-black border border-[#222] rounded-[6px] overflow-hidden"><img src={mwLogo} alt="MW" className="w-full h-full object-contain" /></div>
            <div>
              <div className="text-[11px] font-[800] tracking-[0.16em]">MW • MEASUREMENT WALLET</div>
              <div className="text-[10px] mono text-[#5A5A66]">COLLECT GROUP SIZES WITH CONFIDENCE</div>
            </div>
          </div>
          <div className="text-[10px] mono tracking-[0.18em] text-[#4A4A52]">A GEESKIT PRODUCT</div>
        </footer>
      </main>

      <style>{`@keyframes slideUp{from{transform:translate(-50%,12px);opacity:0}to{transform:translate(-50%,0);opacity:1}}`}</style>
    </div>
  );
}