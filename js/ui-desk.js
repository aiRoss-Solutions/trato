// Trato · mesa (SALA / TEL) v0.3: cabecera global, dos filas (precios + paneles), actividad a la derecha, contexto de cliente abajo, ⌘K
import { $, $$, h, esc, fmtN, bigPx, toast, modal, parseAmount, cmenu, envLabel, sysClock, stateChip } from './ui.js';
import * as C from './core.js';
import * as PX from './prices.js';
import { S, resetTilesFromWorkspace } from './state.js';
import { PAIRS, TENORS, FLAGS, BRAND, CLIENTS } from './data.js';
import { label as gl, chip as gchip, t as gt, channel as gchan } from './glossary.js';
import { renderDock, renderPosicion, rowMenu } from './ui-blotters.js';
import * as SYNC from './sync.js';
import { openTicket, openOrderBoleta, openAnticipo, openCancelacion, openCancelGenerica, masInfo } from './ui-ticket.js';

let root, perms, unsubs = [];
const q = s => $(s, root);

let clockTimer=null; let staleTimer=null;
export function mountDesk(el, user, {onLogout, onToggleConsole, onTheme}){
  root = el; S.user = user; perms = user.perms; S.client = null; S.ctx = {cargo:null,abono:null,linea:null,ordenante:null};
  S.act ??= { filter:'todas', scope:'cliente', table:false, collapsed:false }; S.ctxbar ??= { collapsed:false };
  resetTilesFromWorkspace();
  root.innerHTML = `
    <div class="main v3">
      <div class="topbar" data-topbar></div>
      <div class="work" data-work>
        <div class="center" data-center>
          <div class="row1" data-row1></div>
          <div class="row2" data-panels></div>
        </div>
        <aside class="activity" data-activity></aside>
      </div>
      <div class="ctxbar" data-ctxbar></div>
    </div>
    <div class="rpanel" data-rpanel></div>
    <div class="palette hide" data-palette></div>`;
  cbsRef = {onLogout,onToggleConsole,onTheme};
  renderTopbar(); renderCtxBar(); renderCenter(); renderPanels(); renderActivity(); renderRPanel(cbsRef);
  unsubs.forEach(f=>f()); unsubs = [ PX.subscribe(onTick), C.onOps(()=>{ renderActivity(); renderPanels(); renderCtxBar(); }) ];
  clearInterval(staleTimer); staleTimer = setInterval(()=>{ paintStale(); paintPlatform(); }, 1000);
  document.removeEventListener('keydown', onGlobalKey); document.addEventListener('keydown', onGlobalKey);
  panelMode = null; syncUnsub.forEach(f=>f()); syncUnsub = [ SYNC.on('hello-ctx', ()=>broadcastCtx()), SYNC.on('ctx', p=>{ applyCtx(p); rerenderAll(); }) ];
  broadcastCtx(); syncUnsub.push(SYNC.on('panel-closed', p=>layoutMark(p.panel,false))); setTimeout(offerRestore, 800);
}
let syncUnsub = [];
let cbsRef = null;
function onGlobalKey(e){
  if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openPalette(); }
}

// ---------------- cabecera (solo lo global) ----------------
function renderTopbar(){
  q('[data-topbar]').innerHTML = `
    <div class="brand"><div class="mark">T</div><b>${BRAND.name}</b></div>
    <button class="chip ws" data-ws title="Workspaces (plantillas de pares)">▦ ${esc(S.workspaces[S.activeWs].name)}</button>
    <span class="seg mode"><button data-mode="SPOTFWD" class="${S.mode==='SPOTFWD'?'on':''}">Spot · Fwd</button><button data-mode="FLEX" class="${S.mode==='FLEX'?'on':''}">Flexible</button></span>
    <button class="chip" data-rfs title="Órdenes limitadas y alertas">Órdenes</button>
    <button class="chip" data-k title="Paleta de comandos (⌘K / Ctrl+K): cliente, par, acción">⌘K</button>
    <div class="tright">
      <span class="sysclock mono" data-clock title="Fecha y hora del sistema"></span><span class="envchip ${envLabel().toLowerCase()}" title="Entorno">${envLabel()}</span>
      <span class="chip">${esc(S.user.nombre)} · <span class="mono">${esc(gchan(S.user.canal))}</span></span>
      <button class="icon-btn" data-menu title="Menú">☰</button>
    </div>`;
  clearInterval(clockTimer); clockTimer = sysClock(q('[data-clock]'));
  $$('[data-mode]',q('[data-topbar]')).forEach(b=>b.onclick=()=>{ S.mode=b.dataset.mode; renderTopbar(); renderCenter(); broadcastCtx(); });
  q('[data-ws]').onclick = openWorkspaces;
  q('[data-rfs]').onclick = ()=>openOrderBoleta({perms, onDone:renderActivity});
  q('[data-k]').onclick = openPalette;
  q('[data-menu]').onclick = ()=>q('[data-rpanel]').classList.toggle('open');
}

