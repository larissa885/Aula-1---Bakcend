const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const vm = require('node:vm');
const fs = require('node:fs');

const fakeDb = {
  isConfigured: true,
  async query(sql) {
    if (sql.includes('SELECT 1')) return { rows: [{ '?column?': 1 }], rowCount: 1 };
    if (sql.includes('SELECT * FROM produtos ORDER BY id')) return { rows: [{ id: 1, nome: 'Cafe', categoria: 'Alimentos', unidade_medida: 'Unidade', quantidade: 8, valor: '4.50' }], rowCount: 1 };
    if (sql.includes('SUM(quantidade * valor)')) return { rows: [{ categoria: 'Alimentos', valor_total: 36 }], rowCount: 1 };
    if (sql.includes('SELECT id, nome, quantidade, valor, categoria')) return { rows: [{ id: 1, nome: 'Cafe', quantidade: 8, valor: '4.50', categoria: 'Alimentos' }], rowCount: 1 };
    if (sql.includes('FROM produtos p') && sql.includes('INNER JOIN movimentacoes')) return { rows: [{ nome_do_produto: 'Cafe', unidade_medida: 'Unidade', total_de_entradas: 2, total_de_saidas: 1, saida_no_periodo: 1, valor_total_financeiro_das_entradas: 9, valor_financeiro_das_saidas: 4.5, quantidade_total_de_saidas: 1, valor_total_financeiro_das_saidas: 4.5 }], rowCount: 1 };
    if (sql.includes('FROM movimentacoes')) return { rows: [], rowCount: 0 };
    if (sql.includes('SELECT quantidade FROM produtos')) return { rows: [{ quantidade: 8 }], rowCount: 1 };
    if (sql.includes('INSERT INTO produtos')) return { rows: [{ id: 2 }], rowCount: 1 };
    if (sql.includes('INSERT INTO movimentacoes')) return { rows: [{ produtos_id: 1 }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  }
};
const dbPath = require.resolve('../db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
const app = require('../app');
let server;
let baseUrl;

before(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = 'http://127.0.0.1:' + server.address().port;
});
after(async () => new Promise(resolve => server.close(resolve)));

async function json(path, init) {
  const response = await fetch(baseUrl + path, init);
  return { response, body: await response.json() };
}

test('serves the dashboard and its public assets', async () => {
  for (const path of ['/', '/style.css', '/script.js']) {
    const response = await fetch(baseUrl + path);
    assert.equal(response.status, 200, path);
  }
  const page = await (await fetch(baseUrl + '/')).text();
  for (const tab of ['produtos-tab', 'cadastro-tab', 'movimentacoes-tab', 'relatorios-tab']) assert.ok(page.includes(tab));
});

test('health endpoint checks the database pool', async () => {
  const { response, body } = await json('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: 'ok', database: 'connected' });
});

test('GET routes return the data shapes consumed by the dashboard', async () => {
  for (const path of ['/produtos/listar', '/produtos/valor-total', '/produtos/saidas', '/produtos/saidas?hoje=true', '/produtos/limites', '/produtos/movimentacoes?data_inicial=2026-01-01&data_final=2026-12-31', '/produtos/maiores-saidas?data_inicial=2026-01-01&data_final=2026-12-31']) {
    const { response, body } = await json(path);
    assert.equal(response.status, 200, path);
    assert.ok(Array.isArray(body), path);
  }
});

test('product and stock mutations validate input and accept valid payloads', async () => {
  let result = await json('/produtos/cadastrar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
  assert.equal(result.response.status, 400);
  result = await json('/produtos/cadastrar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({nome:'Cafe', valor:4.5, quantidade:8, categoria:'Alimentos', unidade_medida:'Unidade'}) });
  assert.equal(result.response.status, 201);
  result = await json('/produtos/entrada', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id:1, quantidade:2}) });
  assert.equal(result.response.status, 200);
  result = await json('/produtos/saida', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id:1, quantidade:1}) });
  assert.equal(result.response.status, 200);
  result = await json('/produtos/saida', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id:1, quantidade:0}) });
  assert.equal(result.response.status, 400);
});

test('unknown product API paths return JSON 404 instead of the dashboard HTML', async () => {
  const { response, body } = await json('/produtos/no-such-route');
  assert.equal(response.status, 404);
  assert.equal(body.error, 'Rota de produtos nao encontrada');
});


test('all four menu tabs switch and remain visible', async () => {
  const ids = ['produtos-tab','cadastro-tab','movimentacoes-tab','relatorios-tab','produtos-table-body','categoria-totals','mov-data-inicio','mov-data-fim','movimentacoes-table-body','limites-lista','saidas-lista','saidas-data-inicio','saidas-data-fim','maiores-saidas-lista'];
  const nodes = Object.fromEntries(ids.map(id => [id, {id,style:{},innerHTML:'',value:'2026-10-15',appendChild(){},classList:{add(){},remove(){}}}]));
  const tabs=ids.slice(0,4).map(id=>nodes[id]);
  const buttons=Array.from({length:4},()=>({classList:{active:false,add(){this.active=true},remove(){this.active=false}}}));
  const document={addEventListener(){},querySelectorAll(selector){return selector==='.tab-content'?tabs:buttons},getElementById(id){return nodes[id]||null},createElement(){return {textContent:'',innerHTML:''}}};
  const context={document,console,fetch:async()=>({ok:true,json:async()=>[]}),alert(){},setTimeout};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('public/script.js','utf8'),context);
  for(let i=0;i<4;i++){
    context.switchTab(ids[i],buttons[i]);
    assert.equal(tabs[i].style.display,'block');
    assert.equal(buttons[i].classList.active,true);
    for(let j=0;j<4;j++) if(i!==j) assert.equal(tabs[j].style.display,'none');
  }
  await new Promise(resolve=>setTimeout(resolve,0));
});
