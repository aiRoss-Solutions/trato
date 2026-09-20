// Trato · "core" simulado: validaciones pre-trade, construcción del precio de cliente, máquina de estados,
// mensajes DO1 y consola de integración. Sin nada real detrás — todo vive en memoria.
import { CLIENTS, GENERIC, SEED_OPS, RATES } from './data.js';
import * as PX from './prices.js';

let idSeq = 500000120; let refSeq = 100400;
export const nextGlobalId = () => String(idSeq++);
export const nextRef = (o) => `${o?.tipoOrden==='FORWARD' ? 'SC' : 'CV'}-${refSeq++}`;

// ---------- consola de integración (lo que se vería pasar por los canales) ----------
const consoleSubs = new Set(); export const events = [];
export function log(kind, title, payload){
  const ev = { t: new Date(), kind, title, payload }; events.unshift(ev); if(events.length>300) events.pop();
  for(const f of consoleSubs) f(ev);
}
export const onLog = f => { consoleSubs.add(f); return ()=>consoleSubs.delete(f); };

// ---------- switch (ON: cliente → core → libros; OFF: proveedor cubre en mercado) ----------
export const cfg = { switchOn: true, obsObligatorias: true, rechazosAleatorios: false, markupModePerUser: { SALA:'both', TEL:'view', WEB:'none' } };

// ---------- clientes ----------
export const clients = () => CLIENTS;
export const generic = () => GENERIC;
export function findClient(q){
  q = (q||'').trim().toLowerCase(); if(!q) return null;
  return CLIENTS.find(c => c.nif.toLowerCase()===q || c.id===q || c.nombre.toLowerCase().includes(q)) || null;
}
// WS getDatosEmpresa: lo que el core devolvería al conectar un cliente
export function getDatosEmpresa(c){
  const out = { idPersona:c.id, nif:c.nif, tutor:c.tutor, estadoMifid:c.mifid, titularMifid:c.titularMifid, lei:c.lei, leiRenov:c.leiRenov,
    email:c.email, tel:c.tel, margenPorMil:c.margenPorMil, nivelCliente:c.nivel, margenPersonalizado:c.margenPersonalizado, margenes:c.margenes,
    cuentas:c.cuentas, lineas:c.lineas, ordenantes:c.ordenantes };
  log('ws','core.clientes.getDatosCliente', {nif:c.nif, '→':{margenPorMil:c.margenPorMil, nivelCliente:c.nivel, estadoMifid:c.mifid, lei:c.lei}});
  return out;
}

// ---------- margen de cliente ----------
export function clientMarginPorMil(c, kind /* 'spot'|'fwd' */){
  if(!c || c.generic) return 0;
  if(c.margenPersonalizado && c.margenes) return c.margenes[kind] ?? c.margenPorMil;
  return c.margenPorMil;
}

// Construcción del precio. dir = lo que hace el CLIENTE con la divisa de operación (divOp).
// Convención: el par es BASE/QUOTE. Si divOp es la QUOTE y el cliente COMPRA quote, vende base → bid. Si VENDE quote → ask.
// ¿El cliente compra la divisa BASE del par? (comprar la cotizada = vender la base). Único criterio para el signo del margen.
export function clientBuysBase(pair, dir, divOp){ const [base]=pair.split('/'); return (divOp===base) ? dir==='COMPRAR' : dir==='VENDER'; }
// Signo con el que el margen se suma al precio: +1 si el cliente compra base (paga más), -1 si la vende (cobra menos).
export function marginSign(pair, dir, divOp){ return clientBuysBase(pair, dir, divOp) ? +1 : -1; }

