// Trato · ticket de ejecución en la propia caja, boleta de órdenes, anticipo, cancelación, cliente genérico, más info
import { $, $$, h, esc, fmtN, bigPx, toast, modal, parseAmount, stateChip } from './ui.js';
import * as C from './core.js';
import * as PX from './prices.js';
import { S } from './state.js';
import { TENORS } from './data.js';

const today = () => { const d=new Date(); d.setHours(12,0,0,0); return d; };
const comision = nominal => Math.max(5, +(nominal*0.0005).toFixed(2));
const cuentaComision = () => S.ctx.cargo?.n || S.client?.cuentas?.find(c=>c.div==='EUR')?.n || '—';

export function tipoOperacion(tile, valueDate){
  if(S.mode==='FLEX') return { tipoOrden:'FORWARD', tipoOp:'SEGURO DE CAMBIO FLEXIBLE' };
  const fwd = PX.tenorFor(valueDate)==='FWD';
  if(tile.tipo==='CONVERSION') return { tipoOrden:'CONTADO', tipoOp:'CONVERSIÓN' };
  return fwd ? { tipoOrden:'FORWARD', tipoOp:'SEGURO DE CAMBIO' } : { tipoOrden:'CONTADO', tipoOp:'CLAVE DE ARBITRAJE' };
}

