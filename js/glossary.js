// Trato · glosario único de negocio. Los CÓDIGOS internos (tipoOp, estados, canales) no cambian: cambian las ETIQUETAS.
// ES es el idioma de la UI; EN es un borrador "a validar por negocio" (no se usa todavía en pantalla).
export const LANG = 'es';

// Productos y tipos de operación (código interno → etiqueta)
export const PRODUCT = {
  'CLAVE DE ARBITRAJE':            { es:'Spot',                        en:'FX spot',               chip:'SPOT' },
  'CONVERSIÓN':                    { es:'Cambio entre cuentas',        en:'Account FX conversion', chip:'SPOT' },
  'SEGURO DE CAMBIO':              { es:'Seguro de cambio',            en:'FX forward',            chip:'FWD'  },
  'SEGURO DE CAMBIO FLEXIBLE':     { es:'Seguro de cambio flexible',   en:'Flexible FX forward',   chip:'FLEX' },
  'ANTICIPO':                      { es:'Anticipo',                    en:'Pre-delivery',          chip:'FWD'  },
  'CANCELACIÓN':                   { es:'Cancelación',                 en:'Unwind',                chip:'FWD'  },
  'CANCELACIÓN · PATA ANTICIPO':   { es:'Cancelación · pata anticipo', en:'Unwind · pre-delivery leg', chip:'FWD' },
  'ORDEN LIMITADA':                { es:'Orden limitada',              en:'Limit order',           chip:'ORD'  },
  'CALL ORDER':                    { es:'Alerta con llamada',          en:'Call order',            chip:'ALT'  },
  'AVISO':                         { es:'Alerta de precio',            en:'Price alert',           chip:'ALT'  },
};
export const ORDER_TYPE = { CONTADO:{es:'Contado',en:'Spot'}, FORWARD:{es:'Forward',en:'Forward'} };

// Canales y roles (código interno → cómo se muestra)
export const CHANNEL = {
  SALA: { es:'Mesa',              en:'Sales desk',        short:'MESA' },
  TEL:  { es:'Banca telefónica',  en:'Phone banking',     short:'TEL'  },
  WEB:  { es:'Empresas',          en:'Corporate portal',  short:'WEB'  },
};

// Conceptos de plataforma con nombre propio de Trato
export const TERM = {
  lineaRiesgo:      { es:'Línea de riesgo FX',          en:'FX credit line' },
  lineaRiesgoCorta: { es:'Línea FX',                    en:'FX line' },
  sesionOperativa:  { es:'Sesión operativa',            en:'Trading session' },       // antes "firma ágil"
  clientePorAsignar:{ es:'Cliente por asignar',         en:'Unassigned client' },     // antes "cliente genérico"
  gestor:           { es:'Gestor',                      en:'Relationship manager' },  // antes "tutor"
  ordenante:        { es:'Ordenante',                   en:'Authorised person' },
  idCliente:        { es:'ID cliente',                  en:'Client ID' },
  margen:           { es:'Margen',                      en:'Mark-up' },
  margenConfirmado: { es:'Margen confirmado',           en:'Mark-up confirmed' },     // antes "markup completado"
  cobertura:        { es:'Cobertura en libros',         en:'Hedge in-house' },        // antes "switch proveedor → libros"
  altaCore:         { es:'Alta de operación → core',    en:'Deal booking → core' },   // antes DO1
  cierreCore:       { es:'Evento de cierre → core',     en:'Lifecycle event → core' },// antes DO2
  actividad:        { es:'Actividad',                   en:'Activity' },
  posicionViva:     { es:'Posición viva',               en:'Live position' },
  ordenesVivas:     { es:'Órdenes y alertas vivas',     en:'Live orders & alerts' },
  estadoPlataforma: { es:'Estado de la plataforma',     en:'Platform status' },
  ultimas:          { es:'Últimas operaciones',         en:'Recent trades' },
};

export const label = (code, lang=LANG) => PRODUCT[code]?.[lang] ?? code;
export const chip  = code => PRODUCT[code]?.chip ?? '';
export const orderType = (code, lang=LANG) => ORDER_TYPE[code]?.[lang] ?? code;
export const channel = (code, lang=LANG) => CHANNEL[code]?.[lang] ?? code;
export const t = (key, lang=LANG) => TERM[key]?.[lang] ?? key;