export function buildPrice({pair, dir, divOp, pt, valueDate, marginPorMil, markupOverridePips=null}){
  const clientBuysBase = marginSign(pair, dir, divOp) > 0;
  const spotT = clientBuysBase ? pt.ask : pt.bid;                 // precio trading (spot, sin margen)
  const pts = valueDate ? PX.fwdPoints(pair, valueDate) : 0;      // puntos forward de mercado
  const sign = clientBuysBase ? +1 : -1;                          // el margen siempre empeora el precio al cliente
  const pipv = PX.pip(pair);
  let markupPx = spotT * marginPorMil/1000;
  if(markupOverridePips!==null) markupPx = markupOverridePips * pipv;
  const spotPips = markupPx / pipv;                               // margen expresado en pips, parte spot
  const fwdPipsPx = Math.abs(pts) * 0.10;                         // margen sobre los puntos fwd: 10% de los puntos (regla del prototipo)
  const fwdPips = valueDate && pts!==0 ? fwdPipsPx/pipv : 0;
  const finalSpot = spotT + sign*markupPx;
  const ptsCliente = pts + sign*fwdPipsPx;
  const precioFinal = finalSpot + ptsCliente;
  return { spotT, pts, finalSpot, ptsCliente, precioFinal, spotPips, fwdPips, clientBuysBase, sign, pipv };
}
// Beneficio del banco en EUR (aprox): margen total × nominal en EUR
export function beneficioEUR({pair, nominal, divOp, precioFinal, spotT, ptsCliente, pts}){
  const [base] = pair.split('/');
  const nominalBase = divOp===base ? nominal : nominal/precioFinal;
  const nominalEUR = base==='EUR' ? nominalBase : nominalBase * (RATES['EUR/'+base] ? 1/RATES['EUR/'+base].mid : 1);
  const margen = Math.abs(precioFinal - (spotT+pts)) / precioFinal;
  return nominalEUR * margen;
}
export function contravalor(pair, nominal, divOp, px){ const [base]=pair.split('/'); return divOp===base ? nominal*px : nominal/px; }

// ---------- validaciones pre-trade (WS validacionPreTradeSpot) ----------
export function validatePreTrade({client, ctx, pair, dir, divOp, nominal, tipoOrden, valueDate, observaciones, tipoOperacion}){
  const errs = [];
  const [base, quote] = pair.split('/');
  if(!nominal || nominal<=0) errs.push('Indique un importe.');
  if(client?.generic){
    if(tipoOperacion!=='CLAVE DE ARBITRAJE') errs.push('Con cliente genérico solo se pueden realizar claves de arbitraje.');
    log('ws','core.trading.validacionPreTrade', {cliente:'GENÉRICO', resultado: errs.length?'KO':'OK', errs});
    return errs;
  }
  if(!client) errs.push('Seleccione un cliente.');
  if(client && client.mifid==='ko') errs.push('Cliente no apto MiFID para esta operativa.');
  if(cfg.obsObligatorias && tipoOperacion==='CLAVE DE ARBITRAJE' && !(observaciones||'').trim()) errs.push('Indique el motivo en «Observaciones»: es obligatorio en claves de arbitraje (trazabilidad). Puede relajarlo en Menú → Demo.');
  if(tipoOrden==='FORWARD'){
    if(base!=='EUR' && quote!=='EUR') errs.push('El core no admite forward si ninguna de las divisas es EUR.');
    if(!ctx.linea) errs.push('Seleccione una línea de seguro de cambio para operar a plazo.');
    else if(![base,quote].includes(ctx.linea.div)) errs.push(`La línea ${ctx.linea.n} es en ${ctx.linea.div} y no cubre ${pair}: elija una línea en ${base} o ${quote}.`);
    else { const need = importeEnLinea({par:pair, divOp, nominal}, ctx.linea); if(ctx.linea.disp < need) errs.push(`Disponible insuficiente en la línea ${ctx.linea.n}: quedan ${fmt(ctx.linea.disp)} ${ctx.linea.div} y la operación consume ${fmt(need)} ${ctx.linea.div}.`); }
  } else {
    if(tipoOperacion==='CONVERSIÓN'){
      if(!ctx.cargo || !ctx.abono) errs.push('Seleccione cuenta de cargo y de abono coherentes con el par.');
      else if(![base,quote].includes(ctx.cargo.div) || ![base,quote].includes(ctx.abono.div)) errs.push('Las cuentas de cargo/abono no corresponden a las divisas de la operación.');
      else if(ctx.cargo.div===ctx.abono.div) errs.push('Cuenta de cargo y abono no pueden ser de la misma divisa.');
      else { const cargoAmt = divOp===ctx.cargo.div ? nominal : contravalor(pair, nominal, divOp, RATES[pair]?.mid||1); if(ctx.cargo.saldo!==undefined && cargoAmt > ctx.cargo.saldo) errs.push(`Saldo insuficiente en la cuenta de cargo ${ctx.cargo.n}: ${fmt(ctx.cargo.saldo)} ${ctx.cargo.div} disponibles, la operación necesita ${fmt(cargoAmt)} ${ctx.cargo.div}.`); }
    }
    if(ctx.linea && ctx.linea.n.startsWith('89') && tipoOperacion!=='CLAVE DE ARBITRAJE' && ctx.useLineaForSpot) errs.push('Una línea de crédito (89) solo admite forward, no contado.');
  }
  log('ws','core.trading.validacionPreTrade', {nif:client?.nif, par:pair, tipoOrden, nominal, resultado: errs.length?'KO':'OK', errs});
  return errs;
}

