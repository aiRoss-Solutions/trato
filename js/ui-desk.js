// Trato · canales SALA / TEL: cabecera, cabecera pre-trade, workspaces, streaming, blotters, panel derecho
import { $, $$, h, esc, fmtN, bigPx, toast, modal, parseAmount, cmenu } from './ui.js';
import * as C from './core.js';
import * as PX from './prices.js';
import { S, resetTilesFromWorkspace } from './state.js';
import { PAIRS, TENORS, FLAGS, BRAND, CLIENTS } from './data.js';
import { renderDock } from './ui-blotters.js';
import { openTicket, openOrderBoleta, openAnticipo, openCancelacion, openCancelGenerica, masInfo } from './ui-ticket.js';

let root, perms, unsubs = [];
const q = s => $(s, root);

export function mountDesk(el, user, {onLogout, onToggleConsole, onTheme}){
  root = el; S.user = user; perms = user.perms; S.client = null; S.ctx = {cargo:null,abono:null,linea:null,ordenante:null};
  resetTilesFromWorkspace();
  root.innerHTML = `
    <div class="main">
      <div class="topbar" data-topbar></div>
      <div class="pretrade" data-pretrade></div>
      <div class="center" data-center></div>
      <div class="dock" data-dock></div>
    </div>
    <div class="rpanel" data-rpanel></div>`;
  renderTopbar(); renderPretrade(); renderCenter(); renderDockNow(); renderRPanel({onLogout,onToggleConsole,onTheme});
  unsubs.forEach(f=>f()); unsubs = [ PX.subscribe(onTick), C.onOps(()=>renderDockNow()) ];
  setInterval(paintStale, 1000);
}

