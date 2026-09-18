// Trato · blotters (operaciones del cliente, posición, operaciones del usuario), filtros, exportación y columnas
import { $, $$, h, esc, fmtN, cmenu, downloadCSV, toast, stateChip } from './ui.js';
import * as C from './core.js';
import { S } from './state.js';
import { es } from './prices.js';

const OL_TYPES = ['ORDEN LIMITADA','CALL ORDER','AVISO'];
const other = (pair, d) => pair.split('/').find(x=>x!==d);
function legs(o){
  const oth = other(o.par, o.divOp);
  return o.dir==='COMPRAR' ? {ic:o.nominal, dc:o.divOp, iv:o.contra, dv:oth} : {ic:o.contra, dc:oth, iv:o.nominal, dv:o.divOp};
}
const D = s => s ? es(s) : '—';
const N = (v,d=2) => v===undefined||v===null ? '—' : fmtN(v,d);

// definición de columnas por blotter (nombre, getter, alineación)
const COLS = {
  ejecutadas: [
    ['Fecha operación', o=>D(o.fechaOp)], ['Referencia', o=>o.ref||'—'], ['Tipo orden', o=>o.tipoOrden], ['Tipo operación', o=>o.tipoOp],
    ['Importe compra', o=>N(legs(o).ic),'num'], ['Divisa compra', o=>legs(o).dc], ['Importe venta', o=>N(legs(o).iv),'num'], ['Divisa venta', o=>legs(o).dv],
    ['Fecha valor', o=>D(o.fechaValor)], ['Precio cliente', o=>N(o.precioCliente, dec(o)),'num'], ['Precio oficina', o=>N(o.precioOficina, dec(o)),'num'],
    ['Importe liquidación', o=>N(o.contra),'num'], ['Cuenta operativa', o=>o.cuenta||'—'], ['Cuenta operativa 2', o=>o.cuenta2||'—'],
    ['Fecha arbitraje', o=>D(o.fechaArbitraje)], ['Fecha disponibilidad', o=>D(o.fechaDispCliente)], ['Importe disponible', o=>o.dispon!==undefined?N(o.dispon):'—','num'],
    ['Fecha ejecución', o=>D(o.fechaEjec)], ['Hora ejecución', o=>o.hora||'—'], ['Usuario operación', o=>o.usuario], ['Canal operación', o=>o.canal]
  ],
  ordenes: [
    ['Fecha operación', o=>D(o.fechaOp)], ['Fecha ejecución', o=>D(o.fechaEjec)], ['Hora ejecución', o=>o.hora||'—'], ['ID Global', o=>o.idGlobal],
    ['Tipo orden', o=>o.tipoOrden], ['Tipo operación', o=>o.tipoOp], ['Estado', o=>stateChip(o.estado, C.STATES),'st'], ['Par', o=>o.par],
    ['Importe compra', o=>N(legs(o).ic),'num'], ['Divisa compra', o=>legs(o).dc], ['Importe venta', o=>N(legs(o).iv),'num'], ['Divisa venta', o=>legs(o).dv],
    ['Fecha valor vto', o=>D(o.fechaValor)], ['Precio límite', o=>N(o.precioLimite, dec(o)),'num'], ['Fecha validez', o=>D(o.fechaValidez)], ['Usuario operación', o=>o.usuario], ['Canal operación', o=>o.canal]
  ],
  usuario: [
    ['Fecha operación', o=>D(o.fechaOp)], ['Fecha ejecución', o=>D(o.fechaEjec)], ['ID Global', o=>o.idGlobal], ['Referencia', o=>o.ref||'—'], ['Nombre cliente', o=>o.clienteNombre||o.cliente],
    ['Tipo orden', o=>o.tipoOrden], ['Tipo operación', o=>o.tipoOp], ['Tipo op. asociada', o=>o.asociada||'—'], ['Estado', o=>stateChip(o.estado, C.STATES),'st'], ['Par divisas', o=>o.par],
    ['Nominal compra', o=>N(legs(o).ic),'num'], ['Divisa compra', o=>legs(o).dc], ['Nominal venta', o=>N(legs(o).iv),'num'], ['Divisa venta', o=>legs(o).dv],
    ['Fecha valor', o=>D(o.fechaValor)], ['Precio cliente', o=>N(o.precioCliente, dec(o)),'num'], ['Precio oficina', o=>N(o.precioOficina, dec(o)),'num'],
    ['Markup', o=>o.markupOk?'COMPLETADO':'NO COMPLETADO'], ['Observaciones', o=>o.obs||'—'], ['Canal', o=>o.canal]
  ]
};
function dec(o){ try{ return o.par.includes('JPY')||o.par.includes('HUF') ? 2 : (o.par.includes('MXN')||o.par.includes('TRY')||o.par.includes('CZK')) ? 3 : 4; }catch{ return 4; } }