// ---------------- barra inferior: cliente y contexto de operación ----------------
function renderCtxBar(){
  const c = S.client, ctx = S.ctx, g = !c || c.generic, bar = q('[data-ctxbar]'); if(!bar) return;
  const cliOpts = CLIENTS.map(x=>`<option value="${esc(x.nombre)}">${esc(x.nif)} · ${esc(x.nombre)}</option>`).join('') + (perms.generico ? `<option value="Cliente por asignar">Cliente por asignar</option>` : '');
  const sel = (label, key, items, getL) => `<div class="ctx"><label>${label}</label><select data-ctx="${key}" ${g?'disabled':''}>${items.length? items.map((it,i)=>`<option value="${i}" ${ctx[key]===it?'selected':''}>${esc(getL(it))}</option>`).join('') : '<option>—</option>'}</select></div>`;
  const kv = (k,v) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`;
  const mifid = c && !g ? `<span class="dot ${c.mifid==='ok'?'ok':c.mifid==='warn'?'warn':'ko'}"></span> ${c.mifid==='ok'?'apto':c.mifid==='warn'?'revisar':'no apto'}` : '—';
  const margen = c && !g ? (c.margenPersonalizado ? `personalizado (${fmtN(c.margenes.spot,2)}‰ / ${fmtN(c.margenes.fwd,2)}‰)` : fmtN(c.margenPorMil,2)+' ‰ · '+c.nivel) : '—';
  bar.className = 'ctxbar' + (S.ctxbar.collapsed?' collapsed':'') + (g&&c?' generic':'');
  bar.innerHTML = `
    <div class="ctx-main">
      <div class="cli"><label>Cliente</label><input list="cli-list" data-cli placeholder="Nombre o NIF… (⌘K)" value="${esc(c?.nombre||'')}"><datalist id="cli-list">${cliOpts}</datalist></div>
      ${sel('Cuenta de cargo','cargo', c&&!g? c.cuentas:[], x=>x.n)}
      ${sel('Cuenta de abono','abono', c&&!g? c.cuentas:[], x=>x.n)}
      ${sel(gt('lineaRiesgo'),'linea', c&&!g? c.lineas:[], x=>`${x.n} · ${x.div}`)}
      ${sel(gt('ordenante'),'ordenante', c&&!g? c.ordenantes:[], x=>`${x.nombre} ${x.apoderado?'· apoderado':''}`)}
      <button class="icon-btn" data-fold title="${S.ctxbar.collapsed?'Mostrar datos del cliente':'Plegar'}">${S.ctxbar.collapsed?'▴':'▾'}</button>
    </div>
    <div class="ctx-kv">
      ${kv(gt('idCliente'), g?'—':esc(c.id))}${kv(gt('gestor'), g?'—':esc(c.tutor))}${kv('MiFID', mifid)}${kv('Titular MiFID', g?'—':esc(c.titularMifid))}
      ${kv('LEI', g?'—':(c.lei==='—'?'sin LEI':`<span class="mono">${esc(c.lei)}</span> · ${PX.es(c.leiRenov)}`))}${kv('Margen', margen)}
      ${kv('Saldo cargo', g||!ctx.cargo?'—':fmtN(ctx.cargo.saldo,2)+' '+ctx.cargo.div)}${kv('Disponible línea FX', g||!ctx.linea?'—':fmtN(ctx.linea.disp,0)+' / '+fmtN(ctx.linea.limite,0)+' '+ctx.linea.div)}
      ${kv('Contacto', g?'—':esc(c.email)+' · '+esc(c.tel))}
    </div>`;
  const cli = $('[data-cli]',bar);
  cli.onchange = e => selectClient(e.target.value);
  cli.oninput = e => { const v=e.target.value.trim(); if(CLIENTS.some(x=>x.nombre===v || x.nif===v) || /^cliente (gen[ée]rico|por asignar)$/i.test(v)) selectClient(v); };
  cli.onkeydown = e => { if(e.key==='Enter'){ e.preventDefault(); selectClient(e.target.value); } };
  $$('[data-ctx]', bar).forEach(sl=>sl.onchange = ()=>{ const k=sl.dataset.ctx; const list = k==='linea'? c.lineas : k==='ordenante'? c.ordenantes : c.cuentas; S.ctx[k] = list[+sl.value]; renderCtxBar(); broadcastCtx(); C.log('core','contexto de operación', {[k]: S.ctx[k]?.n || S.ctx[k]?.nif}); });
  $('[data-fold]',bar).onclick = ()=>{ S.ctxbar.collapsed=!S.ctxbar.collapsed; renderCtxBar(); };
}
function selectClient(val){
  val = (val||'').trim(); if(!val){ S.client=null; S.ctx={cargo:null,abono:null,linea:null,ordenante:null}; rerenderAll(); return; }
  if(/gen[ée]rico|por asignar/i.test(val)){ if(!perms.generico){ toast('Su perfil no tiene permiso para operar con cliente por asignar.','err'); return; } if(!S.client){ toast('Conéctese primero con un cliente real para poder operar con cliente por asignar.','err'); return; }
    S.client = C.generic(); S.ctx={cargo:null,abono:null,linea:null,ordenante:null}; S.tiles.forEach(t=>t.tipo='OTROS'); C.log('core','cliente por asignar activado', {}); toast('Cliente por asignar: solo spot, sin margen de cliente; la operación se reasigna después.'); rerenderAll(); broadcastCtx(); return; }
  const c = C.findClient(val) || C.findClient(val.split(' · ').pop());
  if(!c){ toast('Cliente no encontrado en el core.','err'); return; }
  S.client = c; const d = C.getDatosEmpresa(c);
  S.ctx = { cargo: c.cuentas.find(x=>x.div==='EUR')||c.cuentas[0]||null, abono: c.cuentas.find(x=>x.div!=='EUR')||c.cuentas[0]||null, linea: c.lineas[0]||null, ordenante: c.ordenantes.find(o=>o.apoderado)||c.ordenantes[0]||null };
  if(c.mifid==='ko') toast('Atención: cliente no apto MiFID. Las vistas de contratación quedan limitadas.','err');
  rerenderAll(); broadcastCtx();
}
function rerenderAll(){ renderTopbar(); renderCtxBar(); renderCenter(); renderPanels(); renderActivity(); }
// ---- estado compartido entre ventanas ----
export function ctxSnapshot(){ return { cli: S.client?.id||null, generic: !!S.client?.generic, ctx: { cargo:S.ctx.cargo?.n||null, abono:S.ctx.abono?.n||null, linea:S.ctx.linea?.n||null, ordenante:S.ctx.ordenante?.nif||null }, mode:S.mode, ws:S.activeWs, pairs:S.tiles.map(t=>t.pair) }; }
function broadcastCtx(){ SYNC.send('ctx', ctxSnapshot()); }
export function applyCtx(p){
  if(!p) return;
  if(p.generic){ S.client = C.generic(); S.ctx={cargo:null,abono:null,linea:null,ordenante:null}; }
  else if(p.cli){ const c = C.clients().find(x=>x.id===p.cli); if(c){ S.client=c; S.ctx = { cargo:c.cuentas.find(x=>x.n===p.ctx?.cargo)||c.cuentas[0]||null, abono:c.cuentas.find(x=>x.n===p.ctx?.abono)||c.cuentas[1]||c.cuentas[0]||null, linea:c.lineas.find(x=>x.n===p.ctx?.linea)||c.lineas[0]||null, ordenante:c.ordenantes.find(x=>x.nif===p.ctx?.ordenante)||c.ordenantes[0]||null }; } }
  else { S.client=null; S.ctx={cargo:null,abono:null,linea:null,ordenante:null}; }
  if(p.mode) S.mode=p.mode;
  if(p.pairs && panelMode==='precios'){ S.tiles = p.pairs.map(pr=>({ pair:pr, tipo:'OTROS', obs:'', divOp:pr.split('/')[1], amount:0, tenor:'SPOT', valueDate:null })); }
}
let panelMode = null;   // null = mesa completa; 'actividad' | 'posicion' | 'ordenes' | 'plataforma' | 'ultimas' | 'precios'
// Ventana hija: solo un panel, sincronizada con la mesa
export function mountPanel(el, user, panel){
  root = el; S.user = user; perms = user.perms; panelMode = panel;
  S.act ??= { filter:'todas', scope:'cliente', table:false, collapsed:false }; S.ctxbar ??= { collapsed:true };
  resetTilesFromWorkspace();
  const titles = { actividad:gt('actividad'), posicion:gt('posicionViva'), ordenes:gt('ordenesVivas'), plataforma:gt('estadoPlataforma'), ultimas:gt('ultimas'), precios:'Precios' };
  root.innerHTML = `<div class="pwin">
    <div class="pw-head"><div class="brand"><div class="mark">T</div><b>${BRAND.name}</b></div><span class="pw-title">${esc(titles[panel]||panel)}</span><span class="pw-cli mono" data-pwcli></span><span class="grow"></span><span class="sysclock mono" data-clock></span><span class="envchip ${envLabel().toLowerCase()}">${envLabel()}</span><span class="syncdot" data-sync title="Sincronizado con la mesa"></span></div>
    <div class="pw-body" data-pwbody></div></div>`;
  clearInterval(clockTimer); clockTimer = sysClock(q('[data-clock]'));
  const body = q('[data-pwbody]');
  const paint = ()=>{
    const cl = q('[data-pwcli]'); if(cl) cl.textContent = S.client ? S.client.nombre : 'sin cliente';
    if(panel==='actividad'){ if(!$('[data-activity]',body)){ body.innerHTML='<aside class="activity" data-activity></aside>'; } S.act.collapsed=false; renderActivity(); $('[data-fold]',body)?.remove(); $('[data-pop]',body)?.remove(); }
    else if(panel==='precios'){ if(!$('[data-row1]',body)){ body.innerHTML='<div class="center one"><div class="row1" data-row1></div></div>'; } renderCenter(); $('[data-pop-precios]',body)?.remove(); }
    else { if(!$('[data-panel]',body)){ body.innerHTML=''; const card=panelCard(panel); $('[data-pop]',card)?.remove(); body.appendChild(card); } paintPanel(panel, $('[data-pbody]',body)); }
  };
  paint();
  unsubs.forEach(f=>f()); unsubs = [ C.onOps(paint), SYNC.on('ctx', p=>{ applyCtx(p); paint(); }) ];
  if(panel==='precios') unsubs.push(PX.subscribe(onTick));
  clearInterval(staleTimer); staleTimer = setInterval(()=>{ paintStale(); if(panel==='plataforma') paint(); }, 1000);
  window.addEventListener('beforeunload', ()=>SYNC.send('panel-closed',{panel}));
  SYNC.send('hello', {panel});      // pide operaciones y contexto a la mesa
  SYNC.send('hello-ctx', {panel});
}


// ---------------- centro: streaming ----------------
function renderCenter(){
  const center = q('[data-row1]');
  if(S.mode==='FLEX'){
    const t = S.flexTile ??= { pair:'EUR/USD', tipo:'OTROS', obs:'', divOp:'USD', amount:0, tenor:'3M', valueDate:PX.tenorDate('3M'), fdc:null };
    t.valueDate ??= PX.tenorDate(t.tenor); const fde = C.fdeFor(t.valueDate); t.fdc ??= fde;
    center.innerHTML = `<div class="notice" style="margin:0 0 12px">Seguro de cambio <b>flexible</b>: producto no estándar. La fecha de disponibilidad estándar (FDE) es el 20 % de los días naturales hasta vencimiento; el cliente elige desde qué fecha (FDC) podrá anticipar o cancelar.</div><div class="grid" data-grid></div>`;
    const grid = $('[data-grid]',center); grid.appendChild(renderTile(t, 0, true)); return;
  }
  center.innerHTML = `<div class="r1-head"><span class="muted small">Precios · ${S.tiles.length} pares · streaming</span><span class="grow"></span><button class="chip" data-addpair title="Añadir par (o ⌘K y escribir el par)">+ par</button><button class="icon-btn xs" data-pop-precios title="Abrir precios en ventana">⧉</button></div><div class="grid" data-grid></div>`;
  const grid = $('[data-grid]', center);
  S.tiles.forEach((t,i)=>grid.appendChild(renderTile(t,i,false)));
  $('[data-addpair]',center).onclick = ()=>pickPair(null);
  $('[data-pop-precios]',center).onclick = ()=>popout('precios');
  onTick();
}
function renderTile(t, i, flex){
  const g = S.client?.generic; const [base, quote] = t.pair.split('/'); const oth = t.divOp===base?quote:base;
  const el = h(`<div class="tile" data-i="${i}">
    <div class="t-head"><span class="pair" data-pair title="Cambiar par">${FLAGS[base]||''} ${esc(t.pair)} ${FLAGS[quote]||''}</span>
      <span class="seg"><button data-tipo="OTROS" class="${t.tipo==='OTROS'?'on':''}" title="Spot con liquidación externa y forwards">Spot·Fwd</button><button data-tipo="CONVERSION" class="${t.tipo==='CONVERSION'?'on':''}" ${g||flex?'disabled':''} title="Cambio entre cuentas del cliente: spot, hoy y mañana">Ctas</button></span>
      <span class="grow" style="flex:1"></span>${flex?'':'<button class="icon-btn close" data-close>✕</button>'}</div>
    <div class="t-row obsrow"><span class="lbl">Obs.</span><input data-obs placeholder="${t.tipo==='OTROS'&&C.cfg.obsObligatorias?'Motivo / observaciones · obligatorio en spot con liquidación externa':'Observaciones (opcional)'}" value="${esc(t.obs)}"></div>
    <div class="prices">
      <div class="side" data-side="COMPRAR" role="button" tabindex="0" aria-label="Comprar ${esc(t.divOp)}: solicitar precio"><div class="lbl"><b>COMPRAR ${esc(t.divOp)}</b><span>▾</span></div><div class="px" data-px="COMPRAR">—</div></div>
      <div class="side" data-side="VENDER" role="button" tabindex="0" aria-label="Vender ${esc(t.divOp)}: solicitar precio"><div class="lbl"><b>VENDER ${esc(t.divOp)}</b><span>▾</span></div><div class="px" data-px="VENDER">—</div></div>
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
  $('[data-fdc]',el)?.addEventListener('change', e=>{ let x=new Date(e.target.value+'T12:00:00'); if(!PX.isBiz(x)){ x=PX.nextBiz(x); e.target.value=PX.iso(x); toast('Fecha de disponibilidad no hábil: se ajusta al siguiente día hábil.'); } t.fdc = x; });
  $$('[data-side]',el).forEach(s=>s.onclick=()=>{ if(!S.client){ toast('Seleccione un cliente (⌘K o barra inferior).','err'); S.ctxbar.collapsed=false; renderCtxBar(); $('[data-cli]',root)?.focus(); return; } if(!t.amount){ toast('Indique un importe antes de solicitar precio.','err'); amt.classList.add('req'); amt.focus(); return; }
    const obsIn = $('[data-obs]',el); const esClave = t.tipo==='OTROS' && S.mode!=='FLEX' && PX.tenorFor(t.valueDate||PX.tenorDate(t.tenor))!=='FWD';
    if(C.cfg.obsObligatorias && esClave && !t.obs.trim()){ toast('Indique el motivo en «Observaciones»: obligatorio en spot con liquidación externa (trazabilidad). Se puede relajar en Menú → Demo.','err'); obsIn.classList.add('req'); obsIn.focus(); return; }
    openTicket(el, t, s.dataset.side, { perms, onDone:()=>{ renderCenter(); renderActivity(); } }); });
  $$('[data-side]',el).forEach(sd=>sd.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); sd.click(); } }));
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

