// Trato · datos simulados del core bancario. Todo ficticio y en memoria, nada real.
export const BRAND = { name:'Trato', tagline:'Mesa de distribución FX', version:'0.1.0' };

export const PAIRS = [
  'EUR/USD','EUR/GBP','EUR/CHF','EUR/JPY','EUR/CAD','EUR/AUD','EUR/NZD','EUR/SEK','EUR/NOK','EUR/DKK',
  'EUR/PLN','EUR/MXN','EUR/TRY','EUR/CZK','EUR/HUF','USD/JPY','GBP/USD'
];
export const G10 = PAIRS.slice(0,10);
export const FLAGS = { EUR:'🇪🇺',USD:'🇺🇸',GBP:'🇬🇧',CHF:'🇨🇭',JPY:'🇯🇵',CAD:'🇨🇦',AUD:'🇦🇺',NZD:'🇳🇿',SEK:'🇸🇪',NOK:'🇳🇴',DKK:'🇩🇰',PLN:'🇵🇱',MXN:'🇲🇽',TRY:'🇹🇷',CZK:'🇨🇿',HUF:'🇭🇺' };

// mid de partida, decimales de cotización, spread de trading (en pips) y puntos fwd anuales aprox.
export const RATES = {
  'EUR/USD':{mid:1.1264,dec:4,spread:1.2,fwdY:-0.0185},
  'EUR/GBP':{mid:0.8851,dec:4,spread:1.5,fwdY:0.0060},
  'EUR/CHF':{mid:1.1148,dec:4,spread:1.6,fwdY:0.0235},
  'EUR/JPY':{mid:167.42,dec:2,spread:2.5,fwdY:5.20},
  'EUR/CAD':{mid:1.5210,dec:4,spread:2.0,fwdY:-0.0090},
  'EUR/AUD':{mid:1.6890,dec:4,spread:2.2,fwdY:-0.0210},
  'EUR/NZD':{mid:1.8420,dec:4,spread:2.6,fwdY:-0.0260},
  'EUR/SEK':{mid:11.0350,dec:4,spread:6.0,fwdY:0.0120},
  'EUR/NOK':{mid:11.6120,dec:4,spread:7.0,fwdY:-0.0410},
  'EUR/DKK':{mid:7.4580,dec:4,spread:1.0,fwdY:0.0010},
  'EUR/PLN':{mid:4.2740,dec:4,spread:8.0,fwdY:-0.0980},
  'EUR/MXN':{mid:21.180,dec:3,spread:30,fwdY:-1.35},
  'EUR/TRY':{mid:44.95,dec:3,spread:90,fwdY:-9.80},
  'EUR/CZK':{mid:24.61,dec:3,spread:6,fwdY:-0.12},
  'EUR/HUF':{mid:395.4,dec:2,spread:40,fwdY:-9.5},
  'USD/JPY':{mid:148.63,dec:2,spread:1.4,fwdY:-5.40},
  'GBP/USD':{mid:1.2727,dec:4,spread:1.6,fwdY:-0.0170},
};

export const TENORS = [
  {k:'TOD',l:'Hoy',d:0},{k:'TOM',l:'Mañana',d:1},{k:'SPOT',l:'Spot',d:2},
  {k:'1W',l:'1 sem',w:1},{k:'2W',l:'2 sem',w:2},{k:'1M',l:'1 mes',m:1},{k:'2M',l:'2 meses',m:2},
  {k:'3M',l:'3 meses',m:3},{k:'6M',l:'6 meses',m:6},{k:'9M',l:'9 meses',m:9},{k:'1Y',l:'1 año',m:12}
];

export const HOLIDAYS = ['2026-10-12','2026-11-01','2026-12-06','2026-12-08','2026-12-25','2027-01-01','2027-01-06'];