// ------------------------------------------------------------------ ticket
export function openTicket(tileEl, tile, dir, {perms, onDone}){
  const client = S.client; const pair = tile.pair; const divOp = tile.divOp; const nominal = tile.amount;
  const valueDate = tile.valueDate || PX.tenorDate(tile.tenor);
  const { tipoOrden, tipoOp } = tipoOperacion(tile, valueDate);
  const errs = C.validatePreTrade({ client, ctx:S.ctx, pair, dir, divOp, nominal, tipoOrden, valueDate, observaciones:tile.obs, tipoOperacion:tipoOp });
  if(errs.length){ toast(errs[0], 'err'); return; }
  const d = PX.dec(pair); const marginKind = tipoOrden==='FORWARD' ? 'fwd' : 'spot';
  const marginPorMil = C.clientMarginPorMil(client, marginKind);
  const canEdit = perms.markup; const markupSelectable = perms.markup;   // TEL: el markup va siempre completado
  let override = null, frozen = false, rfs = null, last = null, markupOk = true, curDir = dir;
  let fdc = S.mode==='FLEX' ? (tile.fdc || C.fdeFor(valueDate)) : null; const fde = S.mode==='FLEX' ? C.fdeFor(valueDate) : null;
  const op = { idGlobal:C.nextGlobalId(), cliente:client.id, clienteNombre:client.nombre, canal:S.user.canal, usuario:S.user.user, tipoOrden, tipoOp, par:pair, divOp, nominal,
    fechaOp:PX.iso(today()), fechaValor:PX.iso(valueDate), tenor:tile.tenor, obs:tile.obs, estado:'Solicitud pendiente', origen:'trato',
    cuenta: tipoOrden==='FORWARD' ? S.ctx.linea?.n : S.ctx.cargo?.n, cuenta2: tipoOrden==='FORWARD' ? null : S.ctx.abono?.n,
    fechaArbitraje: tipoOrden==='FORWARD' ? PX.iso(PX.addBiz(valueDate,-1)) : null,
    fechaDispCliente: fdc ? PX.iso(fdc) : null, fechaDispEstandar: fde ? PX.iso(fde) : null, comision: comision(nominal), cuentaComision: cuentaComision() };

  tileEl.classList.add('ticket'); tileEl.innerHTML = `
    <div class="t-head"><span class="pair">${esc(pair)}</span><span class="st wip" data-st>Solicitud pendiente</span><span class="muted small">${esc(tipoOp)}</span>
      <span class="grow" style="flex:1"></span><button class="icon-btn" data-close title="Cerrar">✕</button></div>
    <div class="tk">
      <div>
        <div class="row"><span>Cliente</span><span class="v">${esc(client.nombre)}</span></div>
        <div class="row"><span>Fecha valor</span><span class="v">${PX.es(valueDate)} <span class="muted">${esc(tile.tenor)}</span></span></div>
        ${fdc ? `<div class="row"><span>Fecha disponibilidad estándar</span><span class="v">${PX.es(fde)}</span></div>
        <div class="row"><span>Fecha disponibilidad cliente</span><span class="v"><input type="date" data-fdc value="${PX.iso(fdc)}" min="${PX.iso(fde)}" max="${PX.iso(valueDate)}" style="height:22px;padding:0 6px"></span></div>` : ''}
        <div class="dirsw" style="margin:8px 0">
          <div class="b ${curDir==='COMPRAR'?'on':''}" data-dir="COMPRAR">COMPRAR ${esc(divOp)}</div><button class="swap" data-swapdir title="Intercambiar dirección">⇄</button><div class="b ${curDir==='VENDER'?'on':''}" data-dir="VENDER">VENDER ${esc(divOp)}</div>
        </div>
        <div class="row"><span>Importe ${esc(divOp)}</span><span class="v">${fmtN(nominal,2)}</span></div>
        <div class="row"><span>Contravalor</span><span class="v" data-contra>—</span></div>
        <div class="final"><small>Precio final cliente</small><span data-final>—</span></div>
        <div class="bar"><i data-bar style="width:100%"></i></div>
      </div>
      <div>
        <div class="row"><span>Precio trading</span><span class="v" data-spotT>—</span></div>
        <div class="row"><span>Final spot</span><span class="v" data-finalspot>—</span></div>
        ${tipoOrden==='FORWARD' ? `<div class="row"><span>Puntos fwd</span><span class="v" data-pts>—</span></div>` : ''}
        ${fdc ? `<div class="row"><span>Puntos fwd FDC</span><span class="v" data-ptsfdc>—</span></div><div class="row"><span>Puntos fwd flexible</span><span class="v" data-ptsflex>—</span></div>` : ''}
        ${perms.verMargen ? `
        <div class="row"><span>Spot pips</span><span class="v"><button class="pm" data-pm="-1" ${canEdit?'':'disabled'}>−</button><span data-spotpips>—</span><button class="pm" data-pm="1" ${canEdit?'':'disabled'}>+</button></span></div>
        ${tipoOrden==='FORWARD' ? `<div class="row"><span>Fwd pips</span><span class="v" data-fwdpips>—</span></div>` : ''}
        <div class="row"><span>Precio final</span><span class="v"><button class="pm" data-pf="-1" ${canEdit?'':'disabled'}>−</button><span data-pf-v>—</span><button class="pm" data-pf="1" ${canEdit?'':'disabled'}>+</button></span></div>
        <div class="row"><span>Beneficio</span><span class="v"><button class="pm" data-bn="-1" ${canEdit?'':'disabled'}>−</button><span data-benef>—</span> €<button class="pm" data-bn="1" ${canEdit?'':'disabled'}>+</button></span></div>` : ''}
        <label class="check" style="margin-top:8px"><input type="checkbox" data-mk ${markupOk?'checked':''} ${markupSelectable?'':'disabled'}> Markup completado</label>
        <div class="tiny muted" style="margin-top:4px">La operación solo viaja al core cuando el markup está completado.</div>
        <div data-motivo class="notice err hide"></div>
      </div>
    </div>
    <div class="actions"><button class="btn btn-ghost btn-sm" data-reject>Rechazar</button><button class="btn btn-ghost btn-sm" data-rfs>Solicitar precio</button><span class="grow"></span><button class="btn btn-primary" data-accept>Aceptar</button></div>`;

  const set = (sel, html) => { const e=$(sel, tileEl); if(e) e.innerHTML = html; };
  const setState = s => { const e=$('[data-st]',tileEl); if(e){ e.textContent=s; e.className='st '+(C.STATES[s]||'mkt'); } op.estado = s; };
  const pip = PX.pip(pair);

  function compute(pt){
    let b = C.buildPrice({ pair, dir:curDir, divOp, pt, valueDate: tipoOrden==='FORWARD'? valueDate : null, marginPorMil, markupOverridePips: override });
    if(fdc){ // forward flexible: puntos por fecha de disponibilidad
      const ptsFDC = PX.fwdPoints(pair, fdc); const ptsV = b.pts; const r = 0.5;
      const flex = fdc <= fde ? ptsFDC : ptsFDC + (ptsV - ptsFDC)*r;
      b.ptsFDC = ptsFDC; b.ptsFlex = flex; b.ptsCliente = flex + b.sign*Math.abs(flex)*0.10; b.precioFinal = b.finalSpot + b.ptsCliente;
    }
    b.contra = C.contravalor(pair, nominal, divOp, b.precioFinal);
    b.beneficio = C.beneficioEUR({ pair, nominal, divOp, precioFinal:b.precioFinal, spotT:b.spotT, ptsCliente:b.ptsCliente, pts:b.pts });
    return b;
  }
  function paint(b){
    last = b;
    set('[data-spotT]', fmtN(b.spotT,d)); set('[data-finalspot]', fmtN(b.finalSpot,d)); set('[data-final]', fmtN(b.precioFinal,d)); set('[data-contra]', fmtN(b.contra,2));
    set('[data-pts]', fmtN(b.ptsCliente/pip,1)+' pts'); set('[data-ptsfdc]', b.ptsFDC!==undefined? fmtN(b.ptsFDC/pip,1)+' pts':'—'); set('[data-ptsflex]', b.ptsFlex!==undefined? fmtN(b.ptsFlex/pip,1)+' pts':'—');
    set('[data-spotpips]', fmtN(b.spotPips,1)); set('[data-fwdpips]', fmtN(b.fwdPips,1)); set('[data-pf-v]', fmtN(b.precioFinal,d)); set('[data-benef]', fmtN(b.beneficio,2));
  }
  function startRFS(){
    rfs?.close(); setState('Solicitud pendiente'); C.log('fix', `RFS → proveedor: ${pair} ${curDir} ${divOp} ${fmtN(nominal,0)} ${tipoOrden}`, {idGlobal:op.idGlobal});
    setTimeout(()=>{ if(frozen) return; setState('Precio recibido');
      rfs = PX.openRFS(pair, q => { if(frozen) return; paint(compute(q)); $('[data-bar]',tileEl).style.width = (q.left/60*100)+'%'; if(q.left<=0){ rfs.close(); setState('Solicitud pendiente'); toast('Precio expirado. Solicite precio de nuevo.'); } });
    }, 350);
  }
  startRFS();

  $('[data-close]',tileEl).onclick = ()=>{ rfs?.close(); onDone(); };
  $$('[data-dir]',tileEl).forEach(b=>b.onclick=()=>{ if(frozen) return; curDir=b.dataset.dir; $$('[data-dir]',tileEl).forEach(x=>x.classList.toggle('on', x.dataset.dir===curDir)); op.dir=curDir; startRFS(); });
  $('[data-swapdir]',tileEl).onclick = ()=>{ if(frozen) return; curDir = curDir==='COMPRAR'?'VENDER':'COMPRAR'; $$('[data-dir]',tileEl).forEach(x=>x.classList.toggle('on', x.dataset.dir===curDir)); op.dir=curDir; startRFS(); };
  $('[data-fdc]',tileEl)?.addEventListener('change', e=>{ fdc = new Date(e.target.value+'T12:00:00'); op.fechaDispCliente = e.target.value; });
  const bump = k => { if(frozen||!last) return; override = (override ?? last.spotPips) + k; if(override<0) override=0; };
  $$('[data-pm]',tileEl).forEach(b=>b.onclick=()=>{ bump(+b.dataset.pm); });
  $$('[data-pf]',tileEl).forEach(b=>b.onclick=()=>{ bump(+b.dataset.pf * (last?.sign||1)); });
  $$('[data-bn]',tileEl).forEach(b=>b.onclick=()=>{ bump(+b.dataset.bn); });
  $('[data-mk]',tileEl).onchange = e => { markupOk = e.target.checked; };
  $('[data-rfs]',tileEl).onclick = ()=>{ if(frozen) return; startRFS(); };
  $('[data-reject]',tileEl).onclick = ()=>{ if(frozen) return; rfs?.close(); setState('Solicitud pendiente'); toast('Precio rechazado. Puede cambiar dirección o volver a solicitar.'); };
  $('[data-accept]',tileEl).onclick = async ()=>{
    if(frozen || !last || op.estado!=='Precio recibido'){ toast('No hay precio ejecutable vigente.','err'); return; }
    frozen = true; rfs?.close(); $$('button', tileEl).forEach(b=>{ if(!b.dataset.close) b.disabled=true; });
    Object.assign(op, { dir:curDir, precioCliente:+last.precioFinal.toFixed(d), precioOficina:+last.spotT.toFixed(d), contra:last.contra, ptsFwd:last.ptsCliente, spotPips:last.spotPips, fwdPips:last.fwdPips,
      beneficio:last.beneficio, markupOk, clientBuysBase:last.clientBuysBase, tsPrecio:new Date().toISOString() });
    C.addOp(op);
    await C.executeDeal(op, { onState:setState, preErrors:[] });
    showSummary();
  };
  function showSummary(){
    const ok = op.estado==='Ejecutada', conf = op.estado==='Confirmada en mercado';
    const motivo = $('[data-motivo]',tileEl); if(op.motivo){ motivo.textContent = op.motivo; motivo.classList.remove('hide'); }
    $('.actions',tileEl).innerHTML = `<span class="small muted">Ref. <b class="mono">${esc(op.ref||'—')}</b> · IdGlobal <b class="mono">${esc(op.idGlobal)}</b> · Comisión <b class="mono">${fmtN(op.comision,2)} €</b></span><span class="grow"></span>
      ${conf ? '<button class="btn btn-navy btn-sm" data-cmk>Completar markup</button>' : ''}<button class="btn btn-primary btn-sm" data-new>Nueva operación</button>`;
    $('[data-new]',tileEl).onclick = ()=>onDone();
    $('[data-cmk]',tileEl)?.addEventListener('click', async e=>{ e.target.disabled=true; await C.completeMarkup(op); setState('Ejecutada'); toast('Markup completado. Operación enviada al core.','ok'); e.target.remove(); });
    if(ok) toast(`Operación ${op.ref} ejecutada y asentada.`, 'ok'); else if(conf) toast('Ejecutada en mercado. Pendiente de completar markup para enviarla al core.'); else toast(op.motivo||op.estado, 'err');
  }
}

