// Trato · Asistente de mesa (DEMO). Responde con reglas sobre los datos locales: posición, operaciones, precios, línea, glosario.
// En producción este hueco conectaría con el LLM corporativo del banco (tenant propio), con las mismas fuentes de datos.
import * as C from './core.js';
import * as PX from './prices.js';
import { S } from './state.js';
import { PAIRS } from './data.js';
import { label as gl, PRODUCT, TERM } from './glossary.js';

const fmt = (n,d=2) => new Intl.NumberFormat('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
const GLOSS = {
  'spot':'Spot: compraventa de divisa con liquidación a dos días hábiles (o hoy / mañana). Si no pasa entre cuentas del cliente es spot con liquidación externa y exige observaciones.',
  'cambio entre cuentas':'Cambio entre cuentas: spot entre la cuenta de cargo y la de abono del mismo cliente.',
  'seguro de cambio':'Seguro de cambio: forward. Se fija hoy el tipo para una fecha valor futura; consume línea de riesgo FX.',
  'forward':'Forward = seguro de cambio: tipo fijado hoy para una fecha futura; consume línea de riesgo FX.',
  'flexible':'Seguro de cambio flexible: forward con ventana de disposición desde la fecha de disponibilidad (FDE = 20 % del plazo, o la que elija el cliente) hasta el vencimiento.',
  'anticipo':'Anticipo: disponer antes de vencimiento de parte o todo un seguro de cambio; el precio se ajusta con los puntos swap.',
  'cancelación':'Cancelación: cerrar un seguro de cambio antes de vencimiento en dos patas (anticipo + contraria a mercado) y liquidar por diferencias.',
  'línea':'Línea de riesgo FX: límite de riesgo de contrapartida para forwards. Se consume al ejecutar y se restaura con anticipos y cancelaciones; su divisa debe ser una del par.',
  'margen':'Margen: lo que la mesa añade al precio de trading (en pips o ‰ del cliente, por nivel o personalizado). Siempre empeora el precio al cliente.',
  'orden limitada':'Orden limitada: se ejecuta cuando el mercado alcanza un nivel mejor que el actual para el cliente. Se vigila el nivel de trading.',
  'alerta':'Alerta de precio / con llamada: aviso al alcanzar un nivel; la de llamada implica contactar al cliente. No consumen sesión ni generan asiento.',
  'sesión operativa':'Sesión operativa: en el portal de empresas, el cliente firma una vez por tiempo y nº de operaciones; mientras dure no se pide firma por operación.',
  'cobertura':'Cobertura en libros: ON, la mesa cubre en los libros del banco (tesorería); OFF, el proveedor cubre en mercado.',
};
export function ask(q){
  const s = (q||'').trim().toLowerCase(); if(!s) return 'Preguntame por la posición, las operaciones, un precio (p. ej. «EUR/USD 3M»), la línea de riesgo o un término (p. ej. «qué es un anticipo»).';
  const c = S.client;
  const pair = PAIRS.find(p=>s.includes(p.toLowerCase()) || s.includes(p.toLowerCase().replace('/','')));
  if(/posici[oó]n/.test(s)){
    if(!c) return 'No hay cliente seleccionado. Elegí uno con ⌘K y te doy su posición viva.';
    const list = C.ops.filter(o=>o.cliente===c.id && o.estado==='Ejecutada' && /^SEGURO DE CAMBIO/.test(o.tipoOp) && (o.dispon??o.nominal)>0);
    if(!list.length) return `${c.nombre} no tiene posición viva en forwards.`;
    const byDiv={}; for(const o of list){ const div=o.par.split('/').find(x=>x!=='EUR')||o.divOp; const sign=(o.dir==='COMPRAR')===(o.divOp===div)?1:-1; const vivo=o.dispon??o.nominal; byDiv[div]=(byDiv[div]||0)+sign*(o.divOp===div?vivo:o.contra*vivo/o.nominal); }
    return `Posición viva de ${c.nombre}: `+Object.entries(byDiv).map(([d,v])=>`${v>0?'compra':'vende'} ${fmt(Math.abs(v),0)} ${d}`).join(' · ')+`. ${list.length} forward${list.length>1?'s':''} vivo${list.length>1?'s':''}; el más próximo vence el ${PX.es(list.map(o=>o.fechaValor).sort()[0])}.`;
  }
  if(/[uú]ltima|reciente/.test(s)){
    const list = C.ops.filter(o=>(!c||o.cliente===c.id) && o.estado==='Ejecutada'); if(!list.length) return 'No hay operaciones ejecutadas.';
    const o=list[0]; return `Última operación${c?' de '+c.nombre:''}: ${o.ref} · ${gl(o.tipoOp)} · ${o.dir} ${fmt(o.nominal,0)} ${o.divOp} en ${o.par} a ${fmt(o.precioCliente,PX.dec(o.par))}, fecha valor ${PX.es(o.fechaValor)}, canal ${o.canal}.`;
  }
  if(/cu[aá]ntas|n[uú]mero de operaciones|operaciones (hoy|vivas)/.test(s)){
    const list = C.ops.filter(o=>!c||o.cliente===c.id); const viv=list.filter(o=>['Orden enviada a mercado','Confirmada en mercado','Precio alcanzado'].includes(o.estado));
    return `${list.length} operaciones${c?' de '+c.nombre:' en la mesa'}, ${list.filter(o=>o.estado==='Ejecutada').length} ejecutadas y ${viv.length} vivas (órdenes o pendientes de margen).`;
  }
  if(/l[ií]nea|disponible|riesgo/.test(s)){
    if(!c) return 'Elegí un cliente y te digo el disponible de su línea de riesgo FX.';
    if(!c.lineas?.length) return `${c.nombre} no tiene línea de riesgo FX: solo puede operar spot.`;
    return `Líneas de ${c.nombre}: `+c.lineas.map(l=>`${l.n} · disponible ${fmt(l.disp,0)} de ${fmt(l.limite,0)} ${l.div}`).join(' · ')+'.';
  }
  if(pair){
    const pt = PX.tradingPrice(pair); const d = PX.dec(pair); const m = C.clientMarginPorMil(c,'spot');
    const ten = (s.match(/\b(1w|2w|1m|2m|3m|6m|9m|1y)\b/)||[])[1]; const vd = ten? PX.tenorDate(ten.toUpperCase()) : null;
    const b1 = C.buildPrice({pair, dir:'COMPRAR', divOp:pair.split('/')[1], pt, valueDate:vd, marginPorMil:vd?C.clientMarginPorMil(c,'fwd'):m});
    const b2 = C.buildPrice({pair, dir:'VENDER', divOp:pair.split('/')[1], pt, valueDate:vd, marginPorMil:vd?C.clientMarginPorMil(c,'fwd'):m});
    return `${pair}${vd?' a '+ten.toUpperCase()+' (fecha valor '+PX.es(vd)+')':' spot'}: trading ${fmt(pt.bid,d)} / ${fmt(pt.ask,d)} (${PX.providerName()}${pt.src&&pt.src.bid!==pt.src.ask?' · bid '+pt.src.bid+', ask '+pt.src.ask:''}). Precio cliente${c?' para '+c.nombre:''}: compra ${pair.split('/')[1]} a ${fmt(b1.precioFinal,d)}, vende a ${fmt(b2.precioFinal,d)}${vd?` · puntos fwd ${fmt(b1.pts/PX.pip(pair),1)}`:''}.`;
  }
  if(/cotizaci|no cerrad|sin cerrar|tasa de cierre|hit ?rate/.test(s)){
    const st = C.quoteStats(c?.id); if(!st.total) return `Todavía no se ha mostrado ningún precio${c?' a '+c.nombre:''}.`;
    const cerr = st.total-st.abiertas; const perdidas = C.quotes.filter(q=>(!c||q.cliente===c.id) && q.outcome!=='ejecutada' && q.outcome!=='abierta').slice(0,3);
    return `${st.total} cotizaciones${c?' a '+c.nombre:''}: ${st.ejecutadas} ejecutadas, ${st.rechazadas} rechazadas, ${st.expiradas} expiradas y ${st.cerradas} cerradas sin operar (tasa de cierre ${cerr?Math.round(100*st.ejecutadas/cerr):0} %).${perdidas.length?' Últimas no cerradas: '+perdidas.map(q=>`${q.id} ${q.par} ${q.dir} ${fmt(q.nominal,0)} ${q.divOp} a ${q.precioCliente!=null?fmt(q.precioCliente,PX.dec(q.par)):'—'} (${q.outcome}${q.segundos!=null?', '+q.segundos+' s':''})`).join('; ')+'.':''}`;
  }
  const refM = s.match(/\b(sc|cv)-?\d{5,6}\b/i);
  if(refM && /proveedor|qui[eé]n|precio|explic/.test(s)){
    const ref = refM[0].toUpperCase().replace(/^(SC|CV)(\d)/,'$1-$2'); const o = C.ops.find(x=>(x.ref||'').toUpperCase()===ref);
    if(!o) return `No encuentro la operación ${ref}.`;
    return `${o.ref}: ${o.explicacion || `${o.dir} ${fmt(o.nominal,0)} ${o.divOp} en ${o.par} a ${fmt(o.precioCliente,PX.dec(o.par))} (oficina ${fmt(o.precioOficina,PX.dec(o.par))})`}${o.proveedor?` Proveedor de liquidez: ${o.proveedor}.`:' Sin proveedor registrado (operación anterior a la trazabilidad).'}`;
  }
  if(/proveedor|liquidez|mejor precio/.test(s)) return `Proveedor de liquidez activo: ${PX.providerName()}. Con «Mejor precio» se toma por cada lado el proveedor más barato entre ${PX.PROVIDERS.map(p=>p.name).join(', ')}. Se cambia en el bloque Liquidez de la columna de actividad.`;
  for(const [k,v] of Object.entries(GLOSS)) if(s.includes(k)) return v;
  if(/qu[eé] es|significa/.test(s)) return 'No tengo ese término en el glosario. Tengo: '+Object.keys(GLOSS).join(', ')+'.';
  return 'Puedo responder sobre la posición viva, la última operación, cuántas operaciones hay, un precio («EUR/USD 3M»), la línea de riesgo, el proveedor de liquidez y el glosario. Esto es una demo local: en producción conectaría con el modelo corporativo del banco.';
}