// ---------------- cabecera ----------------
function renderTopbar(){
  const c = S.client, ctx = S.ctx;
  const cliOpts = CLIENTS.map(x=>`<option value="${esc(x.nombre)}">${esc(x.nif)} · ${esc(x.nombre)}</option>`).join('') + (perms.generico ? `<option value="Cliente genérico">Cliente genérico</option>` : '');
  const sel = (label, key, items, getL, getV) => `<div class="ctx"><label>${label}</label><select data-ctx="${key}" ${!c||c.generic?'disabled':''}>${items.length? items.map((it,i)=>`<option value="${i}" ${ctx[key]===it?'selected':''}>${esc(getL(it))}</option>`).join('') : '<option>—</option>'}</select></div>`;
  q('[data-topbar]').innerHTML = `
    <div class="brand"><div class="mark">T</div><b>${BRAND.name}</b></div>
    <button class="modebtn ${S.mode==='FLEX'?'on':''}" data-mode><select data-modesel><option value="SPOTFWD" ${S.mode==='SPOTFWD'?'selected':''}>SPOT / FWD</option><option value="FLEX" ${S.mode==='FLEX'?'selected':''}>FWD FLEXIBLE</option></select></button>
    <div class="cli"><label>Cliente</label><input list="cli-list" data-cli placeholder="Nombre o NIF…" value="${esc(c?.nombre||'')}"><datalist id="cli-list">${cliOpts}</datalist></div>
    ${sel('Cuenta de cargo','cargo', c&&!c.generic? c.cuentas:[], x=>x.n)}
    ${sel('Cuenta de abono','abono', c&&!c.generic? c.cuentas:[], x=>x.n)}
    ${sel('Línea seguro de cambio','linea', c&&!c.generic? c.lineas:[], x=>`${x.n} · ${x.div}`)}
    ${sel('Ordenante','ordenante', c&&!c.generic? c.ordenantes:[], x=>`${x.nif} ${x.apoderado?'· apoderado':''}`)}
    <div class="tright">
    <button class="chip" data-ws title="Workspaces">▦ ${esc(S.workspaces[S.activeWs].name)}</button>
    <button class="modebtn" data-rfs title="Orden limitada · Call order · Aviso">RFS</button>
    <span class="chip">${esc(S.user.nombre)} · <span class="mono">${esc(S.user.canal)}</span></span>
    <button class="icon-btn" data-menu title="Menú">☰</button>
    </div>`;
  const cli = q('[data-cli]');
  cli.onchange = e => selectClient(e.target.value);
  cli.oninput = e => { const v=e.target.value.trim(); if(CLIENTS.some(x=>x.nombre===v || x.nif===v) || /^cliente gen[ée]rico$/i.test(v)) selectClient(v); };
  cli.onkeydown = e => { if(e.key==='Enter'){ e.preventDefault(); selectClient(e.target.value); } };
  $$('[data-ctx]', root).forEach(s=>s.onchange = ()=>{ const k=s.dataset.ctx; const list = k==='linea'? c.lineas : k==='ordenante'? c.ordenantes : c.cuentas; S.ctx[k] = list[+s.value]; renderPretrade(); C.log('core','contexto de operación', {[k]: S.ctx[k]?.n || S.ctx[k]?.nif}); });
  q('[data-modesel]').onchange = e => { S.mode = e.target.value; renderTopbar(); renderCenter(); };
  q('[data-ws]').onclick = openWorkspaces;
  q('[data-rfs]').onclick = ()=>openOrderBoleta({perms, onDone:renderDockNow});
  q('[data-menu]').onclick = ()=>q('[data-rpanel]').classList.toggle('open');
}
function selectClient(val){
  val = (val||'').trim(); if(!val){ S.client=null; S.ctx={cargo:null,abono:null,linea:null,ordenante:null}; rerenderAll(); return; }
  if(/gen[ée]rico/i.test(val)){ if(!perms.generico){ toast('Su perfil no tiene permiso para operar con cliente genérico.','err'); return; } if(!S.client){ toast('Conéctese primero con un cliente real para poder usar el cliente genérico.','err'); return; }
    S.client = C.generic(); S.ctx={cargo:null,abono:null,linea:null,ordenante:null}; S.tiles.forEach(t=>t.tipo='OTROS'); C.log('core','cliente genérico activado', {}); toast('Cliente genérico: solo claves de arbitraje, sin margen de cliente.'); rerenderAll(); return; }
  const c = C.findClient(val) || C.findClient(val.split(' · ').pop());
  if(!c){ toast('Cliente no encontrado en el core.','err'); return; }
  S.client = c; const d = C.getDatosEmpresa(c);
  S.ctx = { cargo: c.cuentas.find(x=>x.div==='EUR')||c.cuentas[0]||null, abono: c.cuentas.find(x=>x.div!=='EUR')||c.cuentas[0]||null, linea: c.lineas[0]||null, ordenante: c.ordenantes.find(o=>o.apoderado)||c.ordenantes[0]||null };
  if(c.mifid==='ko') toast('Atención: cliente no apto MiFID. Las vistas de contratación quedan limitadas.','err');
  rerenderAll();
}
function rerenderAll(){ renderTopbar(); renderPretrade(); renderCenter(); renderDockNow(); }