// ------------------------------------------------------------------ boleta de órdenes limitadas / call orders / avisos
export function openOrderBoleta({perms, onDone}){
  const client = S.client; if(!client || client.generic){ toast('Seleccione un cliente real para dar de alta órdenes.','err'); return; }
  const body = h(`<div class="two">
    <div class="box"><h3>Boleta</h3><div class="form">
      <div class="field full"><label>Par divisas</label><select data-pair><option value="">Seleccione…</option>${S.tiles.map(t=>t.pair).filter((v,i,a)=>a.indexOf(v)===i).concat(['EUR/PLN','EUR/MXN','USD/JPY','GBP/USD']).filter((v,i,a)=>a.indexOf(v)===i).map(p=>`<option>${p}</option>`).join('')}</select></div>
      <div class="field"><label>Divisa</label><select data-div disabled></select></div>
      <div class="field"><label>Nominal</label><input data-nom placeholder="30K · 1M" disabled></div>
      <div class="field"><label>Dirección</label><select data-dir disabled><option>COMPRAR</option><option>VENDER</option></select></div>
      <div class="field"><label>Tipo de orden</label><select data-tord disabled><option value="CONTADO">Contado</option><option value="FORWARD">Seguro de cambio</option></select></div>
      <div class="field"><label>Tipo</label><select data-tipo disabled><option>ORDEN LIMITADA</option><option>CALL ORDER</option><option>AVISO</option></select></div>
      <div class="field"><label>Fecha valor vto</label><input type="date" data-fv disabled></div>
      <div class="field"><label>Fecha validez de la orden</label><input type="date" data-fval disabled></div>
      <div class="field"><label>Precio límite</label><input data-lim type="number" step="0.0001" disabled></div>
      <div class="field full"><label>Observaciones</label><input data-obs disabled></div>
    </div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-ghost btn-sm" data-clear>Limpiar</button><span style="flex:1"></span><button class="btn btn-navy btn-sm" data-sol disabled>Solicitar</button></div></div>
    <div class="box"><h3>Datos calculados</h3><div data-calc class="empty" style="padding:30px 10px">Complete la boleta y pulse Solicitar.</div></div>
  </div>`);
  const m = modal({ title:'Orden limitada · Call order · Aviso', body, width:860, actions:[
    {label:'Cancelar', onClick:a=>a.close()}, {label:'Nueva operación', id:'new', cls:'btn-ghost', onClick(){ reset(); }}, {label:'Aceptar', id:'ok', cls:'btn-primary', onClick(){ accept(); }} ] });
  const q = s => $(s, body); let calc = null, draft = null;
  q('[data-pair]').onchange = ()=>{ const p=q('[data-pair]').value; const en = !!p; $$('select,input', body).forEach(i=>{ if(i!==q('[data-pair]')) i.disabled=!en; });
    if(p){ const [b,qq]=p.split('/'); q('[data-div]').innerHTML=`<option>${qq}</option><option>${b}</option>`; q('[data-lim]').step = PX.pip(p); q('[data-fv]').value = PX.iso(PX.tenorDate('SPOT')); q('[data-fval]').value = PX.iso(PX.addBiz(new Date(),5)); }
    q('[data-sol]').disabled = !en; };
  q('[data-fv]').onchange = ()=>{ const dt=new Date(q('[data-fv]').value+'T12:00:00'); q('[data-tord]').value = PX.tenorFor(dt)==='FWD'?'FORWARD':'CONTADO'; };
  q('[data-tord]').onchange = ()=>{ if(q('[data-tord]').value==='FORWARD' && PX.tenorFor(new Date(q('[data-fv]').value+'T12:00:00'))!=='FWD'){ q('[data-fv]').value = PX.iso(PX.tenorDate('1M')); } };
  function reset(){ $$('select,input', body).forEach(i=>{ i.value=''; i.disabled=true; }); q('[data-pair]').disabled=false; q('[data-calc]').className='empty'; q('[data-calc]').innerHTML='Complete la boleta y pulse Solicitar.'; calc=null; draft=null; }
  q('[data-clear]').onclick = reset;
  q('[data-sol]').onclick = ()=>{
    const pair=q('[data-pair]').value, divOp=q('[data-div]').value, nominal=parseAmount(q('[data-nom]').value), dir=q('[data-dir]').value, tipoOrden=q('[data-tord]').value, tipo=q('[data-tipo]').value;
    const fv=q('[data-fv]').value, fval=q('[data-fval]').value, lim=parseFloat(q('[data-lim]').value);
    if(!nominal||!fv||!fval||!lim){ toast('Complete nominal, fechas y precio límite.','err'); return; }
    const errs = C.validatePreTrade({ client, ctx:S.ctx, pair, dir, divOp, nominal, tipoOrden, valueDate:new Date(fv+'T12:00:00'), observaciones:'x', tipoOperacion: tipoOrden==='FORWARD'?'SEGURO DE CAMBIO':'CONVERSIÓN' });
    if(errs.length){ toast(errs[0],'err'); return; }
    const pt = PX.tradingPrice(pair); const b = C.buildPrice({ pair, dir, divOp, pt, valueDate: tipoOrden==='FORWARD'? new Date(fv+'T12:00:00'):null, marginPorMil:C.clientMarginPorMil(client, tipoOrden==='FORWARD'?'fwd':'spot') });
    const d = PX.dec(pair);
    // P-001: el límite tiene que ser MEJOR para el cliente que el precio actual; si ya es alcanzable, no es una orden, es una operación a mercado
    const actual = b.precioFinal; const alcanzable = b.clientBuysBase ? lim >= actual : lim <= actual;
    if(alcanzable){ toast(`El límite ${fmtN(lim,d)} ya es alcanzable: el precio actual para el cliente es ${fmtN(actual,d)}. ${tipo==='ORDEN LIMITADA'?'Opere a mercado desde el tile o mejore el límite.':'El precio ya está alcanzado; ajuste el nivel.'}`,'err'); return; }
    // beneficio = solo el margen (spot pips + fwd pips) sobre el nominal, no la distancia límite-mercado
    const margenPx = (b.spotPips + b.fwdPips) * b.pipv;
    const benef = C.beneficioEUR({ pair, nominal, divOp, precioFinal:lim, spotT: lim - b.sign*margenPx, ptsCliente:0, pts:0 });
    calc = { b, benef, com:comision(nominal) };
    draft = { idGlobal:C.nextGlobalId(), cliente:client.id, clienteNombre:client.nombre, canal:S.user.canal, usuario:S.user.user, tipoOrden, tipoOp:tipo, par:pair, dir, divOp, nominal, contra:C.contravalor(pair,nominal,divOp,lim),
      precioLimite:lim, precioOficina:+(lim - b.sign*b.spotPips*b.pipv).toFixed(d), fechaOp:PX.iso(today()), fechaValor:fv, fechaValidez:fval, obs:q('[data-obs]').value, estado:'Solicitud pendiente', origen:'trato', clientBuysBase:b.clientBuysBase,
      cuenta: tipoOrden==='FORWARD'? S.ctx.linea?.n : S.ctx.cargo?.n, comision:calc.com, cuentaComision:cuentaComision(), markupOk:true, spotPips:b.spotPips, fwdPips:b.fwdPips, beneficio:benef };
    q('[data-calc]').className=''; q('[data-calc]').innerHTML = `<div class="kv-grid">
      <div class="kv"><span>IdGlobal</span><span>${draft.idGlobal}</span></div><div class="kv"><span>Estado</span><span>${stateChip('Solicitud pendiente',C.STATES)}</span></div>
      <div class="kv"><span>Precio trading (límite que viaja al proveedor)</span><span>${fmtN(draft.precioOficina,d)}</span></div><div class="kv"><span>Puntos forward</span><span>${tipoOrden==='FORWARD'?fmtN(b.ptsCliente/b.pipv,1)+' pts':'—'}</span></div>
      <div class="kv"><span>Spot pips</span><span>${fmtN(b.spotPips,1)}</span></div><div class="kv"><span>Fwd pips</span><span>${fmtN(b.fwdPips,1)}</span></div>
      <div class="kv"><span>Beneficio</span><span>${fmtN(benef,2)} €</span></div><div class="kv"><span>Comisión</span><span>${fmtN(calc.com,2)} €</span></div>
      <div class="kv wide"><span>Cuenta comisión</span><span>${esc(cuentaComision())}</span></div></div>
      <div class="notice">${tipo==='ORDEN LIMITADA' ? 'La orden pre-consume línea de crédito y se envía al proveedor, que la ejecutará al alcanzar el precio trading.' : tipo==='CALL ORDER' ? 'Al alcanzar el precio, pasará a <b>Precio alcanzado</b> y de inmediato a <b>Notificada</b>.' : 'Aviso informativo: no consume operación de la firma ni genera asiento.'}</div>`;
  };
  function accept(){
    if(!draft){ toast('Pulse Solicitar antes de aceptar.','err'); return; }
    draft.estado='Orden enviada a mercado'; C.addOp(draft); C.watchOrder(draft);
    C.log('fix', `${draft.tipoOp} enviada al proveedor`, {idGlobal:draft.idGlobal, par:draft.par, limite:draft.precioLimite, validez:draft.fechaValidez});
    toast(`${draft.tipoOp} enviada a mercado (IdGlobal ${draft.idGlobal}).`,'ok'); onDone?.(); m.close();
  }
}

