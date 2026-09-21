// Trato · helpers de interfaz (DOM, toasts, modales, menú contextual, formatos)
export const $ = (s, r=document) => r.querySelector(s);
export const $$ = (s, r=document) => [...r.querySelectorAll(s)];
export function h(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const nfCache = {};
export function fmtN(v, d=2){ if(v===null||v===undefined||isNaN(v)) return '—'; nfCache[d] ??= new Intl.NumberFormat('es-ES',{minimumFractionDigits:d, maximumFractionDigits:d}); return nfCache[d].format(v); }
export function fmtPx(v, d){ return fmtN(v, d).replace('.', ' '); }
// precio grande con pips destacados: 1,12|58|8
export function bigPx(v, d){
  const s = v.toFixed(d).replace('.', ',');
  if(d<=2) return `<span>${s.slice(0,-2)}</span><span class="big">${s.slice(-2)}</span>`;
  return `<span>${s.slice(0,-3)}</span><span class="big">${s.slice(-3,-1)}</span><span class="last">${s.slice(-1)}</span>`;
}
// atajos de importe: 30K → 30.000 · 6M → 6.000.000
export function parseAmount(str){
  if(str===null||str===undefined) return 0;
  let s = String(str).trim().toUpperCase().replace(/\./g,'').replace(',', '.');
  let mult = 1; if(s.endsWith('K')){mult=1e3; s=s.slice(0,-1);} else if(s.endsWith('M')){mult=1e6; s=s.slice(0,-1);}
  const v = parseFloat(s); return isNaN(v) ? 0 : v*mult;
}

// ---------- toasts ----------
let toastBox;
export function toast(msg, type=''){
  toastBox ??= (()=>{ const b=h('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(b); return b; })();
  const t = h(`<div class="toast ${type}">${esc(msg)}</div>`); toastBox.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, 4200);
}

// ---------- entorno y reloj del sistema (los traders miran la fecha para saber si están en PRO o en pruebas) ----------
export function envLabel(){
  const h=location.hostname, p=location.pathname;
  if(h==='localhost'||h==='127.0.0.1') return 'LOCAL';
  if(/\/uat\//.test(p)) return 'UAT';
  return 'PRO';
}
export function sysClock(el){
  const paint=()=>{ const d=new Date(); el.textContent = d.toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).replace('.', '') + ' · ' + d.toLocaleTimeString('es-ES'); };
  paint(); return setInterval(paint, 1000);
}

// ---------- modal ----------
export function modal({title, body, actions=[], width, onClose}){
  const bg = h(`<div class="modal-bg"><div class="modal" ${width?`style="width:min(${width}px,94vw)"`:''}>
    <div class="m-head"><h2>${esc(title)}</h2><span style="flex:1"></span><button class="icon-btn" data-x>✕</button></div>
    <div class="m-body"></div><div class="m-foot"></div></div></div>`);
  const mb = $('.m-body', bg), mf = $('.m-foot', bg);
  if(typeof body==='string') mb.innerHTML = body; else mb.appendChild(body);
  const api = { el:bg, body:mb, foot:mf, close(){ bg.remove(); onClose?.(); } };
  for(const a of actions){ const b = h(`<button class="btn ${a.cls||'btn-ghost'}">${esc(a.label)}</button>`); b.onclick = ()=>a.onClick?.(api); if(a.id) b.dataset.id=a.id; mf.appendChild(b); }
  $('[data-x]', bg).onclick = api.close;
  bg.addEventListener('mousedown', e=>{ if(e.target===bg && !api.sticky) api.close(); });
  const onKey = e => { if(e.key==='Escape' && document.body.contains(bg)){ e.stopPropagation(); api.close(); } };
  document.addEventListener('keydown', onKey); const _close = api.close; api.close = ()=>{ document.removeEventListener('keydown', onKey); _close(); };
  bg.querySelector('.modal').setAttribute('role','dialog'); bg.querySelector('.modal').setAttribute('aria-modal','true'); bg.querySelector('.modal').setAttribute('aria-label', title);
  document.body.appendChild(bg);
  const first = bg.querySelector('.m-body input:not([disabled]), .m-body select, .m-body button, .m-foot button'); first?.focus();
  return api;
}

// ---------- menú contextual ----------
let menuEl;
export function cmenu(x, y, items){
  closeMenu();
  menuEl = h('<div class="cmenu"></div>');
  for(const it of items){
    if(it==='-'){ menuEl.appendChild(h('<div style="border-top:1px solid var(--line);margin:4px 0"></div>')); continue; }
    const b = h(`<button ${it.disabled?'disabled':''}>${esc(it.label)}</button>`); b.onclick = ()=>{ closeMenu(); it.onClick?.(); }; menuEl.appendChild(b);
  }
  document.body.appendChild(menuEl);
  const r = menuEl.getBoundingClientRect(); menuEl.style.left = Math.min(x, innerWidth-r.width-8)+'px'; menuEl.style.top = Math.min(y, innerHeight-r.height-8)+'px';
  setTimeout(()=>document.addEventListener('mousedown', onDoc, {once:true}),0);
}
function onDoc(e){ if(menuEl && !menuEl.contains(e.target)) closeMenu(); else if(menuEl) setTimeout(()=>document.addEventListener('mousedown', onDoc, {once:true}),0); }
export function closeMenu(){ menuEl?.remove(); menuEl=null; }

export function stateChip(s, map){ const cls = map[s] || 'mkt'; return `<span class="st ${cls}">${esc(s)}</span>`; }
export function downloadCSV(name, rows){
  const csv = rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'})); a.download = name; a.click();
}
