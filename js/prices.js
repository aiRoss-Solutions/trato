// Trato · motor de precios simulado. Hace el papel del proveedor de liquidez (plataforma multibanco):
// streaming indicativo (SEP), precio ejecutable bajo petición (RFS) y puntos forward por tenor.
import { RATES, PAIRS, TENORS, HOLIDAYS } from './data.js';
import * as SYNC from './sync.js';

const state = {};           // par -> {mid, prevBid, prevAsk}
const subs = new Set();
let timer = null;
let connected = true;
let lastTick = Date.now();

for (const p of PAIRS) state[p] = { mid: RATES[p].mid, prevBid: null, prevAsk: null };

export function pip(pair){ const d = RATES[pair].dec; return Math.pow(10, -d); }
export function fmt(pair, v){ return v.toFixed(RATES[pair].dec); }
export function dec(pair){ return RATES[pair].dec; }

// ---------- proveedores de liquidez (multi-proveedor simulado) ----------
// Cada proveedor cotiza el mismo mid con su propio sesgo (en pips) y su propio ancho de spread. "BEST" elige por lado el mejor.
export const PROVIDERS = [
  { id:'LPA', name:'Proveedor A', short:'A', skew:+0.10, spreadMult:1.00 },
  { id:'LPB', name:'Proveedor B', short:'B', skew:-0.05, spreadMult:0.90 },
  { id:'LPC', name:'Proveedor C', short:'C', skew:+0.00, spreadMult:1.15 },
];
let provider = 'BEST';
const provSubs = new Set();
export function getProvider(){ return provider; }
export function providerName(id=provider){ return id==='BEST' ? 'Mejor precio' : (PROVIDERS.find(p=>p.id===id)?.name || id); }
export function setProvider(id, {silent=false}={}){ provider = (id==='BEST' || PROVIDERS.some(p=>p.id===id)) ? id : 'BEST'; for(const f of provSubs) f(provider); if(!silent) SYNC.send('provider', provider); }
export function onProvider(f){ provSubs.add(f); return ()=>provSubs.delete(f); }
SYNC.on('provider', id=>setProvider(id, {silent:true}));
function quoteOf(pair, p){ const s = state[pair]; const half = RATES[pair].spread * p.spreadMult * pip(pair) / 2; const mid = s.mid + p.skew*pip(pair); return { bid: mid-half, ask: mid+half, mid, id:p.id, short:p.short }; }
export function quotes(pair){ return PROVIDERS.map(p=>quoteOf(pair,p)); }

// Precio de trading (PT): lo que "viene del proveedor" seleccionado; con "Mejor precio", el mejor bid y el mejor ask entre todos.
export function tradingPrice(pair){
  const qs = quotes(pair);
  if(provider!=='BEST'){ const q = qs.find(x=>x.id===provider) || qs[0]; return { bid:q.bid, ask:q.ask, mid:q.mid, src:{bid:q.short, ask:q.short} }; }
  const b = qs.reduce((a,x)=>x.bid>a.bid?x:a), k = qs.reduce((a,x)=>x.ask<a.ask?x:a);
  return { bid:b.bid, ask:k.ask, mid:state[pair].mid, src:{bid:b.short, ask:k.short} };
}

// Puntos forward para una fecha valor (en unidades de precio), aprox lineal por días.
export function fwdPoints(pair, valueDate){
  const days = daysFromSpot(valueDate);
  return RATES[pair].fwdY * (days/365);
}
export function daysFromSpot(valueDate){
  const spot = addBiz(new Date(), 2);
  return Math.round((valueDate - spot)/86400000);
}

// Calendario: días hábiles y festivos
export function isBiz(d){ const k=d.toISOString().slice(0,10); return d.getDay()!==0 && d.getDay()!==6 && !HOLIDAYS.includes(k); }
export function addBiz(d, n){ const x=new Date(d); x.setHours(12,0,0,0); const step=n<0?-1:1; let i=0; while(i<Math.abs(n)){ x.setDate(x.getDate()+step); if(isBiz(x)) i++; } return x; }
export function nextBiz(d){ const x=new Date(d); x.setHours(12,0,0,0); while(!isBiz(x)) x.setDate(x.getDate()+1); return x; }
export function tenorDate(k){
  const t = TENORS.find(t=>t.k===k); const today=new Date(); today.setHours(12,0,0,0);
  if(k==='TOD') return today; if(k==='TOM') return addBiz(today,1); const spot = addBiz(today,2); if(k==='SPOT') return spot;
  const x = new Date(spot);
  if(t.w) x.setDate(x.getDate()+7*t.w);
  else { const dom=x.getDate(); x.setMonth(x.getMonth()+t.m); if(x.getDate()!==dom) x.setDate(0); }   // fin de mes: último día del mes destino
  return nextBiz(x);
}
export function tenorFor(date){
  const spot = addBiz(new Date(),2), today=new Date(); today.setHours(12,0,0,0);
  const dd = Math.round((date-today)/86400000);
  if(dd<=0) return 'TOD'; if(date.toDateString()===addBiz(today,1).toDateString()) return 'TOM'; if(date.toDateString()===spot.toDateString()) return 'SPOT';
  return date>spot ? 'FWD' : 'TOD';
}
export const iso = d => d.toISOString().slice(0,10);
export const es = d => { const x = typeof d==='string'? new Date(d+'T12:00:00') : d; return x.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}); };

// Random walk. Cada tick mueve el mid y notifica a los suscriptores.
function tick(){
  if(!connected) return;
  lastTick = Date.now();
  for (const p of PAIRS){
    const s = state[p]; const vol = RATES[p].spread * pip(p) * 0.9;
    const dr = (Math.random()-0.5) * vol * (Math.random()<0.15 ? 3 : 1);
    s.mid = +(s.mid + dr).toFixed(RATES[p].dec + 1);
  }
  for (const fn of subs) fn();
}
export function start(){ if(!timer) timer = setInterval(tick, 650); }
export function subscribe(fn){ subs.add(fn); return ()=>subs.delete(fn); }
export function secondsSinceTick(){ return Math.floor((Date.now()-lastTick)/1000); }
export function setConnected(v){ connected = v; if(v) lastTick = Date.now(); }
export function isConnected(){ return connected; }

// RFS: stream ejecutable durante 60 s, con precio ligeramente mejor que el indicativo y ticks propios.
export function openRFS(pair, onTick){
  let alive = true; const started = Date.now();
  const h = setInterval(()=>{
    if(!alive) return;
    const pt = tradingPrice(pair); const tight = RATES[pair].spread * pip(pair) * 0.15;
    onTick({ bid: pt.bid + tight, ask: pt.ask - tight, mid: pt.mid, left: Math.max(0, 60 - Math.floor((Date.now()-started)/1000)) });
  }, 500);
  return { close(){ alive=false; clearInterval(h); }, get alive(){ return alive; } };
}