// ------------------------------------------------------------------ anticipo
export function openAnticipo(op, {perms, onDone}){
  const flex = /FLEXIBLE/.test(op.tipoOp); const d = PX.dec(op.par); const pend = op.dispon ?? op.nominal;
  const body = h(`<div class="two">
    <div class="box"><h3>Seguro de cambio original</h3><div class="kv-grid">
      <div class="kv"><span>Cliente</span><span>${esc(S.client.nombre)}</span></div><div class="kv"><span>Referencia</span><span>${esc(op.ref)}</span></div>
      <div class="kv"><span>Fecha operación</span><span>${PX.es(op.fechaOp)}</span></div><div class="kv"><span>Fecha valor</span><span>${PX.es(op.fechaValor)}</span></div>
      <div class="kv"><span>Precio oficina</span><span>${fmtN(op.precioOficina,d)}</span></div><div class="kv"><span>Precio cliente</span><span>${fmtN(op.precioCliente,d)}</span></div>
      <div class="kv"><span>${op.dir} ${op.divOp}</span><span>${fmtN(op.nominal,2)}</span></div><div class="kv"><span>Importe pendiente</span><span>${fmtN(pend,2)} ${op.divOp}</span></div>
      ${flex?`<div class="kv wide"><span>Disponible desde (FDC)</span><span>${PX.es(op.fechaDispCliente)}</span></div>`:''}</div></div>
    <div class="box"><h3>Anticipo</h3><div class="form">
      <div class="field"><label>Fecha valor</label><select data-fv><option value="SPOT">Spot</option><option value="TOD">Hoy</option><option value="TOM">Mañana</option></select></div>
      <div class="field"><label>Importe a anticipar (${op.divOp})</label><input data-imp value="${pend}"></div>
      <div class="field full"><button class="btn btn-navy btn-sm" data-sol>Solicitar</button></div></div>
      <div data-res class="hide"><div class="kv-grid">
        <div class="kv"><span>Precio oficina</span><span data-po>—</span></div><div class="kv"><span>Puntos fwd (swap)</span><span data-pts>—</span></div>
        <div class="kv"><span>Spot pips</span><span class="v" style="display:flex;gap:6px;align-items:center"><button class="pm" data-pm="-1">−</button><span data-sp>—</span><button class="pm" data-pm="1">+</button></span></div><div class="kv"><span>Fwd pips</span><span data-fp>—</span></div>
        <div class="kv"><span>Beneficio</span><span data-bn>—</span></div><div class="kv"><span>Estado</span><span data-st>${stateChip('Solicitud pendiente',C.STATES)}</span></div></div>
        <div class="big-px"><small>Precio anticipo cliente</small><span data-pc>—</span></div>
        <label class="check"><input type="checkbox" data-mk checked ${perms.markup?'':'disabled'}> Markup completado</label>
        ${flex?'<div class="notice">Anticipo de flexible: sin streaming de precios ejecutables. Se mantienen los datos originales; solo importe y fecha son modificables.</div>':''}
      </div></div></div>`);
  let rfs=null, last=null, override=null, frozen=false; const q = s=>$(s,body);
  const m = modal({ title:'Anticipo de seguro de cambio', body, width:900, onClose(){ rfs?.close(); }, actions:[ {label:'Rechazar', onClick:a=>{ rfs?.close(); a.close(); }}, {label:'Aceptar', id:'ok', cls:'btn-primary', onClick(){ accept(); }} ] });
  const marginPorMil = C.clientMarginPorMil(S.client,'fwd');
  function paint(){
    const nd = PX.tenorDate(q('[data-fv]').value); const imp = parseAmount(q('[data-imp]').value);
    const a = C.anticipoPrice(op, nd); const sign = C.marginSign(op.par, op.dir, op.divOp);
    const spotPips = override ?? (a.precioOficina*marginPorMil/1000)/PX.pip(op.par);
    const pc = flex ? op.precioCliente : a.precioOficina + sign*spotPips*PX.pip(op.par);
    const fwdPips = Math.abs(a.ptsSwap)*0.1/PX.pip(op.par);
    const benef = imp * Math.abs(pc - a.precioOficina)/pc;
    last = { nd, imp, po:a.precioOficina, pts:a.ptsSwap, spotPips, fwdPips, pc, benef };
    q('[data-po]').textContent=fmtN(a.precioOficina,d); q('[data-pts]').textContent=fmtN(a.ptsSwap/PX.pip(op.par),1)+' pts'; q('[data-sp]').textContent=fmtN(spotPips,1); q('[data-fp]').textContent=fmtN(fwdPips,1);
    q('[data-bn]').textContent=fmtN(benef,2)+' €'; q('[data-pc]').textContent=fmtN(pc,d);
  }
  q('[data-sol]').onclick = ()=>{ const imp=parseAmount(q('[data-imp]').value); if(!imp||imp>pend){ toast('Importe inválido o superior al pendiente.','err'); return; }
    q('[data-res]').classList.remove('hide'); q('[data-st]').innerHTML=stateChip('Precio recibido',C.STATES); paint();
    if(!flex){ rfs?.close(); rfs = PX.openRFS(op.par, ()=>{ if(!frozen) paint(); }); } else { $$('.pm',body).forEach(b=>b.disabled=true); } };
  $$('[data-pm]',body).forEach(b=>b.onclick=()=>{ if(!perms.markup||frozen||!last) return; override=(override??last.spotPips)+(+b.dataset.pm); if(override<0) override=0; paint(); });
  async function accept(){
    if(!last){ toast('Pulse Solicitar primero.','err'); return; } frozen=true; rfs?.close();
    const nop = { idGlobal:C.nextGlobalId(), cliente:op.cliente, clienteNombre:op.clienteNombre||S.client.nombre, canal:S.user.canal, usuario:S.user.user, tipoOrden:'FORWARD', tipoOp:'ANTICIPO', asociada:op.ref, ayp:'A',
      par:op.par, dir:op.dir, divOp:op.divOp, nominal:last.imp, contra:C.contravalor(op.par,last.imp,op.divOp,last.pc), precioCliente:+last.pc.toFixed(d), precioOficina:+last.po.toFixed(d), ptsFwd:last.pts, spotPips:last.spotPips, fwdPips:last.fwdPips, beneficio:last.benef,
      fechaOp:PX.iso(today()), fechaValor:PX.iso(last.nd), cuenta:op.cuenta, comision:comision(last.imp), cuentaComision:cuentaComision(), markupOk:q('[data-mk]').checked, estado:'Solicitud pendiente', origen:'trato', tsPrecio:new Date().toISOString(), clientBuysBase: op.clientBuysBase };
    C.addOp(nop); await C.executeDeal(nop, { onState:s=>{ q('[data-st]').innerHTML=stateChip(s,C.STATES); } });
    if(nop.estado==='Ejecutada'||nop.estado==='Confirmada en mercado'){ C.updateOp(op, { dispon: pend - last.imp }); toast(`Anticipo ${nop.ref} ${nop.estado.toLowerCase()}.`,'ok'); } else toast(nop.motivo||nop.estado,'err');
    onDone?.(); setTimeout(()=>m.close(), 900);
  }
}