// ---------------- cabecera pre-trade ----------------
function renderPretrade(){
  const c = S.client; const g = !c || c.generic; const ctx = S.ctx;
  const kv = (k,v) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`;
  const mifid = c && !g ? `<span class="dot ${c.mifid==='ok'?'ok':c.mifid==='warn'?'warn':'ko'}"></span>` : '—';
  const margen = c && !g ? (c.margenPersonalizado ? `personalizado` : fmtN(c.margenPorMil,2)+' ‰') : '—';
  q('[data-pretrade]').className = 'pretrade'+(g?' generic':'');
  q('[data-pretrade]').innerHTML =
    kv('ID Persona', g?'—':esc(c.id)) + kv('Tutor', g?'—':esc(c.tutor)) + kv('Saldo cuenta origen', g||!ctx.cargo?'—':fmtN(ctx.cargo.saldo,2)+' '+ctx.cargo.div) +
    kv('Límite línea seguro cambio', g||!ctx.linea?'—':fmtN(ctx.linea.disp,2)+' '+ctx.linea.div) + kv('Estado MiFID', mifid) + kv('Titular MiFID', g?'—':esc(c.titularMifid)) +
    kv('Código LEI', g?'—':(c.lei==='—'?'No':'Sí')) + kv('Fecha renovación LEI', g||c.leiRenov==='—'?'—':PX.es(c.leiRenov)) + kv('Email cliente', g?'—':esc(c.email)) +
    kv('Teléfono', g?'—':esc(c.tel)) + kv('Ordenante', g||!ctx.ordenante?'—':esc(ctx.ordenante.nombre)+(ctx.ordenante.mifid==='ok'?' <span class="dot ok"></span>':' <span class="dot warn"></span>')) +
    kv(c&&!g&&c.margenPersonalizado?'Margen personalizado':'Margen (‰)', c&&!g&&c.margenPersonalizado?'Sí':margen);
}

// ---------------- centro: streaming ----------------
function renderCenter(){
  const center = q('[data-center]');
  if(S.mode==='FLEX'){
    const t = S.flexTile ??= { pair:'EUR/USD', tipo:'OTROS', obs:'', divOp:'USD', amount:0, tenor:'3M', valueDate:PX.tenorDate('3M'), fdc:null };
    t.valueDate ??= PX.tenorDate(t.tenor); const fde = C.fdeFor(t.valueDate); t.fdc ??= fde;
    center.innerHTML = `<div class="notice" style="margin:0 0 12px">Seguro de cambio <b>flexible</b>: producto no estándar. La fecha de disponibilidad estándar (FDE) es el 20 % de los días naturales hasta vencimiento; el cliente elige desde qué fecha (FDC) podrá anticipar o cancelar.</div><div class="grid" data-grid></div>`;
    const grid = $('[data-grid]',center); grid.appendChild(renderTile(t, 0, true)); return;
  }
  center.innerHTML = `<div class="grid" data-grid></div>`;
  const grid = $('[data-grid]', center);
  S.tiles.forEach((t,i)=>grid.appendChild(renderTile(t,i,false)));
  const add = h(`<div class="tile add" title="Añadir par">+</div>`); add.onclick = ()=>pickPair(null); grid.appendChild(add);
  onTick();
}
function renderTile(t, i, flex){
  const g = S.client?.generic; const [base, quote] = t.pair.split('/'); const oth = t.divOp===base?quote:base;
  const el = h(`<div class="tile" data-i="${i}">
    <div class="t-head"><span class="pair" data-pair title="Cambiar par">${FLAGS[base]||''} ${esc(t.pair)} ${FLAGS[quote]||''}</span>
      <span class="seg"><button data-tipo="OTROS" class="${t.tipo==='OTROS'?'on':''}" title="Clave de arbitraje y seguros de cambio">Otros</button><button data-tipo="CONVERSION" class="${t.tipo==='CONVERSION'?'on':''}" ${g||flex?'disabled':''} title="Contado: spot, hoy y mañana">Conversión</button></span>
      <span class="obs"><input data-obs placeholder="${t.tipo==='OTROS'&&C.cfg.obsObligatorias?'Motivo / observaciones · obligatorio':'Observaciones'}" value="${esc(t.obs)}"></span>${flex?'':'<button class="icon-btn close" data-close>✕</button>'}</div>
    <div class="prices">
      <div class="side" data-side="COMPRAR"><div class="lbl"><b>COMPRAR ${esc(t.divOp)}</b><span>▾</span></div><div class="px" data-px="COMPRAR">—</div></div>
      <div class="side" data-side="VENDER"><div class="lbl"><b>VENDER ${esc(t.divOp)}</b><span>▾</span></div><div class="px" data-px="VENDER">—</div></div>
    </div>
    <div class="t-row"><button class="swap" data-swap title="Operar en ${esc(oth)}">⇄ ${esc(t.divOp)}</button><input class="amt" data-amt placeholder="0 · 30K · 6M" value="${t.amount?fmtN(t.amount,0):''}"></div>
    ${flex?`<div class="t-row"><span class="tiny muted">FDE</span><span class="mono small" data-fde>${PX.es(C.fdeFor(t.valueDate))}</span><span class="tiny muted" style="margin-left:10px">FDC</span><input type="date" data-fdc value="${PX.iso(t.fdc)}" min="${PX.iso(C.fdeFor(t.valueDate))}" max="${PX.iso(t.valueDate)}" style="height:24px;padding:0 6px"></div>`:''}
    <div class="foot"><div title="Tiempo sin recibir precios"><span data-stale>00:00:00</span></div><div><input type="date" data-date value="${PX.iso(t.valueDate||PX.tenorDate(t.tenor))}"></div><div><select data-tenor>${TENORS.filter(x=> t.tipo==='CONVERSION' ? ['TOD','TOM','SPOT'].includes(x.k) : true).map(x=>`<option value="${x.k}" ${t.tenor===x.k?'selected':''}>${x.k}</option>`).join('')}</select></div></div>
  </div>`);
  $('[data-pair]',el).onclick = ()=>pickPair(i, flex);
  $$('[data-tipo]',el).forEach(b=>b.onclick=()=>{ t.tipo=b.dataset.tipo; if(t.tipo==='CONVERSION' && !['TOD','TOM','SPOT'].includes(t.tenor)){ t.tenor='SPOT'; t.valueDate=PX.tenorDate('SPOT'); } renderCenter(); });
  $('[data-obs]',el).oninput = e=>{ t.obs=e.target.value; };
  $('[data-close]',el)?.addEventListener('click', ()=>{ S.tiles.splice(i,1); renderCenter(); });
  $('[data-swap]',el).onclick = ()=>{ t.divOp = oth; renderCenter(); };
  const amt = $('[data-amt]',el); amt.onblur = ()=>{ t.amount = parseAmount(amt.value); amt.value = t.amount? fmtN(t.amount,0):''; }; amt.onkeydown = e=>{ if(e.key==='Enter'){ amt.blur(); } };
  $('[data-date]',el).onchange = e=>{ const dt=new Date(e.target.value+'T12:00:00'); if(!PX.isBiz(dt)){ toast('Fecha no hábil. Se ajusta al siguiente día hábil.'); e.target.value=PX.iso(PX.addBiz(dt,1)); return $('[data-date]',el).onchange(e); } t.valueDate=dt; t.tenor=PX.tenorFor(dt); if(flex){ t.fdc=null; } renderCenter(); };
  $('[data-tenor]',el).onchange = e=>{ t.tenor=e.target.value; t.valueDate=PX.tenorDate(t.tenor); if(flex) t.fdc=null; renderCenter(); };
  $('[data-fdc]',el)?.addEventListener('change', e=>{ t.fdc = new Date(e.target.value+'T12:00:00'); });
  $$('[data-side]',el).forEach(s=>s.onclick=()=>{ if(!S.client){ toast('Seleccione un cliente.','err'); $('[data-cli]').focus(); return; } if(!t.amount){ toast('Indique un importe antes de solicitar precio.','err'); amt.classList.add('req'); amt.focus(); return; }
    const obsIn = $('[data-obs]',el); const esClave = t.tipo==='OTROS' && S.mode!=='FLEX' && PX.tenorFor(t.valueDate||PX.tenorDate(t.tenor))!=='FWD';
    if(C.cfg.obsObligatorias && esClave && !t.obs.trim()){ toast('Indique el motivo en «Observaciones»: obligatorio en claves de arbitraje (trazabilidad). Se puede relajar en Menú → Demo.','err'); obsIn.classList.add('req'); obsIn.focus(); return; }
    openTicket(el, t, s.dataset.side, { perms, onDone:()=>renderCenter() }); });
  $('[data-obs]',el).addEventListener('input', e=>e.target.classList.remove('req')); amt.addEventListener('input', ()=>amt.classList.remove('req'));
  return el;
}
function pickPair(i, flex){
  const cur = i===null ? null : (flex ? S.flexTile : S.tiles[i]); const ccys = [...new Set(PAIRS.flatMap(p=>p.split('/')))];
  const body = h(`<div class="form"><div class="field"><label>Divisa base</label><select data-b>${ccys.map(c=>`<option ${cur&&cur.pair.split('/')[0]===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="field"><label>Divisa cotización</label><select data-q>${ccys.map(c=>`<option ${cur&&cur.pair.split('/')[1]===c?'selected':''}>${c}</option>`).join('')}</select></div></div><div class="notice">Disponibles: ${PAIRS.join(' · ')}</div>`);
  modal({ title: cur?'Cambiar par de divisas':'Añadir par de divisas', width:520, body, actions:[{label:'Cancelar',onClick:a=>a.close()},{label:'Aplicar',cls:'btn-primary',onClick(a){
    const p = `${$('[data-b]',body).value}/${$('[data-q]',body).value}`; if(!PAIRS.includes(p)){ toast('Par no disponible en el proveedor de precios.','err'); return; }
    if(cur){ cur.pair=p; cur.divOp=p.split('/')[1]; } else S.tiles.push({ pair:p, tipo:'OTROS', obs:'', divOp:p.split('/')[1], amount:0, tenor:'SPOT', valueDate:null });
    renderCenter(); a.close(); }}] });
}
// tick de precios: solo repinta los números
let prev = {};
function onTick(){
  const c = S.client; const tiles = S.mode==='FLEX' ? [S.flexTile] : S.tiles;
  $$('.tile:not(.ticket):not(.add)', root).forEach((el)=>{
    const i = +el.dataset.i; const t = tiles[i]; if(!t) return; const pt = PX.tradingPrice(t.pair); const d = PX.dec(t.pair);
    const vd = t.valueDate || PX.tenorDate(t.tenor); const kind = PX.tenorFor(vd)==='FWD'?'fwd':'spot';
    const m = C.clientMarginPorMil(c, kind);
    for(const dir of ['COMPRAR','VENDER']){
      const b = C.buildPrice({ pair:t.pair, dir, divOp:t.divOp, pt, valueDate: kind==='fwd'? vd : null, marginPorMil:m });
      const k = t.pair+dir+i; const node = $(`[data-px="${dir}"]`, el); const v = b.precioFinal;
      node.innerHTML = bigPx(v, d); node.className = 'px ' + (prev[k]===undefined ? '' : v>prev[k] ? 'up' : v<prev[k] ? 'down' : ''); prev[k]=v;
    }
  });
}
function paintStale(){ const s = PX.secondsSinceTick(); const txt = new Date(s*1000).toISOString().slice(11,19); $$('[data-stale]', root).forEach(n=>{ n.textContent = txt; n.parentElement.classList.toggle('stale', s>5); }); }

// ---------------- workspaces ----------------
function openWorkspaces(){
  const body = h(`<div><div class="notice">Por defecto <b>G10</b>. Cree plantillas propias, ordénelas arrastrando y marque una como predeterminada con la estrella.</div>
    <div data-list></div><div style="margin-top:12px;display:flex;gap:8px;align-items:center"><input data-name placeholder="Nombre de la plantilla" style="flex:1"><button class="btn btn-navy btn-sm" data-save>Guardar actual como nueva</button></div></div>`);
  const paint = ()=>{ $('[data-list]',body).innerHTML = S.workspaces.map((w,i)=>`<div class="row" style="display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid var(--line)">
      <button data-fav="${i}" title="Predeterminado" style="font-size:16px;color:${w.fav?'#F2B134':'var(--ink-3)'}">★</button><b style="min-width:100px">${esc(w.name)}</b><span class="muted small" style="flex:1">${w.pairs.join(' · ')}</span>
      <button class="btn btn-ghost btn-sm" data-use="${i}">Abrir</button>${i>0?`<button class="btn btn-danger btn-sm" data-del="${i}">Borrar</button>`:''}</div>`).join('');
    $$('[data-fav]',body).forEach(b=>b.onclick=()=>{ S.workspaces.forEach((w,j)=>w.fav = j===+b.dataset.fav ? !w.fav : false); if(!S.workspaces.some(w=>w.fav)) S.workspaces[0].fav=true; paint(); });
    $$('[data-use]',body).forEach(b=>b.onclick=()=>{ S.activeWs=+b.dataset.use; resetTilesFromWorkspace(); renderTopbar(); renderCenter(); m.close(); });
    $$('[data-del]',body).forEach(b=>b.onclick=()=>{ S.workspaces.splice(+b.dataset.del,1); if(S.activeWs>=S.workspaces.length) S.activeWs=0; paint(); }); };
  const m = modal({ title:'Workspaces', width:720, body, actions:[{label:'Cerrar',onClick:a=>a.close()}] }); paint();
  $('[data-save]',body).onclick=()=>{ const n=$('[data-name]',body).value.trim(); if(!n){ toast('Indique un nombre.','err'); return; } S.workspaces.push({ name:n, pairs:S.tiles.map(t=>t.pair), fav:false }); $('[data-name]',body).value=''; paint(); toast('Workspace guardado','ok'); };
}

// ---------------- dock ----------------
function renderDockNow(){
  renderDock(q('[data-dock]'), { perms, onAction(action, op){
    if(action==='anticipar') openAnticipo(op,{perms,onDone:renderDockNow});
    else if(action==='cancelar') openCancelacion(op,{perms,onDone:renderDockNow});
    else if(action==='cancelarOrden'){ C.cancelOrder(op); toast('Orden cancelada.','ok'); }
    else if(action==='completarMarkup'){ C.completeMarkup(op).then(()=>toast('Markup completado. Operación enviada al core.','ok')); }
    else if(action==='cancelarGenerica') openCancelGenerica(op,{onDone:renderDockNow});
    else if(action==='masInfo') masInfo(op);
  }});
}

// ---------------- panel derecho ----------------
function renderRPanel({onLogout,onToggleConsole,onTheme}){
  const p = q('[data-rpanel]');
  p.innerHTML = `<div class="p-head">${esc(BRAND.name)} <span class="muted small" style="font-weight:400">· ${esc(S.user.desc)}</span><span style="flex:1"></span><button class="icon-btn" data-x>✕</button></div>
    <div class="p-body">
      <div class="sect">Operativa</div>
      <button class="item" data-go="SPOTFWD">Spot / Forward</button><button class="item" data-go="FLEX">Seguro de cambio flexible</button><button class="item" data-go="RFS">Orden limitada · Call order · Aviso</button>
      <div class="sect">Vista</div>
      <button class="item" data-go="WS">Workspaces</button><button class="item" data-go="DOCK">Plegar / desplegar blotter</button>
      <div class="row"><span>Tema</span><span class="seg"><button data-theme="light" class="${S.theme==='light'?'on':''}">Claro</button><button data-theme="sala" class="${S.theme==='sala'?'on':''}">Sala</button></span></div>
      <div class="row"><span>Idioma</span><span class="seg"><button class="on">ES</button><button disabled title="Pendiente">EN</button></span></div>
      <div class="sect">Integración (demo)</div>
      <button class="item" data-go="CONSOLE">Consola de integración</button>
      <div class="row"><span>Switch proveedor → libros</span><button class="switch ${C.cfg.switchOn?'on':''}" data-switch><i></i>${C.cfg.switchOn?'ON':'OFF'}</button></div>
      <div class="row"><span>Observaciones obligatorias<br><small class="muted">en claves de arbitraje</small></span><button class="switch ${C.cfg.obsObligatorias?'on':''}" data-obsreq><i></i>${C.cfg.obsObligatorias?'ON':'OFF'}</button></div>
      <div class="sect">Sesión</div>
      <button class="item" data-go="LOGOUT">Salir</button>
    </div><div class="p-foot">${esc(BRAND.name)} v${BRAND.version} · prototipo navegable · sin conexión real</div>`;
  $('[data-x]',p).onclick=()=>p.classList.remove('open');
  $$('[data-go]',p).forEach(b=>b.onclick=()=>{ const g=b.dataset.go; p.classList.remove('open');
    if(g==='SPOTFWD'||g==='FLEX'){ S.mode=g; renderTopbar(); renderCenter(); } else if(g==='RFS') openOrderBoleta({perms,onDone:renderDockNow}); else if(g==='WS') openWorkspaces();
    else if(g==='DOCK'){ const cur=getComputedStyle(document.documentElement).getPropertyValue('--dock-h').trim(); document.documentElement.style.setProperty('--dock-h', cur==='42px'?'300px':'42px'); }
    else if(g==='CONSOLE') onToggleConsole(); else if(g==='LOGOUT') onLogout(); });
  $$('[data-theme]',p).forEach(b=>b.onclick=()=>{ onTheme(b.dataset.theme); renderRPanel({onLogout,onToggleConsole,onTheme}); });
  $('[data-obsreq]',p).onclick=()=>{ C.cfg.obsObligatorias=!C.cfg.obsObligatorias; C.log('core',`Observaciones obligatorias ${C.cfg.obsObligatorias?'ON':'OFF'}`,{}); renderRPanel({onLogout,onToggleConsole,onTheme}); p.classList.add('open'); renderCenter(); toast(C.cfg.obsObligatorias?'Observaciones obligatorias en claves de arbitraje.':'Observaciones opcionales (modo demo).'); };
  $('[data-switch]',p).onclick=()=>{ C.cfg.switchOn=!C.cfg.switchOn; C.log('core',`Switch ${C.cfg.switchOn?'ON':'OFF'}`,{}); renderRPanel({onLogout,onToggleConsole,onTheme}); p.classList.add('open'); };
}
