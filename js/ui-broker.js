// Trato · Bróker Online (canal web del cliente): vista estándar y profesional, firma ágil, módulo de operación
import { $, $$, h, esc, fmtN, toast, modal, parseAmount, stateChip } from './ui.js';
import * as C from './core.js';
import * as PX from './prices.js';
import { S } from './state.js';
import { G10, PAIRS, FLAGS, BRAND, CLIENTS, TENORS } from './data.js';
import { renderDock } from './ui-blotters.js';
import { openCancelacion, masInfo } from './ui-ticket.js';

let root, perms, view='std', firma=null, timer=null, unsubs=[], rates=[...G10], prevPx={}, modules=[];
const q = s => $(s, root);
const today = () => { const d=new Date(); d.setHours(12,0,0,0); return d; };

export function mountBroker(el, user, {onLogout, onToggleConsole, onTheme}){
  root = el; S.user = user; perms = user.perms;
  S.client = CLIENTS[0]; C.getDatosEmpresa(S.client);
  S.ctx = { cargo:S.client.cuentas[0], abono:S.client.cuentas[1], linea:S.client.lineas[0], ordenante:S.client.ordenantes[0] };
  askFirma(()=>{ render({onLogout,onToggleConsole,onTheme}); });
}
function askFirma(cb){
  const body = h(`<div><div class="notice">Firma ágil: firme un <b>límite de tiempo</b> (obligatorio) y un <b>número de operaciones</b> (opcional). Mientras dure, las operaciones no pedirán firma individual. Al agotarse cualquiera de los dos, la sesión operativa se cierra.</div>
    <div class="form"><div class="field"><label>Tiempo (minutos)</label><input data-min type="number" value="30" min="1" max="120"></div><div class="field"><label>Nº operaciones (opcional)</label><input data-ops type="number" placeholder="sin límite" min="1"></div></div></div>`);
  const m = modal({ title:'Acceso operativo · firma ágil', width:520, body, actions:[
    {label:'Solo consulta', onClick(a){ firma={ until:null, ops:null, consultivo:true }; a.close(); cb(); }},
    {label:'Firmar', cls:'btn-primary', onClick(a){ const min=+$('[data-min]',body).value||30; const ops=$('[data-ops]',body).value? +$('[data-ops]',body).value : null;
      firma={ until: Date.now()+min*60000, total: min*60000, ops, opsTotal:ops, consultivo:false }; C.log('core','firma ágil registrada',{minutos:min, operaciones:ops??'sin límite'}); a.close(); cb(); }} ] });
  m.sticky = true;
}
function render(cbs){
  root.innerHTML = `<div class="broker">
    <div class="b-top" data-top></div>
    <div class="b-main ${view==='pro'?'pro':''}" data-main></div>
    <div class="b-foot" data-foot></div>
  </div><div class="rpanel" data-rpanel></div>`;
  renderTop(cbs); renderMain(); renderFoot(); renderRPanel(cbs);
  unsubs.forEach(f=>f()); unsubs=[ PX.subscribe(onTick), C.onOps(()=>{ renderBlotter(); renderTop(cbs); }) ];
  clearInterval(timer); timer = setInterval(renderFoot, 1000);
}
function renderTop(cbs){
  const c=S.client, ctx=S.ctx;
  const acct = (label,key,items,get,bal) => `<div class="acct"><label>${label}</label><select data-ctx="${key}">${items.map((it,i)=>`<option value="${i}" ${ctx[key]===it?'selected':''}>${esc(get(it))}</option>`).join('')}</select><span class="bal">${bal}</span></div>`;
  q('[data-top]').innerHTML = `<div class="brand"><div class="mark" style="width:28px;height:28px;border-radius:7px;background:var(--navy);color:#fff;display:grid;place-items:center;font-family:var(--mono);font-weight:800">T</div><b style="font-size:16px;color:var(--navy)">${BRAND.name} <span style="color:var(--accent)">Bróker</span></b></div>
    ${acct('Cuenta de cargo','cargo',c.cuentas,x=>x.n,`Saldo ${fmtN(ctx.cargo.saldo,2)} ${ctx.cargo.div}`)}
    <button class="icon-btn" data-swapacc title="Intercambiar cargo y abono">⇄</button>
    ${acct('Cuenta de abono','abono',c.cuentas,x=>x.n,'')}
    ${acct('Línea seguro de cambio','linea',c.lineas,x=>`${x.n} · ${x.div}`,`Límite ${fmtN(ctx.linea.disp,2)} ${ctx.linea.div}`)}
    <span style="flex:1"></span>
    <span class="chip">${esc(S.user.nombre)}</span>
    <span class="seg"><button data-view="std" class="${view==='std'?'on':''}">Estándar</button><button data-view="pro" class="${view==='pro'?'on':''}">Profesional</button></span>
    <button class="icon-btn" data-menu>☰</button>`;
  $$('[data-ctx]',root).forEach(s=>s.onchange=()=>{ const k=s.dataset.ctx; const list=k==='linea'?c.lineas:c.cuentas; S.ctx[k]=list[+s.value]; renderTop(cbs); });
  q('[data-swapacc]').onclick=()=>{ [S.ctx.cargo,S.ctx.abono]=[S.ctx.abono,S.ctx.cargo]; renderTop(cbs); };
  $$('[data-view]',root).forEach(b=>b.onclick=()=>{ view=b.dataset.view; render(cbs); });
  q('[data-menu]').onclick=()=>q('[data-rpanel]').classList.toggle('open');
}
function renderMain(){
  const main = q('[data-main]');
  if(view==='std'){
    main.innerHTML = `<div class="b-left"><div class="card" style="display:flex;flex-direction:column;min-height:0"><div class="c-h">Operaciones</div><div class="dock" data-blotter style="height:auto;flex:1;border-top:0"></div></div></div>
      <div class="b-right"><div class="card"><div class="c-h">Precios <span style="flex:1"></span><select data-rdate class="small" style="height:24px;padding:0 6px">${TENORS.map(t=>`<option value="${t.k}" ${t.k==='SPOT'?'selected':''}>${t.l}</option>`).join('')}</select><button class="btn btn-ghost btn-sm" data-addccy>Añadir divisas</button></div><div class="rates" data-rates></div></div>
      <div class="card" data-opmod></div></div>`;
    renderRates(); renderOpModule($('[data-opmod]',main), 0); renderBlotter();
  } else {
    main.innerHTML = `<div style="display:grid;grid-template-rows:auto 1fr;gap:12px;min-height:0"><div class="pro-grid" data-pro></div><div class="card" style="display:flex;flex-direction:column;min-height:0"><div class="c-h">Operaciones</div><div class="dock" data-blotter style="height:auto;flex:1;border-top:0"></div></div></div>`;
    const pro = $('[data-pro]',main); modules = [];
    for(let i=0;i<3;i++){ const card=h('<div class="card"></div>'); pro.appendChild(card); renderOpModule(card,i); }
    const add=h('<div class="card" style="display:grid;place-items:center;min-height:200px;border-style:dashed;color:var(--ink-3);font-size:34px;cursor:pointer">+</div>'); add.onclick=()=>{ const card=h('<div class="card"></div>'); pro.insertBefore(card, add); renderOpModule(card, modules.length); }; pro.appendChild(add);
    renderBlotter();
  }
  q('[data-addccy]')?.addEventListener('click', ()=>{ const body=h(`<div class="form"><div class="field full"><label>Par</label><select data-p>${PAIRS.filter(p=>!rates.includes(p)).map(p=>`<option>${p}</option>`).join('')}</select></div></div>`);
    modal({title:'Añadir divisas',width:420,body,actions:[{label:'Cancelar',onClick:a=>a.close()},{label:'Añadir',cls:'btn-primary',onClick(a){ rates.push($('[data-p]',body).value); renderRates(); a.close(); }}]}); });
}
function renderRates(){
  const box=q('[data-rates]'); if(!box) return;
  box.innerHTML = rates.map(p=>`<div class="rate" data-rate="${p}"><span class="p">${FLAGS[p.split('/')[0]]||''} ${p}</span><span class="v" data-rv="${p}">—</span><button class="icon-btn" data-rm="${p}" title="Quitar" style="width:22px;height:22px">✕</button></div>`).join('');
  $$('[data-rm]',box).forEach(b=>b.onclick=e=>{ e.stopPropagation(); rates=rates.filter(x=>x!==b.dataset.rm); renderRates(); });
  $$('[data-rate]',box).forEach(r=>r.onclick=()=>{ const m=modules[0]; if(m){ m.set('pair', r.dataset.rate); } });
  onTick();
}
function onTick(){
  const tenor = q('[data-rdate]')?.value || 'SPOT'; const vd = PX.tenorDate(tenor);
  for(const p of rates){ const n=$(`[data-rv="${p}"]`,root); if(!n) continue; const pt=PX.tradingPrice(p); const m=C.clientMarginPorMil(S.client, tenor==='SPOT'||tenor==='TOD'||tenor==='TOM'?'spot':'fwd');
    const b=C.buildPrice({pair:p,dir:'COMPRAR',divOp:p.split('/')[1],pt,valueDate: ['TOD','TOM','SPOT'].includes(tenor)?null:vd, marginPorMil:m}); const v=b.precioFinal; const k='r'+p;
    const arr = prevPx[k]===undefined?'':v>prevPx[k]?'<span class="arrow up">▲</span>':v<prevPx[k]?'<span class="arrow down">▼</span>':''; prevPx[k]=v; n.innerHTML = `${fmtN(v,PX.dec(p))} ${arr}`; }
  modules.forEach(m=>m.tick());
}