// ------------------------------------------------------------------ cancelación (dos patas)
export function openCancelacion(op, {perms, onDone}){
  const flex = /FLEXIBLE/.test(op.tipoOp); const d = PX.dec(op.par); const pend = op.dispon ?? op.nominal; const opp = op.dir==='COMPRAR'?'VENDER':'COMPRAR';
  const body = h(`<div>
    <div class="two"><div class="box"><h3>Seguro de cambio original</h3><div class="kv-grid">
      <div class="kv"><span>Referencia</span><span>${esc(op.ref)}</span></div><div class="kv"><span>Fecha valor</span><span>${PX.es(op.fechaValor)}</span></div>
      <div class="kv"><span>Precio oficina</span><span>${fmtN(op.precioOficina,d)}</span></div><div class="kv"><span>Precio cliente</span><span>${fmtN(op.precioCliente,d)}</span></div>
      <div class="kv"><span>${op.dir} ${op.divOp}</span><span>${fmtN(op.nominal,2)}</span></div><div class="kv"><span>Pendiente</span><span>${fmtN(pend,2)} ${op.divOp}</span></div></div></div>
    <div class="box"><h3>Cancelación</h3><div class="form">
      <div class="field"><label>Fecha valor</label><select data-fv><option value="SPOT">Spot</option><option value="TOD">Hoy</option><option value="TOM">Mañana</option></select></div>
      <div class="field"><label>Importe a cancelar (${op.divOp})</label><input data-imp value="${pend}"></div>
      <div class="field full"><button class="btn btn-navy btn-sm" data-sol>Solicitar</button></div></div></div></div>
    <div class="two hide" data-res style="margin-top:14px">
      <div class="box"><h3>Pata anticipo</h3><div class="kv-grid"><div class="kv"><span>Precio oficina</span><span data-a-po>—</span></div><div class="kv"><span>Puntos fwd</span><span data-a-pts>—</span></div><div class="kv"><span>Spot pips</span><span data-a-sp>—</span></div><div class="kv"><span>Fwd pips</span><span data-a-fp>—</span></div><div class="kv"><span>Beneficio</span><span data-a-bn>—</span></div><div class="kv"><span>Precio anticipo cliente</span><span data-a-pc>—</span></div></div></div>
      <div class="box"><h3>Pata cancelación (${opp} ${op.divOp})</h3><div class="kv-grid"><div class="kv"><span>Precio cancelación oficina</span><span data-c-po>—</span></div><div class="kv"><span>Puntos fwd</span><span data-c-pts>—</span></div>
        <div class="kv"><span>Spot pips</span><span style="display:flex;gap:6px;align-items:center"><button class="pm" data-pm="-1">−</button><span data-c-sp>—</span><button class="pm" data-pm="1">+</button></span></div><div class="kv"><span>Fwd pips</span><span data-c-fp>—</span></div>
        <div class="kv"><span>Beneficio</span><span data-c-bn>—</span></div><div class="kv"><span>Estado</span><span data-st>${stateChip('Solicitud pendiente',C.STATES)}</span></div></div>
        <div class="big-px"><small>Precio cancelación cliente</small><span data-c-pc>—</span></div>
        <label class="check"><input type="checkbox" data-mk checked ${perms.markup?'':'disabled'}> Markup completado</label></div></div>
    ${flex?'<div class="notice">Flexible: la pata de anticipo mantiene los datos originales; la de cancelación sí tiene streaming.</div>':''}</div>`);
  let rfs=null, last=null, override=null, frozen=false; const q=s=>$(s,body);
  const m = modal({ title:'Cancelación de seguro de cambio', body, width:920, onClose(){ rfs?.close(); }, actions:[ {label:'Rechazar', onClick:a=>{ rfs?.close(); a.close(); }}, {label:'Aceptar', cls:'btn-primary', onClick(){ accept(); }} ] });
  const marginPorMil = C.clientMarginPorMil(S.client,'fwd');
  function paint(){
    const nd = PX.tenorDate(q('[data-fv]').value); const imp = parseAmount(q('[data-imp]').value); const pipv = PX.pip(op.par);
    const a = C.anticipoPrice(op, nd); const signA = C.marginSign(op.par, op.dir, op.divOp); const aSp = (a.precioOficina*marginPorMil/1000)/pipv; const aPc = flex? op.precioCliente : a.precioOficina + signA*aSp*pipv;
    const pt = PX.tradingPrice(op.par); const b = C.buildPrice({ pair:op.par, dir:opp, divOp:op.divOp, pt, valueDate:nd, marginPorMil, markupOverridePips:override });
    const cPc = b.precioFinal; const benef = imp*Math.abs(cPc-b.spotT)/cPc;
    last = { nd, imp, a:{po:a.precioOficina, pts:a.ptsSwap, sp:aSp, pc:aPc}, c:{po:b.spotT, pts:b.ptsCliente, sp:b.spotPips, fp:b.fwdPips, pc:cPc, bn:benef, cbb:b.clientBuysBase} };
    q('[data-a-po]').textContent=fmtN(a.precioOficina,d); q('[data-a-pts]').textContent=fmtN(a.ptsSwap/pipv,1)+' pts'; q('[data-a-sp]').textContent=fmtN(aSp,1); q('[data-a-fp]').textContent=fmtN(Math.abs(a.ptsSwap)*0.1/pipv,1); q('[data-a-bn]').textContent=fmtN(imp*Math.abs(aPc-a.precioOficina)/aPc,2)+' €'; q('[data-a-pc]').textContent=fmtN(aPc,d);
    q('[data-c-po]').textContent=fmtN(b.spotT,d); q('[data-c-pts]').textContent=fmtN(b.ptsCliente/pipv,1)+' pts'; q('[data-c-sp]').textContent=fmtN(b.spotPips,1); q('[data-c-fp]').textContent=fmtN(b.fwdPips,1); q('[data-c-bn]').textContent=fmtN(benef,2)+' €'; q('[data-c-pc]').textContent=fmtN(cPc,d);
  }
  q('[data-sol]').onclick=()=>{ const imp=parseAmount(q('[data-imp]').value); if(!imp||imp>pend){ toast('Importe inválido o superior al pendiente.','err'); return; } q('[data-res]').classList.remove('hide'); q('[data-st]').innerHTML=stateChip('Precio recibido',C.STATES); paint(); rfs?.close(); rfs=PX.openRFS(op.par,()=>{ if(!frozen) paint(); }); };
  $$('[data-pm]',body).forEach(b=>b.onclick=()=>{ if(!perms.markup||frozen||!last) return; override=(override??last.c.sp)+(+b.dataset.pm); if(override<0) override=0; paint(); });
  async function accept(){
    if(!last){ toast('Pulse Solicitar primero.','err'); return; } frozen=true; rfs?.close();
    const nop = { idGlobal:C.nextGlobalId(), cliente:op.cliente, clienteNombre:op.clienteNombre||S.client.nombre, canal:S.user.canal, usuario:S.user.user, tipoOrden:'FORWARD', tipoOp:'CANCELACIÓN', asociada:op.ref,
      par:op.par, dir:opp, divOp:op.divOp, nominal:last.imp, contra:C.contravalor(op.par,last.imp,op.divOp,last.c.pc), precioCliente:+last.c.pc.toFixed(d), precioOficina:+last.c.po.toFixed(d), ptsFwd:last.c.pts, spotPips:last.c.sp, fwdPips:last.c.fp, beneficio:last.c.bn,
      fechaOp:PX.iso(today()), fechaValor:PX.iso(last.nd), cuenta:op.cuenta, comision:comision(last.imp), cuentaComision:cuentaComision(), markupOk:q('[data-mk]').checked, estado:'Solicitud pendiente', origen:'trato', tsPrecio:new Date().toISOString(), clientBuysBase:last.c.cbb };
    C.addOp(nop); await C.executeDeal(nop,{ onState:s=>{ q('[data-st]').innerHTML=stateChip(s,C.STATES); } });
    if(nop.estado==='Ejecutada'||nop.estado==='Confirmada en mercado'){ C.updateOp(op,{ dispon: pend-last.imp }); toast(`Cancelación ${nop.ref} ${nop.estado.toLowerCase()}.`,'ok'); } else toast(nop.motivo||nop.estado,'err');
    onDone?.(); setTimeout(()=>m.close(),900);
  }
}

