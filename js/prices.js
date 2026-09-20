// Trato · motor de precios simulado. Hace el papel del proveedor de liquidez (plataforma multibanco):
// streaming indicativo (SEP), precio ejecutable bajo petición (RFS) y puntos forward por tenor.
import { RATES, PAIRS, TENORS, HOLIDAYS } from './data.js';

const state = {};           // par -> {mid, prevBid, prevAsk}
const subs = new Set();
let timer = null;
let connected = true;
let lastTick = Date.now();

for (const p of PAIRS) state[p] = { mid: RATES[p].mid, prevBid: null, prevAsk: null };

export function pip(pair){ const d = RATES[pair].dec; return Math.pow(10, -d); }
export function fmt(pair, v){ return v.toFixed(RATES[pair].dec); }
export function dec(pair){ return RATES[pair].dec; }

// Precio de trading (PT): mid ± medio spread de trading. Es lo que "vendría del proveedor".
export function tradingPrice(pair){
  const s = state[pair]; const half = RATES[pair].spread * pip(pair) / 2;
  return { bid: s.mid - half, ask: s.mid + half, mid: s.mid };
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