// ---------- módulo de operación ----------
function renderOpModule(card, idx){
  const st = { dir:'COMPRAR', divSel:'quote', pair:'', amount:0, op:'CONTADO', tipo:'SPOTFWD', vd:PX.iso(PX.tenorDate('SPOT')), lim:'', fval:PX.iso(PX.addBiz(today(),5)), fdisp:'', live:false, rfs:null, last:null, frozen:false, draft:null };
  const M = { st, set(k,v){ st[k]=v; if(k==='pair'){ st.divSel='quote'; } paint(); }, tick(){ if(st.pair && !st.frozen) paintPrice(); } };
  modules[idx]=M;
  function paint(){
    const [b,qq] = st.pair? st.pair.split('/') : ['',''];
    const showLim = st.tipo!=='SPOTFWD'; const flex = st.op==='FLEX';
    card.innerHTML = `<div class="c-h">Operación ${idx>0?idx+1:''}<span style="flex:1"></span>${st.pair?`<span class="mono muted small">${st.pair}</span>`:''}</div><div class="c-b">
      <div class="bs" style="margin-bottom:8px"><button data-dir="COMPRAR" class="${st.dir==='COMPRAR'?'on':''}">Compra</button><button data-dir="VENDER" class="${st.dir==='VENDER'?'on':''}">Venta</button></div>
      <div class="form">
        <div class="field full"><label>Par divisas</label><select data-pair><option value="">Seleccione…</option>${PAIRS.map(p=>`<option ${st.pair===p?'selected':''}>${p}</option>`).join('')}</select></div>
        <div class="field"><label>Divisa</label><span class="seg" style="width:100%"><button data-ds="base" class="${st.divSel==='base'?'on':''}" ${!st.pair?'disabled':''}>${b||'base'}</button><button data-ds="quote" class="${st.divSel==='quote'?'on':''}" ${!st.pair?'disabled':''}>${qq||'cotiz.'}</button></span></div>
        <div class="field"><label>Importe</label><input data-amt value="${st.amount?fmtN(st.amount,0):'0'}" ${!st.pair?'disabled':''}></div>
        <div class="field"><label>Operación</label><select data-op ${!st.pair?'disabled':''}><option value="CONTADO" ${st.op==='CONTADO'?'selected':''}>Contado</option><option value="SC" ${st.op==='SC'?'selected':''}>Seguro de cambio</option><option value="FLEX" ${st.op==='FLEX'?'selected':''}>Seguro de cambio flexible</option></select></div>
        <div class="field"><label>Tipo de orden</label><select data-tipo ${!st.pair?'disabled':''}><option value="SPOTFWD" ${st.tipo==='SPOTFWD'?'selected':''}>Spot / Fwd</option><option value="ORDEN LIMITADA" ${st.tipo==='ORDEN LIMITADA'?'selected':''}>O. Limitada</option><option value="CALL ORDER" ${st.tipo==='CALL ORDER'?'selected':''}>Call Order</option><option value="AVISO" ${st.tipo==='AVISO'?'selected':''}>Aviso</option></select></div>
        <div class="field"><label>Fecha vencimiento</label><input type="date" data-vd value="${st.vd}" ${!st.pair?'disabled':''}></div>
        ${flex?`<div class="field"><label>Fecha disposición</label><input type="date" data-fdisp value="${st.fdisp}" ${!st.pair?'disabled':''}></div>`:''}
        ${showLim?`<div class="field"><label>Precio límite</label><input data-lim type="number" step="${st.pair?PX.pip(st.pair):0.0001}" value="${st.lim}"></div><div class="field"><label>Fecha validez</label><input type="date" data-fval value="${st.fval}"></div>`:''}
      </div>
      <div class="pxbox ${st.live?'live':''}" data-pxbox><div class="l">${st.pair? `${st.dir} ${st.divSel==='base'?b:qq} · ${st.op==='CONTADO'?'contado':st.op==='SC'?'seguro de cambio':'flexible'}`:'precio'}</div><div class="p" data-p>—</div><div class="tiny" data-stt style="opacity:.85"></div></div>
      <div style="display:flex;gap:8px;justify-content:flex-end" data-acts>
        ${!st.live ? `<button class="btn btn-primary" data-start ${!st.pair?'disabled':''}>${showLim?'Enviar orden':'Iniciar operación'}</button>`
          : `<button class="btn btn-ghost" data-cancel>Cancelar</button><button class="btn btn-primary tip" data-hire data-tip="Sin pantalla intermedia: viaja directamente a mercado">Contratar</button>`}
      </div></div>`;
    const Q=s=>$(s,card);
    $$('[data-dir]',card).forEach(x=>x.onclick=()=>{ st.dir=x.dataset.dir; paint(); });
    $$('[data-ds]',card).forEach(x=>x.onclick=()=>{ st.divSel=x.dataset.ds; paint(); });
    Q('[data-pair]').onchange=e=>M.set('pair',e.target.value);
    Q('[data-amt]').onblur=e=>{ st.amount=parseAmount(e.target.value); e.target.value=st.amount?fmtN(st.amount,0):'0'; };
    Q('[data-op]').onchange=e=>{ st.op=e.target.value; if(st.op!=='CONTADO' && PX.tenorFor(new Date(st.vd+'T12:00:00'))!=='FWD'){ st.vd=PX.iso(PX.tenorDate('1W')); } if(st.op==='FLEX'&&!st.fdisp) st.fdisp=PX.iso(C.fdeFor(new Date(st.vd+'T12:00:00'))); paint(); };
    Q('[data-tipo]').onchange=e=>{ st.tipo=e.target.value; paint(); };
    Q('[data-vd]').onchange=e=>{ const dt=new Date(e.target.value+'T12:00:00'); if(!PX.isBiz(dt)){ toast('Fines de semana y festivos no son seleccionables. Ajustado al siguiente día hábil.'); st.vd=PX.iso(PX.addBiz(dt,1)); } else st.vd=e.target.value; paint(); };
    Q('[data-fdisp]')?.addEventListener('change',e=>{ st.fdisp=e.target.value; });
    Q('[data-lim]')?.addEventListener('change',e=>{ st.lim=e.target.value; }); Q('[data-fval]')?.addEventListener('change',e=>{ st.fval=e.target.value; });
    Q('[data-start]')?.addEventListener('click', start); Q('[data-cancel]')?.addEventListener('click', ()=>{ st.rfs?.close(); st.live=false; paint(); }); Q('[data-hire]')?.addEventListener('click', hire);
    if(st.pair) paintPrice();
  }
  function ctxFor(){ return { tipoOrden: st.op==='CONTADO'?'CONTADO':'FORWARD', tipoOp: st.tipo!=='SPOTFWD'? st.tipo : st.op==='CONTADO'?'CONVERSIÓN': st.op==='SC'?'SEGURO DE CAMBIO':'SEGURO DE CAMBIO FLEXIBLE', divOp: st.divSel==='base'? st.pair.split('/')[0] : st.pair.split('/')[1], vd: new Date(st.vd+'T12:00:00') }; }
  function paintPrice(quote){
    const {tipoOrden, divOp, vd} = ctxFor(); const pt = quote || PX.tradingPrice(st.pair); const m = C.clientMarginPorMil(S.client, tipoOrden==='FORWARD'?'fwd':'spot');
    const b = C.buildPrice({ pair:st.pair, dir:st.dir, divOp, pt, valueDate: tipoOrden==='FORWARD'? vd:null, marginPorMil:m }); st.last=b;
    const n=$('[data-p]',card); if(!n) return; const k='m'+idx; const cls = prevPx[k]===undefined?'':b.precioFinal>prevPx[k]?'up':b.precioFinal<prevPx[k]?'down':''; prevPx[k]=b.precioFinal;
    n.className='p '+cls; n.textContent = fmtN(b.precioFinal, PX.dec(st.pair)); if(quote) $('[data-stt]',card).textContent = `precio ejecutable · ${quote.left}s`;
  }
  function validate(){
    const {tipoOrden,tipoOp,divOp,vd} = ctxFor();
    if(firma?.consultivo){ toast('Acceso consultivo: para operar debe firmar (pulse “Aquí” en el pie).','err'); return null; }
    if(!firma || (firma.until && Date.now()>firma.until) || (firma.ops!==null && firma.ops<=0)){ toast('Firma ágil agotada. Renueve tiempo y operaciones.','err'); return null; }
    const errs = C.validatePreTrade({ client:S.client, ctx:{...S.ctx, useLineaForSpot:false}, pair:st.pair, dir:st.dir, divOp, nominal:st.amount, tipoOrden, valueDate:vd, observaciones:'web', tipoOperacion: tipoOp==='CONVERSIÓN'||tipoOp==='SEGURO DE CAMBIO'||tipoOp==='SEGURO DE CAMBIO FLEXIBLE'? tipoOp : (tipoOrden==='FORWARD'?'SEGURO DE CAMBIO':'CONVERSIÓN') });
    if(st.op==='FLEX' && !st.fdisp) errs.unshift('Indique la fecha de disposición del flexible.');
    if(st.tipo!=='SPOTFWD' && (!st.lim||!st.fval)) errs.unshift('Indique precio límite y fecha de validez.');
    if(errs.length){ toast(errs[0],'err'); return null; } return {tipoOrden,tipoOp,divOp,vd};
  }
  function start(){
    const v = validate(); if(!v) return;
    if(st.tipo!=='SPOTFWD'){ // órdenes: se envían directamente
      const lim=+st.lim; const b=st.last||C.buildPrice({pair:st.pair,dir:st.dir,divOp:v.divOp,pt:PX.tradingPrice(st.pair),valueDate:v.tipoOrden==='FORWARD'?v.vd:null,marginPorMil:C.clientMarginPorMil(S.client,'spot')});
      const o = { idGlobal:C.nextGlobalId(), cliente:S.client.id, clienteNombre:S.client.nombre, canal:'WEB', usuario:S.user.user, tipoOrden:v.tipoOrden, tipoOp:st.tipo, par:st.pair, dir:st.dir, divOp:v.divOp, nominal:st.amount, contra:C.contravalor(st.pair,st.amount,v.divOp,lim), precioLimite:lim, precioOficina:lim,
        fechaOp:PX.iso(today()), fechaValor:st.vd, fechaValidez:st.fval, estado:'Orden enviada a mercado', origen:'trato', clientBuysBase:b.clientBuysBase, cuenta: v.tipoOrden==='FORWARD'?S.ctx.linea.n:S.ctx.cargo.n, markupOk:true, comision:C.comision(st.amount), cuentaComision:S.ctx.cargo.n };
      C.addOp(o); C.watchOrder(o); if(st.tipo!=='AVISO') consume(); else C.log('core','aviso dado de alta: no descuenta firma ni consume operación',{idGlobal:o.idGlobal});
      toast(`${st.tipo} enviada a mercado.`,'ok'); return;
    }
    st.live=true; paint(); $('[data-stt]',card).textContent='solicitando precio…'; C.log('fix',`RFS → proveedor: ${st.pair} ${st.dir} ${v.divOp} ${fmtN(st.amount,0)}`,{canal:'WEB'});
    st.rfs?.close(); st.rfs = PX.openRFS(st.pair, qq=>{ if(st.frozen) return; paintPrice(qq); if(qq.left<=0){ st.rfs.close(); st.live=false; toast('Precio expirado.'); paint(); } });
  }
  async function hire(){
    const v = validate(); if(!v||!st.last) return; st.frozen=true; st.rfs?.close(); const d=PX.dec(st.pair); const b=st.last;
    const o = { idGlobal:C.nextGlobalId(), cliente:S.client.id, clienteNombre:S.client.nombre, canal:'WEB', usuario:S.user.user, tipoOrden:v.tipoOrden, tipoOp:v.tipoOp, par:st.pair, dir:st.dir, divOp:v.divOp, nominal:st.amount, contra:C.contravalor(st.pair,st.amount,v.divOp,b.precioFinal),
      precioCliente:+b.precioFinal.toFixed(d), precioOficina:+(b.spotT + (b.pts||0)).toFixed(d), ptsFwd:b.ptsCliente, spotPips:b.spotPips, fwdPips:b.fwdPips, beneficio:C.beneficioEUR({pair:st.pair,nominal:st.amount,divOp:v.divOp,precioFinal:b.precioFinal,spotT:b.spotT,ptsCliente:b.ptsCliente,pts:b.pts}),
      fechaOp:PX.iso(today()), fechaValor:st.vd, fechaArbitraje: v.tipoOrden==='FORWARD'? PX.iso(PX.addBiz(v.vd,-1)):null, fechaDispCliente: st.op==='FLEX'? st.fdisp:null, fechaDispEstandar: st.op==='FLEX'? PX.iso(C.fdeFor(v.vd)):null,
      cuenta: v.tipoOrden==='FORWARD'?S.ctx.linea.n:S.ctx.cargo.n, cuenta2: v.tipoOrden==='FORWARD'?null:S.ctx.abono.n, markupOk:true, estado:'Precio recibido', origen:'trato', tsPrecio:new Date().toISOString(), clientBuysBase:b.clientBuysBase, comision:C.comision(st.amount), cuentaComision:S.ctx.cargo.n };
    C.addOp(o); const acts=$('[data-acts]',card); acts.innerHTML=`<span data-chip>${stateChip('Precio recibido',C.STATES)}</span>`;
    await C.executeDeal(o,{ onState:s=>{ const c=$('[data-chip]',card); if(c) c.innerHTML=stateChip(s,C.STATES); } });
    consume();
    acts.style.flexWrap='wrap'; acts.innerHTML = `<div style="flex:1 1 100%;font-size:12px;line-height:1.35" class="muted">${o.estado==='Ejecutada'?`Ref. <b class="mono">${o.ref}</b> · comisión <b class="mono">${fmtN(o.comision,2)} €</b> · cuenta <span class="mono">${esc(o.cuenta)}</span>`:`<span style="color:var(--down)">${esc(o.motivo||o.estado)}. Vuelva a solicitar precio.</span>`}</div><div style="display:flex;gap:8px;align-items:center;margin-left:auto">${stateChip(o.estado,C.STATES)}<button class="btn btn-primary btn-sm" data-new>Nueva operación</button></div>`;
    $('[data-new]',card).onclick=()=>{ st.live=false; st.frozen=false; st.amount=0; paint(); };
  }
  function consume(){ if(firma && firma.ops!==null){ firma.ops--; C.log('ws','core.firma.descontar()',{restantes:firma.ops}); } renderFoot(); }
  paint();
}
function renderBlotter(){ const d=q('[data-blotter]'); if(!d) return; S.dock.tab = S.dock.tab==='usuario' ? 'cliente' : S.dock.tab;
  renderDock(d, { perms, onAction(action,op){ if(action==='cancelar') openCancelacion(op,{perms,onDone:renderBlotter}); else if(action==='cancelarOrden'){ C.cancelOrder(op); toast('Orden cancelada.','ok'); } else if(action==='masInfo') masInfo(op); else if(action==='anticipar') toast('El anticipo se solicita a través de su gestor.','err'); } });
  const t=$('[data-tab="usuario"]',d); if(t) t.remove(); }