// ---------------- acciones sobre operaciones (compartidas por actividad, paneles y tabla) ----------------
function onAction(action, op){
  const done = ()=>{ renderActivity(); renderPanels(); renderCtxBar(); };
  if(action==='anticipar') openAnticipo(op,{perms,onDone:done});
  else if(action==='cancelar') openCancelacion(op,{perms,onDone:done});
  else if(action==='cancelarOrden'){ C.cancelOrder(op); toast('Orden cancelada.','ok'); }
  else if(action==='completarMarkup'){ C.completeMarkup(op).then(()=>toast('Margen confirmado. Operación enviada al core.','ok')); }
  else if(action==='cancelarGenerica') openCancelGenerica(op,{onDone:done});
  else if(action==='masInfo') masInfo(op,{perms});
}
function renderDockNow(){ renderActivity(); }
const VIVAS = new Set(['Solicitud pendiente','Precio recibido','Validando operación','Ejecutando','Confirmada en mercado','Orden enviada a mercado','Precio alcanzado']);
const ORDENES = new Set(['ORDEN LIMITADA','CALL ORDER','AVISO']);
function actList(){
  const a = S.act, c = S.client;
  let list = C.ops.slice();
  if(a.scope==='cliente') list = c ? list.filter(o=>o.cliente===c.id) : [];
  else if(a.scope==='mios') list = list.filter(o=>o.usuario===S.user.user);
  if(a.filter==='vivas') list = list.filter(o=>VIVAS.has(o.estado));
  else if(a.filter==='ordenes') list = list.filter(o=>o.tipoOp==='ORDEN LIMITADA');
  else if(a.filter==='alertas') list = list.filter(o=>o.tipoOp==='CALL ORDER'||o.tipoOp==='AVISO');
  else if(a.filter==='forwards') list = list.filter(o=>o.tipoOrden==='FORWARD');
  return list;
}
function opCard(o){
  const d = PX.dec(o.par); const kind = ORDENES.has(o.tipoOp)?'ol':'ejecutadas';
  const el = h(`<div class="opcard ${VIVAS.has(o.estado)?'viva':''}" tabindex="0" title="Clic: detalle · ⋯: acciones">
    <div class="l1"><span class="pchip ${gchip(o.tipoOp).toLowerCase()}">${esc(gchip(o.tipoOp))}</span><b class="mono">${esc(o.ref||o.idGlobal)}</b><span class="par mono">${esc(o.par)}</span><span class="grow"></span>${stateChip(o.estado,C.STATES)}<button class="icon-btn xs" data-more title="Acciones">⋯</button></div>
    <div class="l2"><span class="${o.dir==='COMPRAR'?'buy':'sell'}">${esc(o.dir)} ${esc(o.divOp)}</span> <b class="mono">${fmtN(o.nominal,0)}</b><span class="muted"> @ </span><b class="mono">${o.precioCliente!=null?fmtN(o.precioCliente,d):(o.precioLimite!=null?fmtN(o.precioLimite,d)+' lím.':'—')}</b><span class="grow"></span><span class="muted small">${esc(gl(o.tipoOp))} · ${PX.es(o.fechaValor)}${o.hora&&o.hora!=='—'?' · '+esc(o.hora):''}</span></div>
    ${S.act.scope!=='cliente'?`<div class="l3 muted small">${esc(o.clienteNombre||C.clients().find(x=>x.id===o.cliente)?.nombre||o.cliente)}</div>`:''}
  </div>`);
  el.onclick = e=>{ if(e.target.closest('[data-more]')) return; onAction('masInfo', o); };
  el.onkeydown = e=>{ if(e.key==='Enter') onAction('masInfo', o); };
  el.oncontextmenu = e=>{ e.preventDefault(); rowMenu(e, o, kind, perms, onAction); };
  $('[data-more]',el).onclick = e=>{ e.stopPropagation(); rowMenu(e, o, kind, perms, onAction); };
  return el;
}
function renderActivity(){
  const a = S.act, box = q('[data-activity]'); if(!box) return;
  box.className = 'activity' + (a.collapsed?' collapsed':'');
  if(a.collapsed){ box.innerHTML = `<button class="icon-btn" data-unfold title="Mostrar actividad">‹</button><div class="vlabel">${gt('actividad')}</div>`; $('[data-unfold]',box).onclick=()=>{ a.collapsed=false; renderActivity(); }; return; }
  const list = actList();
  box.innerHTML = `
    <div class="a-head"><b>${gt('actividad')}</b><span class="count">${list.length}</span><span class="grow"></span>
      <button class="icon-btn xs" data-table title="${a.table?'Ver como tarjetas':'Ver como tabla'}">${a.table?'▤':'☷'}</button>
      <button class="icon-btn xs" data-pop title="Abrir en ventana">⧉</button>
      <button class="icon-btn xs" data-fold title="Plegar">›</button></div>
    <div class="a-filters">
      <span class="seg sm"><button data-scope="cliente" class="${a.scope==='cliente'?'on':''}">Cliente</button><button data-scope="mios" class="${a.scope==='mios'?'on':''}">Mías</button><button data-scope="todas" class="${a.scope==='todas'?'on':''}">Mesa</button></span>
      <span class="seg sm"><button data-f="todas" class="${a.filter==='todas'?'on':''}">Todas</button><button data-f="vivas" class="${a.filter==='vivas'?'on':''}">Vivas</button><button data-f="forwards" class="${a.filter==='forwards'?'on':''}">Fwd</button><button data-f="ordenes" class="${a.filter==='ordenes'?'on':''}">Órdenes</button><button data-f="alertas" class="${a.filter==='alertas'?'on':''}">Alertas</button></span>
    </div>
    <div class="a-body" data-abody></div>`;
  const body = $('[data-abody]',box);
  if(a.table){ body.classList.add('astable'); renderDock(body, {perms, onAction}); }
  else if(!list.length){ body.innerHTML = `<div class="empty">${a.scope==='cliente'&&!S.client?'Seleccione un cliente para ver su actividad (⌘K).':'Sin operaciones que mostrar.'}</div>`; }
  else list.forEach(o=>body.appendChild(opCard(o)));
  $$('[data-scope]',box).forEach(b=>b.onclick=()=>{ a.scope=b.dataset.scope; renderActivity(); });
  $$('[data-f]',box).forEach(b=>b.onclick=()=>{ a.filter=b.dataset.f; renderActivity(); });
  $('[data-table]',box).onclick=()=>{ a.table=!a.table; renderActivity(); };
  $('[data-fold]',box).onclick=()=>{ a.collapsed=true; renderActivity(); };
  $('[data-pop]',box).onclick=()=>popout('actividad');
}