// ---------- comisión (regla del sistema de referencia): 25 € hasta 100.000 de nominal, 0 a partir de ahí ----------
export function comision(nominal){ return nominal <= 100000 ? 25 : 0; }

// ---------- línea de seguro de cambio (89 …): consumo y restauración ----------
const fmt = n => new Intl.NumberFormat('es-ES',{maximumFractionDigits:0}).format(n);
export function lineaByCuenta(n){ for(const c of CLIENTS){ const l = c.lineas.find(x=>x.n===n); if(l) return l; } return null; }
// nominal de la operación expresado en la divisa de la línea (si no coincide, se pasa por el mid del par)
export function importeEnLinea(o, linea){
  if(!linea) return 0; if(o.divOp===linea.div) return o.nominal;
  const mid = RATES[o.par]?.mid || 1; return contravalor(o.par, o.nominal, o.divOp, mid);
}
// Se llama cuando una operación FORWARD queda Ejecutada: seguros consumen, anticipos y cancelaciones devuelven.
export function applyLinea(o, {silent=false}={}){
  if(o.tipoOrden!=='FORWARD' || o.lineaAplicada) return;
  const l = lineaByCuenta(o.cuenta); if(!l) return;
  const imp = importeEnLinea(o, l);
  const devuelve = /ANTICIPO|CANCELACI/.test(o.tipoOp);
  l.disp = Math.max(0, Math.min(l.limite, devuelve ? l.disp + imp : l.disp - imp));
  o.lineaAplicada = true;
  if(!silent) log('core', devuelve ? 'línea de seguro de cambio: importe restaurado' : 'línea de seguro de cambio: importe consumido', {linea:l.n, importe:+imp.toFixed(2), divisa:l.div, disponible:+l.disp.toFixed(2), limite:l.limite});
}

// ---------- operaciones (la "BBDD" de la plataforma) ----------
export const ops = SEED_OPS.map(o => ({...o, idGlobal: nextGlobalId(), hora:'—', markupOk:true}));
ops.forEach(o => { if(o.estado==='Ejecutada') applyLinea(o, {silent:true}); });   // el disponible de las líneas ya refleja lo vivo
const opSubs = new Set(); export const onOps = f => { opSubs.add(f); return ()=>opSubs.delete(f); };
export function notifyOps(){ for(const f of opSubs) f(); }
export function addOp(o){ ops.unshift(o); notifyOps(); return o; }
export function updateOp(o, patch){ Object.assign(o, patch); notifyOps(); }

// DO1: la operación ejecutada viaja al core por cola. Solo si el markup está completado.
export function sendDO1(o){
  const msg = { tipo:'DO1', idGlobal:o.idGlobal, referencia:o.ref, cliente:o.cliente, canal:o.canal, par:o.par, direccion:o.dir, nominal:o.nominal, contravalor:+o.contra.toFixed(2),
    precioSpot:o.precioOficina, precioFinalCliente:o.precioCliente, fechaValor:o.fechaValor, cuenta:o.cuenta, aypTicket:o.ayp||'N', timestampPrecio:o.tsPrecio, IS:'N', switch: cfg.switchOn?'ON':'OFF' };
  log('mq','DO1 → cola MQ (asiento en core)', msg);
  if(cfg.switchOn) log('core','core → sistema de tesorería (flujo de integración habitual)', {ref:o.ref, libro:'SALA'});
  else log('fix','proveedor cubre en mercado → interbancario a tesorería', {ref:o.ref});
}
export function sendDO2(o){ log('mq','DO2 → cola MQ', {idGlobal:o.idGlobal, ref:o.ref, evento:o.estado}); }