// Clientes FICTICIOS (empresas, personas, NIF, LEI y cuentas inventados; entidad 0999 no existe).
// Las cuentas de línea de seguro de cambio empiezan por 89 (regla del core simulado).
export const CLIENTS = [
  { id:'30412877', nif:'B87654321', nombre:'Nortech Componentes SL', tutor:'Laura Bermúdez', mifid:'ok', titularMifid:'Sergio Alcaraz',
    lei:'9598TRATO0001A2B3C405', leiRenov:'2027-03-15', email:'tesoreria@nortech-demo.es', tel:'910 000 101',
    margenPorMil:0.5, nivel:'oro', margenPersonalizado:true, margenes:{'spot':0.4,'fwd':0.6},
    ordenantes:[{nif:'00000001R',nombre:'Sergio Alcaraz',apoderado:true,mifid:'ok'},{nif:'00000002W',nombre:'Nuria Esteban',apoderado:false,mifid:'ok'}],
    cuentas:[{n:'EUR 0999-2210-44/001101',div:'EUR',saldo:1250000},{n:'USD 0999-2210-44/001102',div:'USD',saldo:84000},{n:'GBP 0999-2210-44/001103',div:'GBP',saldo:12500}],
    lineas:[{n:'89 0999-2210/000301',div:'USD',limite:1500000,disp:1500000},{n:'89 0999-2210/000302',div:'EUR',limite:500000,disp:500000}] },
  { id:'30588120', nif:'A12345678', nombre:'Bodegas Peñalba SA', tutor:'Diego Arribas', mifid:'ok', titularMifid:'Marina Peñalba',
    lei:'9598TRATO0002D4E5F606', leiRenov:'2026-11-02', email:'finanzas@penalba-demo.com', tel:'947 000 202',
    margenPorMil:0.8, nivel:'plata', margenPersonalizado:false, margenes:null,
    ordenantes:[{nif:'00000003A',nombre:'Marina Peñalba',apoderado:true,mifid:'ok'}],
    cuentas:[{n:'EUR 0999-3350-17/002201',div:'EUR',saldo:380000},{n:'USD 0999-3350-17/002202',div:'USD',saldo:22000}],
    lineas:[{n:'89 0999-3350/000410',div:'USD',limite:400000,disp:400000}] },
  { id:'30671933', nif:'B11223344', nombre:'Frío Mediterráneo SL', tutor:'Laura Bermúdez', mifid:'warn', titularMifid:'Tomás Ferrer',
    lei:'—', leiRenov:'—', email:'admin@friomed-demo.es', tel:'965 000 303',
    margenPorMil:1.2, nivel:'bronce', margenPersonalizado:false, margenes:null,
    ordenantes:[{nif:'00000004G',nombre:'Tomás Ferrer',apoderado:true,mifid:'warn'}],
    cuentas:[{n:'EUR 0999-4470-29/003301',div:'EUR',saldo:96000}],
    lineas:[] },
  { id:'30702451', nif:'B99887766', nombre:'Textiles Arcadia SL', tutor:'Diego Arribas', mifid:'ko', titularMifid:'Clara Domínguez',
    lei:'9598TRATO0003G7H8I907', leiRenov:'2026-09-30', email:'compras@arcadia-demo.es', tel:'936 000 404',
    margenPorMil:0.7, nivel:'plata', margenPersonalizado:true, margenes:{'spot':0.7,'fwd':0.9},
    ordenantes:[{nif:'00000005M',nombre:'Clara Domínguez',apoderado:true,mifid:'ko'}],
    cuentas:[{n:'EUR 0999-5580-31/004401',div:'EUR',saldo:210000},{n:'JPY 0999-5580-31/004402',div:'JPY',saldo:9800000}],
    lineas:[{n:'89 0999-5580/000520',div:'JPY',limite:60000000,disp:60000000}] },
];
export const GENERIC = { id:'GEN', nif:'—', nombre:'Cliente genérico', generic:true, tutor:'—', mifid:null, cuentas:[], lineas:[], ordenantes:[], margenPorMil:0 };

// Operaciones históricas "dadas de alta en el core fuera de la plataforma" (back-to-front)
export const SEED_OPS = [
  { ref:'SC-165578', cliente:'30412877', tipoOrden:'FORWARD', tipoOp:'SEGURO DE CAMBIO', par:'EUR/USD', dir:'VENDER', divOp:'USD',
    nominal:50000, contra:44114.70, precioCliente:1.1334, precioOficina:1.1322, fechaOp:'2026-08-20', fechaValor:'2026-12-15',
    fechaArbitraje:'2026-12-14', estado:'Ejecutada', canal:'SALA', usuario:'lbermudez', cuenta:'89 0999-2210/000301', origen:'core' },
  { ref:'SC-165590', cliente:'30412877', tipoOrden:'FORWARD', tipoOp:'SEGURO DE CAMBIO FLEXIBLE', par:'EUR/GBP', dir:'COMPRAR', divOp:'GBP',
    nominal:30000, contra:33980.2, precioCliente:0.8829, precioOficina:0.8840, fechaOp:'2026-09-01', fechaValor:'2027-02-26',
    fechaArbitraje:'2027-02-25', fechaDispCliente:'2026-11-02', fechaDispEstandar:'2026-10-07', estado:'Ejecutada', canal:'TEL', usuario:'darribas', cuenta:'89 0999-2210/000302', origen:'core' },
  { ref:'CV-771020', cliente:'30412877', tipoOrden:'CONTADO', tipoOp:'CONVERSIÓN', par:'EUR/USD', dir:'COMPRAR', divOp:'USD',
    nominal:10000, contra:8880.1, precioCliente:1.1261, precioOficina:1.1266, fechaOp:'2026-09-15', fechaValor:'2026-09-17',
    estado:'Ejecutada', canal:'WEB', usuario:'cliente', cuenta:'EUR 0999-2210-44/001101', origen:'core' },
  { ref:'SC-165601', cliente:'30588120', tipoOrden:'FORWARD', tipoOp:'SEGURO DE CAMBIO', par:'EUR/USD', dir:'VENDER', divOp:'USD',
    nominal:120000, contra:105894.46, precioCliente:1.1332, precioOficina:1.1320, fechaOp:'2026-09-03', fechaValor:'2026-11-30',
    fechaArbitraje:'2026-11-27', estado:'Ejecutada', canal:'SALA', usuario:'lbermudez', cuenta:'89 0999-3350/000410', origen:'core' },
];

export const USERS = {
  SALA: { user:'lbermudez', nombre:'Laura Bermúdez', canal:'SALA', desc:'Sala · sales trading', perms:{markup:true, generico:true, ordenes:true, verMargen:true} },
  TEL: { user:'darribas', nombre:'Diego Arribas', canal:'TEL', desc:'Banca telefónica', perms:{markup:false, generico:false, ordenes:true, verMargen:true} },
  WEB: { user:'cliente', nombre:'Sergio Alcaraz', canal:'WEB', desc:'Web de empresas', perms:{markup:false, generico:false, ordenes:true, verMargen:false} },
};