// ---------------- fila 2: paneles ----------------
const PANELS = ['posicion','ordenes','plataforma','ultimas'];
function panelCard(key){
  const titles = { posicion:gt('posicionViva'), ordenes:gt('ordenesVivas'), plataforma:gt('estadoPlataforma'), ultimas:gt('ultimas') };
  const el = h(`<div class="panel card" data-panel="${key}"><div class="c-h"><b>${titles[key]}</b><span class="grow"></span><button class="icon-btn xs" data-pop title="Abrir en ventana">⧉</button></div><div class="p-body" data-pbody></div></div>`);
  $('[data-pop]',el).onclick=()=>popout(key);
  return el;
}
export function paintPanel(key, body){
  const c = S.client;
  if(key==='posicion'){ if(!c){ body.innerHTML='<div class="empty">Sin cliente.</div>'; return; } renderPosicion(body); return; }
  if(key==='ordenes'){
    const list = C.ops.filter(o=>ORDENES.has(o.tipoOp) && (o.estado==='Orden enviada a mercado'||o.estado==='Precio alcanzado') && (!c || o.cliente===c.id));
    if(!list.length){ body.innerHTML='<div class="empty">Sin órdenes ni alertas vivas.</div>'; return; }
    body.innerHTML=''; list.forEach(o=>{ const d=PX.dec(o.par); const r=h(`<div class="orow"><span class="pchip ${gchip(o.tipoOp).toLowerCase()}">${esc(gchip(o.tipoOp))}</span><span class="mono">${esc(o.par)}</span><span class="${o.dir==='COMPRAR'?'buy':'sell'}">${esc(o.dir)} ${esc(o.divOp)} ${fmtN(o.nominal,0)}</span><span class="mono">lím. ${fmtN(o.precioLimite,d)}</span><span class="muted small">hasta ${PX.es(o.fechaValidez)}</span><span class="grow"></span><button class="btn btn-ghost btn-sm" data-c>Cancelar</button></div>`); $('[data-c]',r).onclick=()=>onAction('cancelarOrden',o); body.appendChild(r); });
    return;
  }
  if(key==='plataforma'){
    const s = PX.secondsSinceTick(); const okFeed = s<5;
    body.innerHTML = `<div class="plat">
      <div><span class="dot ${okFeed?'ok':'warn'}"></span> Proveedor de liquidez <b>${okFeed?'conectado':'sin precios '+s+' s'}</b></div>
      <div><span class="dot ok"></span> Core bancario <b>conectado</b> · latencia <span class="mono">${fmtN(18+Math.round(Math.random()*7),0)} ms</span></div>
      <div><span class="dot ${C.cfg.switchOn?'ok':'warn'}"></span> ${gt('cobertura')} <b>${C.cfg.switchOn?'ON · libros':'OFF · mercado'}</b></div>
      <div><span class="dot ok"></span> Último tick <b class="mono" data-lasttick>${new Date().toLocaleTimeString('es-ES')}</b> · pares <b>${PAIRS.length}</b></div>
      <div><span class="dot ${envLabel()==='PRO'?'ok':'warn'}"></span> Entorno <b>${envLabel()}</b> · ${esc(S.user.nombre)} · ${esc(gchan(S.user.canal))}</div>
    </div>`; return;
  }
  if(key==='ultimas'){
    const list = C.ops.filter(o=>o.estado==='Ejecutada' && (!c || o.cliente===c.id)).slice(0,5);
    if(!list.length){ body.innerHTML='<div class="empty">Sin operaciones ejecutadas.</div>'; return; }
    body.innerHTML=''; list.forEach(o=>{ const d=PX.dec(o.par); const r=h(`<div class="orow" tabindex="0"><span class="pchip ${gchip(o.tipoOp).toLowerCase()}">${esc(gchip(o.tipoOp))}</span><b class="mono">${esc(o.ref)}</b><span class="mono">${esc(o.par)}</span><span class="${o.dir==='COMPRAR'?'buy':'sell'}">${esc(o.dir)} ${esc(o.divOp)} ${fmtN(o.nominal,0)}</span><span class="mono">${fmtN(o.precioCliente,d)}</span><span class="grow"></span><span class="muted small">${PX.es(o.fechaValor)}</span></div>`); r.onclick=()=>onAction('masInfo',o); body.appendChild(r); });
  }
}
function renderPanels(){
  const box = q('[data-panels]'); if(!box) return;
  if(!box.children.length) PANELS.forEach(k=>box.appendChild(panelCard(k)));
  PANELS.forEach(k=>paintPanel(k, $(`[data-panel="${k}"] [data-pbody]`, box)));
}
function paintPlatform(){ const b = $('[data-panel="plataforma"] [data-pbody]', root); if(b) paintPanel('plataforma', b); }