// ------------------------------------------------------------------ cliente genérico: cancelación ficticia
export function openCancelGenerica(op, {onDone}){
  modal({ title:'Cancelación ficticia · cliente genérico', width:560, body:`<div class="notice">Esta cancelación no pide datos. Al aceptar, la operación queda <b>Orden cancelada</b> en el blotter del usuario y <b>es responsabilidad del banco dar de alta en el core la operación asignada al cliente real</b>, que aparecerá en “Operaciones del cliente · Ejecutadas”.</div>
    <div class="kv-grid"><div class="kv"><span>IdGlobal</span><span>${esc(op.idGlobal)}</span></div><div class="kv"><span>Par</span><span>${esc(op.par)}</span></div><div class="kv"><span>${op.dir} ${op.divOp}</span><span>${fmtN(op.nominal,2)}</span></div><div class="kv"><span>Precio</span><span>${fmtN(op.precioCliente, PX.dec(op.par))}</span></div></div>`,
    actions:[ {label:'Cancelar', onClick:a=>a.close()}, {label:'Aceptar', cls:'btn-primary', onClick(a){ C.updateOp(op,{estado:'Orden cancelada'}); C.sendDO2(op); toast('Operación genérica cancelada. Pendiente de alta del cliente real en el core.','ok'); onDone?.(); a.close(); }} ] });
}
export function masInfo(op){
  const rows = Object.entries(op).filter(([k,v])=>v!==null && v!==undefined && typeof v!=='object').map(([k,v])=>`<div class="kv"><span>${esc(k)}</span><span>${esc(typeof v==='number'? fmtN(v, Number.isInteger(v)?0:4):v)}</span></div>`).join('');
  modal({ title:`Operación ${op.ref||op.idGlobal}`, width:760, body:`<div class="kv-grid" style="grid-template-columns:1fr 1fr 1fr">${rows}</div>`, actions:[{label:'Cerrar', onClick:a=>a.close()}] });
}