// ---------- selección de filas por pestaña ----------
function rows(kind){
  const c = S.client; const uid = S.user?.user;
  if(kind==='ejecutadas') return C.ops.filter(o => c && !c.generic && o.cliente===c.id && o.estado==='Ejecutada' && !OL_TYPES.includes(o.tipoOp));
  if(kind==='ol') return C.ops.filter(o => c && !c.generic && o.cliente===c.id && o.tipoOp==='ORDEN LIMITADA');
  if(kind==='co') return C.ops.filter(o => c && !c.generic && o.cliente===c.id && (o.tipoOp==='CALL ORDER'||o.tipoOp==='AVISO'));
  if(kind==='usuario') return C.ops.filter(o => o.usuario===uid || o.cliente==='GEN');
  return [];
}
function applyFilters(kind, list){
  const f = S.dock.filters; if(!S.dock.filtersOn) return list;
  return list.filter(o=>{
    if(f.fechaOpDesde && o.fechaOp < f.fechaOpDesde) return false; if(f.fechaOpHasta && o.fechaOp > f.fechaOpHasta) return false;
    if(f.fvDesde && o.fechaValor < f.fvDesde) return false; if(f.fvHasta && o.fechaValor > f.fvHasta) return false;
    if(f.tipoOrden && o.tipoOrden!==f.tipoOrden) return false;
    if(f.divisa && !(legs(o).dc===f.divisa||legs(o).dv===f.divisa)) return false;
    if(f.impMin && Math.max(legs(o).ic,legs(o).iv) < +f.impMin) return false; if(f.impMax && Math.min(legs(o).ic,legs(o).iv) > +f.impMax) return false;
    if(f.q){ const q=f.q.toLowerCase(); if(!JSON.stringify(o).toLowerCase().includes(q)) return false; }
    return true;
  });
}