// ---------------- multiventana (bloque 6): por ahora abre la ruta del panel ----------------
const layoutKey = () => 'trato.layout.'+(S.user?.user||'anon');
function layoutLoad(){ try{ return JSON.parse(localStorage.getItem(layoutKey())||'{"popped":[]}'); }catch{ return {popped:[]}; } }
function layoutSave(l){ try{ localStorage.setItem(layoutKey(), JSON.stringify(l)); }catch{} }
function layoutMark(panel, open){ const l=layoutLoad(); l.popped = open ? [...new Set([...l.popped, panel])] : l.popped.filter(p=>p!==panel); layoutSave(l); }
export function restoreLayout(){ const l=layoutLoad(); if(!l.popped.length){ toast('No hay disposición guardada.'); return; } l.popped.forEach((p,i)=>setTimeout(()=>popout(p,{restoring:true}), i*150)); }
export function forgetLayout(){ layoutSave({popped:[]}); toast('Disposición olvidada.','ok'); }
function offerRestore(){
  const l=layoutLoad(); if(!l.popped.length) return;
  const n=h(`<div class="toast" role="status">Tenías ${l.popped.length} panel${l.popped.length>1?'es':''} en ventanas propias (${esc(l.popped.join(', '))}). <button class="btn btn-primary btn-sm" data-r style="margin-left:8px">Restaurar disposición</button> <button class="btn btn-ghost btn-sm" data-f>Olvidar</button></div>`);
  let box=document.querySelector('.toasts'); if(!box){ box=h('<div class="toasts" role="status" aria-live="polite"></div>'); document.body.appendChild(box); }
  box.appendChild(n); $('[data-r]',n).onclick=()=>{ n.remove(); restoreLayout(); }; $('[data-f]',n).onclick=()=>{ n.remove(); forgetLayout(); };
  setTimeout(()=>n.remove(), 20000);
}
export function popout(panel, {restoring=false}={}){
  if(panelMode){ toast('Ya estás en una ventana de panel: abre las demás desde la mesa.'); return; }
  const url = `./?panel=${encodeURIComponent(panel)}&ch=${encodeURIComponent(S.user.canal)}${S.client?'&cli='+encodeURIComponent(S.client.id):''}`;
  const w = window.open(url, 'trato-'+panel, 'popup=yes,width=520,height=720');
  if(!w){ modal({ title:'Ventana bloqueada por el navegador', width:460, body:`<div class="notice">El navegador ha bloqueado la ventana emergente. Permita ventanas para este sitio o ábrala a mano:</div><p style="margin-top:10px"><a class="btn btn-primary btn-sm" href="${url}" target="_blank" rel="opener">Abrir «${esc(panel)}» en una pestaña nueva</a></p>`, actions:[{label:'Cerrar',onClick:a=>a.close()}] }); return; }
  layoutMark(panel, true); C.log('core',`panel «${panel}» abierto en ventana propia`,{});
}