// ---------- máquina de estados ----------
// Solicitud pendiente → Precio recibido → Validando operación → (Orden rechazada | Rechazada en mercado)
//  → Ejecutando → (Confirmada en mercado si falta markup | Rechazada si falla el asiento | Ejecutada)
export const STATES = {
  'Solicitud pendiente':'wip','Precio recibido':'wip','Validando operación':'wip','Orden rechazada':'ko','Rechazada en mercado':'ko',
  'Confirmada en mercado':'warn','Precio expirado':'warn','Ejecutando':'wip','Rechazada':'ko','Orden enviada a mercado':'mkt','Ejecutada':'ok','Orden cancelada':'mkt',
  'Precio alcanzado':'warn','Notificada':'ok'
};
const wait = ms => new Promise(r=>setTimeout(r,ms));
export async function executeDeal(o, {onState, preErrors}){
  const set = s => { o.estado = s; onState?.(s); notifyOps(); };
  set('Validando operación'); await wait(650);
  if(preErrors?.length){ o.motivo = preErrors[0]; set('Orden rechazada'); return o; }
  log('fix', `RFS aceptado → orden a mercado (${o.par} ${o.dir} ${o.divOp} ${o.nominal})`, {idGlobal:o.idGlobal, precioTrading:o.precioOficina});
  await wait(500);
  if(cfg.rechazosAleatorios && Math.random()<0.03){ o.motivo='Precio fuera de mercado (last look)'; set('Rechazada en mercado'); return o; }
  log('fix','proveedor: FILL', {idGlobal:o.idGlobal});
  o.ref = o.ref || nextRef(o); o.fechaEjec = PX.iso(new Date()); o.hora = new Date().toLocaleTimeString('es-ES');
  if(!o.markupOk){ set('Confirmada en mercado'); return o; }
  set('Ejecutando'); await wait(700);
  if(cfg.rechazosAleatorios && Math.random()<0.02){ o.motivo='El core rechazó el asiento'; set('Rechazada'); return o; }
  sendDO1(o); applyLinea(o); set('Ejecutada'); return o;
}
// Completar markup a posteriori: entonces sí viaja al core
export async function completeMarkup(o){
  o.markupOk = true; o.estado='Ejecutando'; notifyOps(); await wait(600); sendDO1(o); applyLinea(o); updateOp(o,{estado:'Ejecutada'});
}
// Órdenes limitadas / call orders / avisos: vigilancia del precio límite
const watchers = new Map();
export function watchOrder(o){
  const h = setInterval(()=>{
    if(o.estado!=='Orden enviada a mercado'){ clearInterval(h); return; }
    const pt = PX.tradingPrice(o.par);
    const px = o.clientBuysBase ? pt.ask : pt.bid;
    // se vigila el límite de TRADING (precioOficina = límite cliente sin margen), que es lo que viaja al proveedor
    const lvl = o.precioOficina ?? o.precioLimite;
    const hit = o.clientBuysBase ? px <= lvl : px >= lvl;
    if(new Date(o.fechaValidez+'T23:59:00') < new Date()){ updateOp(o,{estado:'Orden cancelada', motivo:'Vencida'}); clearInterval(h); return; }
    if(hit){
      clearInterval(h);
      if(o.tipoOp==='ORDEN LIMITADA'){ o.ref = o.ref || nextRef(o); o.fechaEjec=PX.iso(new Date()); o.hora=new Date().toLocaleTimeString('es-ES'); o.precioCliente=o.precioLimite; o.precioOficina=+px.toFixed(PX.dec(o.par)); o.tsPrecio=new Date().toISOString(); log('fix','orden limitada ejecutada por el proveedor al alcanzar el nivel',{idGlobal:o.idGlobal, nivel:lvl, mercado:o.precioOficina}); sendDO1(o); applyLinea(o); updateOp(o,{estado:'Ejecutada'}); }
      else { updateOp(o,{estado:'Precio alcanzado'}); setTimeout(()=>{ updateOp(o,{estado:'Notificada'}); log('core','notificación al cliente (call order / aviso)',{idGlobal:o.idGlobal, par:o.par, precio:o.precioLimite}); }, 900); }
    }
  }, 700);
  watchers.set(o.idGlobal, h);
}
export function cancelOrder(o){ const h=watchers.get(o.idGlobal); if(h) clearInterval(h); updateOp(o,{estado:'Orden cancelada'}); log('fix','cancelación de orden enviada al proveedor',{idGlobal:o.idGlobal}); }

// ---------- forward flexible: fecha disponibilidad estándar = 20% de los días naturales ----------
export function fdeFor(fechaVto){
  const today=new Date(); today.setHours(12,0,0,0); const days=Math.max(1,Math.round((fechaVto-today)/86400000));
  const x=new Date(today); x.setDate(x.getDate()+Math.ceil(days*0.20)); return PX.nextBiz(x);
}
// Anticipo: precio = Fwd inicial − puntos swap (ask para importador, bid para exportador). Prototipo: lineal por días.
export function anticipoPrice(o, newValueDate){
  const orig = new Date(o.fechaValor+'T12:00:00'); const days = Math.max(0, Math.round((orig-newValueDate)/86400000));
  const swap = RATES[o.par].fwdY * days/365; const half = RATES[o.par].spread*PX.pip(o.par)*0.5;
  // medio spread siempre en contra del cliente: si compra base, el swap le cuesta más; si la vende, le pagan menos
  const ptsSwap = marginSign(o.par, o.dir, o.divOp) > 0 ? swap+half : swap-half;
  return { precioOficina: o.precioOficina - ptsSwap, ptsSwap };
}
