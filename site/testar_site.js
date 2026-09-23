/* Testa as funções de dados do site, sem navegador:  node site/testar_site.js  */
const fs = require('fs');
const a = require('./app.js');
const caminho = __dirname + '/dados.json';
if (!fs.existsSync(caminho)) {
  console.error('Não encontrei o dados.json nesta pasta.\n' +
    'Ele é gerado pelo exportador, na pasta do observatorio.py:\n' +
    '    python exportar.py ' + __dirname);
  process.exit(1);
}
const dados = JSON.parse(fs.readFileSync(caminho, 'utf8'));
const res = [];
const ok = (c, m) => { console.log((c ? '  OK     ' : '  FALHOU ') + m); res.push(!!c); };

const todos = { papeis: [], confirmacao: 'todas', empresa: 'todas', pais: null };
ok(a.aplicarFiltros(dados.incidentes, todos).length === dados.incidentes.length, 'sem filtro mostra tudo');
const oficiais = a.aplicarFiltros(dados.incidentes, { ...todos, confirmacao: 'oficial' });
ok(oficiais.every(i => i.confirmacao === 'oficial'), `filtro "só oficial" (${oficiais.length})`);
const umaEmpresa = dados.incidentes[0].empresa;
ok(a.aplicarFiltros(dados.incidentes, { ...todos, empresa: umaEmpresa }).every(i => i.empresa === umaEmpresa),
   `filtro por empresa (${umaEmpresa})`);
ok(a.aplicarFiltros(dados.incidentes, { ...todos, papeis: ['agente_em_teste'] })
    .every(i => i.papel === 'agente_em_teste'), 'filtro por papel');

const paises = a.contarPorPais(dados.incidentes);
ok(paises.every(p => p.numerico && p.total > 0), `contagem por país (${JSON.stringify(paises)})`);
ok(!paises.some(p => p.pais === 'nao_informado' || p.pais === 'global'), 'país não informado fica fora do mapa');
const comPais = paises[0];
if (comPais) {
  const filtrado = a.aplicarFiltros(dados.incidentes, { ...todos, pais: comPais.pais });
  ok(filtrado.length === comPais.total, `clicar no país filtra (${comPais.nome}: ${filtrado.length})`);
}

const semanas = a.porSemana(dados.incidentes);
ok(semanas.length > 0 && semanas.every(s => /^\d{4}-\d{2}-\d{2}$/.test(s.semana)), `série semanal (${semanas.length} semanas)`);
ok(semanas.reduce((s, x) => s + x.total, 0) === dados.incidentes.filter(i => i.primeira).length,
   'nenhum incidente se perde na série');
ok(new Date(semanas[0].semana + 'T00:00:00Z').getUTCDay() === 1, 'semanas começam na segunda-feira');

const casos = a.agruparPorCaso(dados.incidentes);
ok(casos.reduce((s, c) => s + c.incidentes.length, 0) === dados.incidentes.length, `agrupamento por caso (${casos.length} casos)`);
ok(a.nivel(3.0).nome === 'Várias organizações' && a.nivel(0).indice === 0, 'rótulos de gravidade');
ok(a.resumoTotais(dados, dados.incidentes)[0].valor === dados.incidentes.length, 'cartões de totais');
ok(a.chaveNumerica('076') === '76' && a.chaveNumerica(null) === null, 'código do país normalizado para o mapa');

console.log(`\n${res.filter(Boolean).length} de ${res.length} verificações passaram.`);
process.exit(res.every(Boolean) ? 0 : 1);