// ---------------- paleta de comandos ⌘K ----------------
function openPalette(){
  const p = q('[data-palette]'); if(!p) return;
  p.classList.remove('hide');
  p.innerHTML = `<div class="pal"><input data-pin placeholder="Cliente, NIF, par (EUR/USD) o acción…" autocomplete="off"><div class="pal-list" data-plist></div><div class="pal-foot muted small">↑↓ moverse · Enter ejecutar · Esc cerrar</div></div>`;
  const inp = $('[data-pin]',p), list = $('[data-plist]',p); let items=[], idx=0;
  const build = (qs)=>{
    const s = qs.trim().toLowerCase(); items=[];
    for(const c of CLIENTS){ if(!s || c.nombre.toLowerCase().includes(s) || c.nif.toLowerCase().includes(s) || c.id.includes(s)) items.push({k:'Cliente', l:c.nombre, d:c.nif, run:()=>selectClient(c.nombre)}); }
    if(perms.generico && (!s || 'cliente por asignar'.includes(s))) items.push({k:'Cliente', l:'Cliente por asignar', d:'solo spot, sin margen', run:()=>selectClient('Cliente por asignar')});
    for(const pr of PAIRS){ if(s && (pr.toLowerCase().includes(s) || pr.replace('/','').toLowerCase().includes(s))) items.push({k:'Par', l:pr, d:S.tiles.some(t=>t.pair===pr)?'ya en pantalla · enfocar':'añadir a la fila de precios', run:()=>{ if(!S.tiles.some(t=>t.pair===pr)) S.tiles.push({ pair:pr, tipo:'OTROS', obs:'', divOp:pr.split('/')[1], amount:0, tenor:'SPOT', valueDate:null }); renderCenter(); const i=S.tiles.findIndex(t=>t.pair===pr); $(`.tile[data-i="${i}"] [data-amt]`,root)?.focus(); }}); }
    const acts = [
      {l:'Órdenes y alertas', d:'boleta de orden limitada / alerta', run:()=>openOrderBoleta({perms,onDone:renderActivity})},
      {l:'Workspaces', d:'plantillas de pares', run:openWorkspaces},
      {l:'Seguro de cambio flexible', d:'modo flexible', run:()=>{ S.mode='FLEX'; renderTopbar(); renderCenter(); }},
      {l:'Spot · Forward', d:'modo estándar', run:()=>{ S.mode='SPOTFWD'; renderTopbar(); renderCenter(); }},
      {l:'Consola de integración', d:'lo que viaja al core', run:()=>cbsRef?.onToggleConsole()},
      {l:'Tema claro', d:'', run:()=>cbsRef?.onTheme('light')}, {l:'Tema navy', d:'', run:()=>cbsRef?.onTheme('sala')},
      {l:'Actividad en ventana', d:'abrir el panel de actividad aparte', run:()=>popout('actividad')},
      {l:'Posición en ventana', d:'', run:()=>popout('posicion')}, {l:'Precios en ventana', d:'tiles de streaming aparte', run:()=>popout('precios')}, {l:'Consola en ventana', d:'', run:()=>popout('consola')},
      {l:'Salir', d:'cerrar sesión', run:()=>cbsRef?.onLogout()},
    ];
    for(const a of acts){ if(!s || a.l.toLowerCase().includes(s) || a.d.toLowerCase().includes(s)) items.push({k:'Acción', ...a}); }
    items = items.slice(0,12); idx=0; paint();
  };
  const paint = ()=>{ list.innerHTML = items.length? items.map((it,i)=>`<div class="pal-item ${i===idx?'on':''}" data-i="${i}"><span class="k">${it.k}</span><b>${esc(it.l)}</b><span class="muted small">${esc(it.d||'')}</span></div>`).join('') : '<div class="empty">Sin resultados.</div>';
    $$('.pal-item',list).forEach(el=>el.onclick=()=>{ run(+el.dataset.i); }); };
  const close = ()=>{ p.classList.add('hide'); p.innerHTML=''; };
  const run = i => { const it=items[i]; close(); it?.run(); };
  inp.oninput = ()=>build(inp.value);
  inp.onkeydown = e=>{ if(e.key==='ArrowDown'){ idx=Math.min(items.length-1,idx+1); paint(); e.preventDefault(); } else if(e.key==='ArrowUp'){ idx=Math.max(0,idx-1); paint(); e.preventDefault(); } else if(e.key==='Enter'||e.key==='Return'||e.keyCode===13){ e.preventDefault(); run(idx); } else if(e.key==='Escape'){ close(); } };
  p.onmousedown = e=>{ if(e.target===p) close(); };
  build(''); inp.focus();
}