function renderFoot(){
  const f=q('[data-foot]'); if(!f) return;
  if(!firma || firma.consultivo){ f.innerHTML=`<span>Acceso <b>consultivo</b>: puede ver precios pero no operar.</span><span class="grow"></span><span>Para operar, firme <a href="#" data-renew style="color:var(--accent);font-weight:700">aquí</a>.</span><span>☎ 900 813 847</span><span class="tip" data-tip="${BRAND.name} v${BRAND.version}">ⓘ</span>`; }
  else { const left=Math.max(0,firma.until-Date.now()); const low = left < firma.total/4; const mm=String(Math.floor(left/60000)).padStart(2,'0'), ss=String(Math.floor(left%60000/1000)).padStart(2,'0');
    f.innerHTML=`<span>Operaciones disponibles: <span class="k ${firma.ops!==null&&firma.ops<=1?'low':''}">${firma.ops===null?'∞':firma.ops}</span></span><span>Tiempo restante: <span class="k ${low?'low':''}">${mm}:${ss}</span></span><span class="grow"></span><span>☎ 900 813 847</span><span>Renovar tiempo y operaciones <a href="#" data-renew style="color:var(--accent);font-weight:700">aquí</a></span><span class="tip" data-tip="${BRAND.name} v${BRAND.version}">ⓘ</span>`;
    if(left<=0 || (firma.ops!==null && firma.ops<=0)){ firma={consultivo:true}; toast('La firma ágil se ha agotado. La sesión pasa a modo consulta.','err'); } }
  $('[data-renew]',f)?.addEventListener('click',e=>{ e.preventDefault(); askFirma(()=>renderFoot()); });
}
function renderRPanel(cbs){
  const p=q('[data-rpanel]');
  p.innerHTML=`<div class="p-head">${BRAND.name} Bróker<span style="flex:1"></span><button class="icon-btn" data-x>✕</button></div><div class="p-body">
    <div class="row"><span>Tema</span><span class="seg"><button data-theme="light" class="${S.theme==='light'?'on':''}">Claro</button><button data-theme="sala" class="${S.theme==='sala'?'on':''}">Oscuro</button></span></div>
    <div class="sect">Integración (demo)</div><button class="item" data-console>Consola de integración</button>
    <div class="sect">Sesión</div><button class="item" data-logout>Volver a la web de empresas</button></div><div class="p-foot">${BRAND.name} v${BRAND.version}</div>`;
  $('[data-x]',p).onclick=()=>p.classList.remove('open'); $('[data-console]',p).onclick=()=>{ p.classList.remove('open'); cbs.onToggleConsole(); }; $('[data-logout]',p).onclick=cbs.onLogout;
  $$('[data-theme]',p).forEach(b=>b.onclick=()=>{ cbs.onTheme(b.dataset.theme); renderRPanel(cbs); });
}
