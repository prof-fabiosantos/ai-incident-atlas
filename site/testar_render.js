/* Renderiza o site num DOM simulado e confere o resultado, sem navegador.

   Precisa de dependências de desenvolvimento, instaladas só nesta pasta:
       npm install jsdom d3 topojson-client
   Depois:
       node testar_render.js

   O testar_site.js roda sem nada instalado e cobre as funções de dados.
   Este aqui vai além: executa o app.js inteiro, desenha o mapa e simula cliques.
*/
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const d3 = require('d3');
const topojson = require('topojson-client');

const SITE = __dirname;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const res = [];
const ok = (c, m) => { console.log((c ? '  OK     ' : '  FALHOU ') + m); res.push(!!c); };

// Topologia mínima com dois países: 76 (Brasil) e 724 (Espanha).
const MUNDO = {
  type: 'Topology', arcs: [[[0, 0], [100, 0], [0, 100], [-100, 0], [0, -100]]],
  transform: { scale: [0.01, 0.01], translate: [-50, -20] },
  objects: { countries: { type: 'GeometryCollection', geometries: [
    { type: 'Polygon', id: '76', arcs: [[0]] },
    { type: 'Polygon', id: '724', arcs: [[0]] },
  ] } },
};

function montar(dados, lingua) {
  const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8')
    .replace(/<script[^>]*><\/script>/g, '');            // os scripts entram pelo require
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://exemplo.test/' });  // precisa de origem para ter localStorage
  Object.defineProperty(dom.window.navigator, 'language', { value: lingua || 'pt-BR', configurable: true });
  try { dom.window.localStorage.clear(); } catch (e) { /* sem storage */ }
  const erros = [];
  global.window = dom.window;
  global.document = dom.window.document;
  const d3mock = { ...d3 };                              // o namespace do d3 v7 é congelado
  d3mock.json = (url) => Promise.resolve(url.includes('dados.json') ? dados : MUNDO);
  global.d3 = d3mock;
  global.topojson = topojson;
  dom.window.console = { error: (...a) => erros.push(a.join(' ')), log: () => {} };
  delete require.cache[require.resolve(path.join(SITE, 'app.js'))];
  require(path.join(SITE, 'app.js'));
  return { dom, doc: dom.window.document, erros };
}

const clique = (dom, elemento) => elemento.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

(async () => {
  const original = JSON.parse(fs.readFileSync(path.join(SITE, 'dados.json'), 'utf8'));
  const copia = () => JSON.parse(JSON.stringify(original));

  console.log('1. Página completa');
  let { doc, erros } = montar(original);
  await espera(400);
  ok(!erros.length, `nenhum erro no console (${erros.join(' | ') || 'nenhum'})`);
  ok(doc.querySelectorAll('.cartao .valor').length === 4, 'quatro cartões de totais');
  ok(doc.querySelectorAll('.incidente').length === original.incidentes.length,
     `um bloco por incidente (${doc.querySelectorAll('.incidente').length})`);
  ok(doc.querySelectorAll('#tempo rect.barra').length > 0, 'linha do tempo desenhada');
  ok(doc.getElementById('gerado').textContent !== 'carregando…', 'data da última atualização preenchida');

  console.log('2. Mapa com países');
  const comPais = copia();
  comPais.incidentes.forEach((i, n) => Object.assign(i, n % 2
    ? { pais: 'bra', numerico: '076', pais_nome: 'Brasil' }
    : { pais: 'esp', numerico: '724', pais_nome: 'Espanha' }));
  let montado = montar(comPais);
  await espera(400);
  doc = montado.doc;
  ok(doc.querySelectorAll('#mapa path.com-dado').length === 2, 'dois países pintados');
  ok(!doc.getElementById('mapa-caixa').hidden, 'mapa visível');

  console.log('3. Clique no país filtra e limpa');
  const antes = doc.querySelectorAll('.incidente').length;
  clique(montado.dom, doc.querySelector('#mapa path.com-dado'));
  await espera(150);
  const depois = doc.querySelectorAll('.incidente').length;
  ok(depois < antes, `a lista encolheu ao clicar no país (${antes} para ${depois})`);
  ok(!doc.getElementById('grupo-pais').hidden, 'apareceu o botão de limpar o país');
  clique(montado.dom, doc.getElementById('limpar-pais'));
  await espera(150);
  ok(doc.querySelectorAll('.incidente').length === antes, 'limpar o país traz a lista de volta');

  console.log('4. Sem país informado, o mapa some');
  const semPais = copia();
  semPais.incidentes.forEach((i) => Object.assign(i,
    { pais: 'nao_informado', numerico: null, pais_nome: 'País não informado' }));
  montado = montar(semPais);
  await espera(400);
  doc = montado.doc;
  ok(doc.getElementById('mapa-caixa').hidden, 'mapa escondido em vez de vazio');
  ok(doc.getElementById('nota-mapa').textContent.includes('Nenhuma das notícias'),
     'explicação no lugar do mapa');

  console.log('5. Idiomas');
  montado = montar(original, 'en-US');
  await espera(400);
  doc = montado.doc;
  ok(doc.documentElement.lang === 'en', 'navegador em inglês abre o site em inglês');
  ok(doc.querySelector('#cartoes .nome').textContent === 'Incidents',
     `cartões em inglês (${doc.querySelector('#cartoes .nome').textContent})`);
  ok(doc.querySelector('[data-i18n="mapa_titulo"]').textContent.includes('affected'), 'títulos em inglês');
  const botaoPt = [...doc.querySelectorAll('#idiomas .chip')].find((b) => b.textContent === 'PT');
  clique(montado.dom, botaoPt);
  await espera(200);
  ok(doc.documentElement.lang === 'pt-BR', 'clicar em PT troca o idioma da página');
  ok(doc.querySelector('#cartoes .nome').textContent === 'Incidentes', 'cartões voltam ao português');
  ok(doc.querySelector('#filtro-papel .chip').textContent.includes('Agente'), 'filtros traduzidos');
  let salvo = null;
  try { salvo = montado.dom.window.localStorage.getItem('idioma'); } catch (e) { salvo = null; }
  ok(salvo === 'pt', 'a escolha fica guardada no navegador');

  montado = montar(original, 'pt-BR');
  await espera(400);
  ok(montado.doc.documentElement.lang === 'pt-BR', 'navegador em português abre o site em português');

  console.log('6. Dados vazios não quebram a página');
  montado = montar({ gerado_em: original.gerado_em, totais: { noticias: 0 }, incidentes: [], repercussoes: [] });
  await espera(400);
  ok(!montado.erros.length, 'sem erro no console');
  ok(montado.doc.querySelector('.vazio') !== null, 'mensagem de lista vazia');

  console.log(`\n${res.filter(Boolean).length} de ${res.length} verificações passaram.`);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