// ---------- render ----------
export function renderDock(root, {perms, onAction}){
  const d = S.dock; const disabledCli = !S.client || S.client.generic;
  root.innerHTML = `
  <div class="tabs">
    <button data-tab="cliente" class="${d.tab==='cliente'?'on':''}" ${disabledCli?'disabled title="Sin cliente"':''}>Operaciones del cliente</button>
    <span class="sub ${d.tab==='cliente'?'':'hide'}">
      <button data-sub="ejecutadas" class="${d.sub==='ejecutadas'?'on':''}">Ejecutadas</button>
      <button data-sub="ol" class="${d.sub==='ol'?'on':''}">Órdenes limitadas</button>
      <button data-sub="co" class="${d.sub==='co'?'on':''}">Call orders / Avisos</button>
    </span>
    <button data-tab="posicion" class="${d.tab==='posicion'?'on':''}" ${disabledCli?'disabled title="Sin cliente"':''}>Posición en seguros de cambio</button>
    <button data-tab="usuario" class="${d.tab==='usuario'?'on':''}">Operaciones del usuario</button>
    <span class="grow"></span>
    <button class="icon-btn" data-act="filters" title="Filtros" style="${d.filtersOn?'color:var(--accent)':''}">⚲</button>
    <button class="icon-btn" data-act="refresh" title="Actualizar">↻</button>
    <button class="icon-btn" data-act="export" title="Exportar CSV">⤓</button>
    <button class="icon-btn" data-act="cols" title="Columnas">▦</button>
    <button class="icon-btn" data-act="toggle" title="Plegar / desplegar">▾</button>
  </div>
  <div class="filters ${d.filtersOn?'':'hide'}" style="display:flex;gap:8px;align-items:end;padding:8px 10px;border-bottom:1px solid var(--line);background:var(--bg-soft);flex-wrap:wrap"></div>
  <div class="body"></div>`;
  $$('[data-tab]', root).forEach(b=>b.onclick=()=>{ d.tab=b.dataset.tab; renderDock(root,{perms,onAction}); });
  $$('[data-sub]', root).forEach(b=>b.onclick=()=>{ d.sub=b.dataset.sub; renderDock(root,{perms,onAction}); });
  $('[data-act=filters]',root).onclick=()=>{ d.filtersOn=!d.filtersOn; renderDock(root,{perms,onAction}); };
  $('[data-act=refresh]',root).onclick=()=>{ renderDock(root,{perms,onAction}); toast('Blotter actualizado'); };
  $('[data-act=toggle]',root).onclick=()=>{ const cur=getComputedStyle(document.documentElement).getPropertyValue('--dock-h').trim(); document.documentElement.style.setProperty('--dock-h', cur==='42px'?'300px':'42px'); };
  $('[data-act=export]',root).onclick=()=>exportCurrent();
  $('[data-act=cols]',root).onclick=(e)=>colsMenu(e, root, {perms,onAction});

  const kind = d.tab==='cliente' ? d.sub : d.tab;
  renderFilters($('.filters',root), kind, ()=>renderDock(root,{perms,onAction}));
  const body = $('.body', root);
  if(d.tab==='posicion') return renderPosicion(body);
  const cols = (COLS[kind==='ol'||kind==='co'?'ordenes':kind]||[]).filter(c=>!d.hidden[kind+':'+c[0]]);
  let list = applyFilters(kind, rows(kind));
  if(!list.length){ body.innerHTML = `<div class="empty">${disabledCli && d.tab==='cliente' ? 'Seleccione un cliente para ver sus operaciones.' : 'Sin operaciones que mostrar.'}</div>`; return; }
  const tbl = h(`<table class="bl"><thead><tr><th class="rowact"></th>${cols.map(c=>`<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody></tbody></table>`);
  const tb = $('tbody', tbl);
  for(const o of list){
    const tr = h(`<tr class="${!o.markupOk && kind==='usuario' ? 'nomk':''}" title="Doble clic: detalle · clic derecho o ⋯: acciones"><td class="rowact"><button class="icon-btn xs" data-more title="Acciones">⋯</button><button class="icon-btn xs" data-info title="Detalle">ⓘ</button></td>${cols.map(c=>`<td class="${c[2]||''}">${c[2]==='st'?c[1](o):esc(c[1](o))}</td>`).join('')}</tr>`);
    tr.oncontextmenu = e => { e.preventDefault(); rowMenu(e, o, kind, perms, onAction); };
    tr.ondblclick = ()=>onAction('masInfo', o);
    $('[data-more]',tr).onclick = e => { e.stopPropagation(); rowMenu(e, o, kind, perms, onAction); };
    $('[data-info]',tr).onclick = e => { e.stopPropagation(); onAction('masInfo', o); };
    tb.appendChild(tr);
  }
  body.appendChild(tbl);

  function exportCurrent(){
    const hdr = cols.map(c=>c[0]); const data = list.map(o=>cols.map(c=>c[2]==='st'?o.estado:c[1](o)));
    downloadCSV(`trato_${kind}_${new Date().toISOString().slice(0,10)}.csv`, [hdr, ...data]); toast('Exportado a CSV','ok');
  }
}
function colsMenu(e, root, opts){
  const kind = S.dock.tab==='cliente' ? S.dock.sub : S.dock.tab; if(kind==='posicion') return;
  const cols = COLS[kind==='ol'||kind==='co'?'ordenes':kind];
  cmenu(e.clientX, e.clientY, cols.map(c=>({ label:(S.dock.hidden[kind+':'+c[0]]?'☐ ':'☑ ')+c[0], onClick(){ S.dock.hidden[kind+':'+c[0]] = !S.dock.hidden[kind+':'+c[0]]; renderDock(root, opts); } })));
}
function renderFilters(box, kind, rerender){
  const f = S.dock.filters;
  const fld = (label, inner) => `<div class="field" style="margin:0"><label>${label}</label>${inner}</div>`;
  if(kind==='ejecutadas'){
    box.innerHTML = fld('Fecha operación', `<span style="display:flex;gap:4px"><input type="date" data-f="fechaOpDesde" value="${f.fechaOpDesde||''}"><input type="date" data-f="fechaOpHasta" value="${f.fechaOpHasta||''}"></span>`)
      + fld('Fecha valor', `<span style="display:flex;gap:4px"><input type="date" data-f="fvDesde" value="${f.fvDesde||''}"><input type="date" data-f="fvHasta" value="${f.fvHasta||''}"></span>`)
      + fld('Tipo orden', `<select data-f="tipoOrden"><option value="">Todos</option><option ${f.tipoOrden==='CONTADO'?'selected':''}>CONTADO</option><option ${f.tipoOrden==='FORWARD'?'selected':''}>FORWARD</option></select>`)
      + fld('Divisa', `<select data-f="divisa"><option value="">Todas</option>${['EUR','USD','GBP','CHF','JPY','CAD','AUD','SEK','NOK','DKK','PLN','MXN','TRY'].map(d=>`<option ${f.divisa===d?'selected':''}>${d}</option>`).join('')}</select>`)
      + fld('Importe', `<span style="display:flex;gap:4px"><input type="number" placeholder="mín" data-f="impMin" value="${f.impMin||''}" style="width:90px"><input type="number" placeholder="máx" data-f="impMax" value="${f.impMax||''}" style="width:90px"></span>`)
      + `<button class="btn btn-ghost btn-sm" data-clear>Limpiar</button>`;
  } else {
    box.innerHTML = fld('Buscar en cualquier columna', `<input data-f="q" value="${esc(f.q||'')}" placeholder="texto, estado, par, ID…" style="width:280px">`) + `<button class="btn btn-ghost btn-sm" data-clear>Limpiar</button>`;
  }
  $$('[data-f]', box).forEach(i=>i.onchange = ()=>{
    const k=i.dataset.f, v=i.value;
    // reglas del original: importe exige divisa; fecha operación y fecha valor no se filtran a la vez
    if((k==='impMin'||k==='impMax') && v && !f.divisa){ toast('Filtre primero por divisa compra/venta antes que por importe.','err'); i.value=''; return; }
    if((k==='fechaOpDesde'||k==='fechaOpHasta') && v && (f.fvDesde||f.fvHasta)){ toast('No es posible filtrar a la vez por fecha de operación y fecha valor.','err'); i.value=''; return; }
    if((k==='fvDesde'||k==='fvHasta') && v && (f.fechaOpDesde||f.fechaOpHasta)){ toast('No es posible filtrar a la vez por fecha de operación y fecha valor.','err'); i.value=''; return; }
    f[k]=v; rerender();
  });
  $('[data-clear]', box).onclick=()=>{ S.dock.filters={}; rerender(); };
}
function rowMenu(e, o, kind, perms, onAction){
  const items = [];
  const today = new Date().toISOString().slice(0,10);
  const isSC = /SEGURO DE CAMBIO/.test(o.tipoOp);
  const vivo = o.fechaValor > today && (!o.fechaArbitraje || o.fechaArbitraje >= today);
  if(kind==='ejecutadas'){
    items.push({label:'Anticipar', disabled: !(isSC && vivo), onClick:()=>onAction('anticipar', o)});
    items.push({label:'Cancelar operación', disabled: !(isSC && vivo), onClick:()=>onAction('cancelar', o)});
  }
  if(kind==='ol'||kind==='co'){ items.push({label:'Cancelar orden', disabled: o.estado!=='Orden enviada a mercado' || (o.fechaValidez && o.fechaValidez < today), onClick:()=>onAction('cancelarOrden', o)}); }
  if(kind==='usuario'){
    if(!o.markupOk && o.estado==='Confirmada en mercado') items.push({label:'Completar markup', onClick:()=>onAction('completarMarkup', o)});
    if(o.cliente==='GEN' && o.estado==='Ejecutada') items.push({label:'Cancelar operación (reasignar a cliente real)', onClick:()=>onAction('cancelarGenerica', o)});
    if(OL_TYPES.includes(o.tipoOp) && o.estado==='Orden enviada a mercado') items.push({label:'Cancelar orden', onClick:()=>onAction('cancelarOrden', o)});
  }
  items.push('-'); items.push({label:'Más info', onClick:()=>onAction('masInfo', o)});
  cmenu(e.clientX, e.clientY, items);
}
function renderPosicion(body){
  const c = S.client; const list = C.ops.filter(o=>o.cliente===c.id && o.estado==='Ejecutada' && /SEGURO DE CAMBIO|ANTICIPO/.test(o.tipoOp));
  if(!list.length){ body.innerHTML='<div class="empty">Sin posición en seguros de cambio.</div>'; return; }
  const buckets = ['≤ 1M','1M – 3M','3M – 6M','6M – 12M','> 12M'];
  const bucketOf = d => { const days=(new Date(d)-new Date())/86400000; return days<=31?0:days<=92?1:days<=183?2:days<=366?3:4; };
  const pos = {};
  for(const o of list){ const div = o.par.split('/').find(x=>x!=='EUR')||o.divOp; const sign = (o.dir==='COMPRAR')===(o.divOp===div) ? +1 : -1; const amt = o.divOp===div ? o.nominal : o.contra; pos[div] ??= [0,0,0,0,0]; pos[div][bucketOf(o.fechaValor)] += sign*amt; }
  body.innerHTML = `<table class="bl"><thead><tr><th>Divisa</th>${buckets.map(b=>`<th style="text-align:right">${b}</th>`).join('')}<th style="text-align:right">Total</th></tr></thead><tbody>
    ${Object.entries(pos).map(([d,arr])=>`<tr><td><b>${d}</b></td>${arr.map(v=>`<td class="num" style="color:${v<0?'var(--down)':v>0?'var(--up)':'inherit'}">${v?fmtN(v,0):'—'}</td>`).join('')}<td class="num"><b>${fmtN(arr.reduce((a,b)=>a+b,0),0)}</b></td></tr>`).join('')}
  </tbody></table><div class="tiny muted" style="padding:8px 10px">Signo positivo = el cliente compra la divisa · negativo = la vende. Tramos por fecha valor.</div>`;
}