// ---------------- panel derecho ----------------
function renderRPanel({onLogout,onToggleConsole,onTheme}){
  const p = q('[data-rpanel]');
  p.innerHTML = `<div class="p-head">${esc(BRAND.name)} <span class="muted small" style="font-weight:400">· ${esc(S.user.desc)}</span><span style="flex:1"></span><button class="icon-btn" data-x>✕</button></div>
    <div class="p-body">
      <div class="sect">Operativa</div>
      <button class="item" data-go="SPOTFWD">Spot / Forward</button><button class="item" data-go="FLEX">Seguro de cambio flexible</button><button class="item" data-go="RFS">Órdenes y alertas</button>
      <div class="sect">Vista</div>
      <button class="item" data-go="WS">Workspaces</button><button class="item" data-go="ACT">Plegar / desplegar actividad</button><button class="item" data-go="CTX">Plegar / desplegar contexto de cliente</button><button class="item" data-go="K">Paleta de comandos ⌘K</button><div class="sect">Ventanas</div><button class="item" data-go="POPACT">Actividad en ventana ⧉</button><button class="item" data-go="POPPX">Precios en ventana ⧉</button><button class="item" data-go="POPPOS">Posición en ventana ⧉</button><button class="item" data-go="RESTORE">Restaurar disposición guardada</button><button class="item" data-go="FORGET">Olvidar disposición</button>
      <div class="row"><span>Tema</span><span class="seg"><button data-theme="light" class="${S.theme==='light'?'on':''}">Claro</button><button data-theme="sala" class="${S.theme==='sala'?'on':''}">Navy</button></span></div>
      <div class="row"><span>Idioma</span><span class="seg"><button class="on">ES</button><button disabled title="Pendiente">EN</button></span></div>
      <div class="sect">Integración (demo)</div>
      <button class="item" data-go="CONSOLE">Consola de integración</button><button class="item" data-go="CONSOLEWIN">Consola en ventana propia ⧉</button>
      <div class="row"><span>${gt('cobertura')}<br><small class="muted">OFF = el proveedor cubre en mercado</small></span><button class="switch ${C.cfg.switchOn?'on':''}" data-switch><i></i>${C.cfg.switchOn?'ON':'OFF'}</button></div>
      <div class="row"><span>Observaciones obligatorias<br><small class="muted">en spot con liquidación externa</small></span><button class="switch ${C.cfg.obsObligatorias?'on':''}" data-obsreq><i></i>${C.cfg.obsObligatorias?'ON':'OFF'}</button></div>
      <div class="row"><span>Rechazos aleatorios<br><small class="muted">last look 3 % · asiento 2 %</small></span><button class="switch ${C.cfg.rechazosAleatorios?'on':''}" data-rechazos><i></i>${C.cfg.rechazosAleatorios?'ON':'OFF'}</button></div>
      <div class="sect">Sesión</div>
      <button class="item" data-go="LOGOUT">Salir</button>
    </div><div class="p-foot">${esc(BRAND.name)} v${BRAND.version} · prototipo navegable · sin conexión real</div>`;
  $('[data-x]',p).onclick=()=>p.classList.remove('open');
  $$('[data-go]',p).forEach(b=>b.onclick=()=>{ const g=b.dataset.go; p.classList.remove('open');
    if(g==='SPOTFWD'||g==='FLEX'){ S.mode=g; renderTopbar(); renderCenter(); } else if(g==='RFS') openOrderBoleta({perms,onDone:renderActivity}); else if(g==='WS') openWorkspaces();
    else if(g==='ACT'){ S.act.collapsed=!S.act.collapsed; renderActivity(); } else if(g==='CTX'){ S.ctxbar.collapsed=!S.ctxbar.collapsed; renderCtxBar(); } else if(g==='K') openPalette(); else if(g==='POPACT') popout('actividad'); else if(g==='POPPX') popout('precios'); else if(g==='POPPOS') popout('posicion'); else if(g==='RESTORE') restoreLayout(); else if(g==='FORGET') forgetLayout();
    else if(g==='CONSOLE') onToggleConsole(); else if(g==='CONSOLEWIN') popout('consola'); else if(g==='LOGOUT') onLogout(); });
  $$('[data-theme]',p).forEach(b=>b.onclick=()=>{ onTheme(b.dataset.theme); renderRPanel({onLogout,onToggleConsole,onTheme}); });
  $('[data-rechazos]',p).onclick=()=>{ C.cfg.rechazosAleatorios=!C.cfg.rechazosAleatorios; C.log('core',`Rechazos aleatorios ${C.cfg.rechazosAleatorios?'ON':'OFF'}`,{}); renderRPanel({onLogout,onToggleConsole,onTheme}); p.classList.add('open'); };
  $('[data-obsreq]',p).onclick=()=>{ C.cfg.obsObligatorias=!C.cfg.obsObligatorias; C.log('core',`Observaciones obligatorias ${C.cfg.obsObligatorias?'ON':'OFF'}`,{}); renderRPanel({onLogout,onToggleConsole,onTheme}); p.classList.add('open'); renderCenter(); toast(C.cfg.obsObligatorias?'Observaciones obligatorias en claves de arbitraje.':'Observaciones opcionales (modo demo).'); };
  $('[data-switch]',p).onclick=()=>{ C.cfg.switchOn=!C.cfg.switchOn; C.log('core',`Cobertura en libros ${C.cfg.switchOn?'ON':'OFF'}`,{}); renderRPanel({onLogout,onToggleConsole,onTheme}); p.classList.add('open'); };
}
