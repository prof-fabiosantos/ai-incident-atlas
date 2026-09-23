/* Agent Incident Atlas — site estático.
   Incidentes de segurança com agentes de IA, a partir de notícias públicas.
   As funções de dados ficam separadas do desenho, para poderem ser testadas fora do navegador. */

const MAPA_TOPOJSON = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const URL_REPORTE = 'https://github.com/prof-fabiosantos/ai-incident-atlas/issues/new';

const ROT_PAPEL = {
  agente_em_teste: 'Agente escapou de teste',
  agente_em_producao: 'Agente em uso real',
  ia_como_ferramenta: 'IA usada por atacantes',
  ataque_a_ia: 'Ataque contra IA',
};
const ROT_CONF = {
  oficial: 'Confirmação oficial',
  imprensa: 'Relato de imprensa',
  nao_confirmado: 'Não confirmado',
};
const ROT_EMPRESA = {
  openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', meta: 'Meta',
  microsoft: 'Microsoft', xai: 'xAI', varias: 'Várias', outra: 'Outra',
  nao_informado: 'Não informado',
};
const ROT_DEFASAGEM = {
  mesma_semana: 'na semana da notícia', mesmo_mes: 'semanas antes da notícia',
  meses_antes: 'meses antes da notícia', nao_informado: 'em data não informada',
};
const NIVEIS = ['Sem impacto externo', 'Acesso indevido', 'Organização comprometida',
  'Várias organizações', 'Infraestrutura crítica'];

/* ---------------------------------------------------------------- dados */
function nivel(gravidade) {
  const i = Math.max(0, Math.min(4, Math.round(gravidade)));
  return { indice: i, nome: NIVEIS[i] };
}

function aplicarFiltros(incidentes, f) {
  const conf = { todas: null, oficial: ['oficial'], oficial_imprensa: ['oficial', 'imprensa'] }[f.confirmacao];
  return incidentes.filter((i) => {
    if (f.papeis && f.papeis.length && !f.papeis.includes(i.papel)) return false;
    if (conf && !conf.includes(i.confirmacao)) return false;
    if (f.empresa && f.empresa !== 'todas' && i.empresa !== f.empresa) return false;
    if (f.pais && i.pais !== f.pais) return false;
    return true;
  });
}

/* O world-atlas pode trazer "76" onde o ISO usa "076": comparar sempre sem zeros à esquerda. */
function chaveNumerica(codigo) {
  return codigo === null || codigo === undefined ? null : String(parseInt(codigo, 10));
}

function contarPorPais(incidentes) {
  const mapa = new Map();
  incidentes.forEach((i) => {
    if (!i.numerico) return;              // sem país informado ou vítimas em vários países
    const atual = mapa.get(i.numerico) || { numerico: i.numerico, pais: i.pais, nome: i.pais_nome, total: 0 };
    atual.total += 1;
    mapa.set(i.numerico, atual);
  });
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

function inicioDaSemana(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const dia = (d.getUTCDay() + 6) % 7;     // segunda-feira = 0
  d.setUTCDate(d.getUTCDate() - dia);
  return d.toISOString().slice(0, 10);
}

function porSemana(incidentes) {
  const mapa = new Map();
  incidentes.forEach((i) => {
    if (!i.primeira) return;
    const semana = inicioDaSemana(i.primeira);
    mapa.set(semana, (mapa.get(semana) || 0) + 1);
  });
  const chaves = [...mapa.keys()].sort();
  if (!chaves.length) return [];
  const saida = [];
  const atual = new Date(chaves[0] + 'T00:00:00Z');
  const fim = new Date(chaves[chaves.length - 1] + 'T00:00:00Z');
  while (atual <= fim) {                   // semanas sem incidente entram como zero
    const chave = atual.toISOString().slice(0, 10);
    saida.push({ semana: chave, total: mapa.get(chave) || 0 });
    atual.setUTCDate(atual.getUTCDate() + 7);
  }
  return saida;
}

function agruparPorCaso(incidentes) {
  const casos = new Map();
  incidentes.forEach((i) => {
    if (!casos.has(i.caso)) casos.set(i.caso, []);
    casos.get(i.caso).push(i);
  });
  return [...casos.entries()].map(([caso, lista]) => ({ caso, incidentes: lista }));
}

function resumoTotais(dados, visiveis) {
  return [
    { nome: 'Incidentes', valor: visiveis.length },
    { nome: 'Casos', valor: new Set(visiveis.map((i) => i.caso)).size },
    { nome: 'Com confirmação oficial', valor: visiveis.filter((i) => i.confirmacao === 'oficial').length },
    { nome: 'Notícias analisadas', valor: dados.totais.noticias },
  ];
}

/* ---------------------------------------------------------------- desenho */
function iniciar() {
  const estado = { dados: null, mundo: null, filtros: { papeis: [], confirmacao: 'todas', empresa: 'todas', pais: null } };
  const dica = document.getElementById('dica');
  document.getElementById('reportar').href = URL_REPORTE;

  Promise.all([d3.json('dados.json'), d3.json(MAPA_TOPOJSON)])
    .then(([dados, mundo]) => {
      estado.dados = dados;
      estado.mundo = topojson.feature(mundo, mundo.objects.countries);
      document.getElementById('gerado').textContent =
        new Date(dados.gerado_em).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
      montarFiltros(estado, desenhar);
      desenhar();
    })
    .catch((e) => {
      document.getElementById('lista').innerHTML =
        '<p class="vazio">Não foi possível carregar os dados. Tente recarregar a página.</p>';
      console.error(e);
    });

  function desenhar() {
    const visiveis = aplicarFiltros(estado.dados.incidentes, estado.filtros);
    desenharCartoes(estado.dados, visiveis);
    desenharMapa(estado, visiveis, dica, desenhar);
    desenharTempo(porSemana(visiveis));
    desenharLista(estado.dados, visiveis);
    const grupo = document.getElementById('grupo-pais');
    const botao = document.getElementById('limpar-pais');
    grupo.hidden = !estado.filtros.pais;
    if (estado.filtros.pais) {
      const inc = estado.dados.incidentes.find((i) => i.pais === estado.filtros.pais);
      botao.textContent = (inc ? inc.pais_nome : estado.filtros.pais) + ' ✕';
      botao.onclick = () => { estado.filtros.pais = null; desenhar(); };
    }
  }
}

function montarFiltros(estado, aoMudar) {
  const caixaPapel = document.getElementById('filtro-papel');
  Object.entries(ROT_PAPEL).forEach(([chave, rotulo]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip ativo';
    b.textContent = rotulo;
    b.onclick = () => {
      const f = estado.filtros;
      const ativos = f.papeis.length ? f.papeis : Object.keys(ROT_PAPEL);
      f.papeis = ativos.includes(chave) ? ativos.filter((p) => p !== chave) : [...ativos, chave];
      if (f.papeis.length === Object.keys(ROT_PAPEL).length) f.papeis = [];
      b.classList.toggle('ativo', !f.papeis.length || f.papeis.includes(chave));
      [...caixaPapel.children].forEach((filho, i) => {
        const c = Object.keys(ROT_PAPEL)[i];
        filho.classList.toggle('ativo', !f.papeis.length || f.papeis.includes(c));
      });
      aoMudar();
    };
    caixaPapel.appendChild(b);
  });

  const empresas = [...new Set(estado.dados.incidentes.map((i) => i.empresa))].sort();
  const sel = document.getElementById('filtro-empresa');
  sel.innerHTML = '<option value="todas">Todas</option>' +
    empresas.map((e) => `<option value="${e}">${ROT_EMPRESA[e] || e}</option>`).join('');
  sel.onchange = () => { estado.filtros.empresa = sel.value; aoMudar(); };

  const conf = document.getElementById('filtro-confirmacao');
  conf.onchange = () => { estado.filtros.confirmacao = conf.value; aoMudar(); };
}

function desenharCartoes(dados, visiveis) {
  document.getElementById('cartoes').innerHTML = resumoTotais(dados, visiveis)
    .map((c) => `<div class="cartao"><div class="valor">${c.valor}</div><div class="nome">${c.nome}</div></div>`)
    .join('');
}

function desenharMapa(estado, visiveis, dica, aoMudar) {
  const svg = d3.select('#mapa');
  svg.selectAll('*').remove();
  const largura = 960;
  const altura = 460;
  const contagem = contarPorPais(visiveis);
  const porCodigo = new Map(contagem.map((c) => [chaveNumerica(c.numerico), c]));
  const maximo = d3.max(contagem, (c) => c.total) || 1;
  const cor = d3.scaleSqrt().domain([0, maximo]).range(['#3a2f38', '#ff6b5a']).clamp(true);

  const projecao = d3.geoNaturalEarth1().fitExtent([[10, 10], [largura - 10, altura - 10]], { type: 'Sphere' });
  const caminho = d3.geoPath(projecao);

  svg.append('path').attr('class', 'esfera').attr('d', caminho({ type: 'Sphere' }));
  svg.append('path').attr('class', 'retico').attr('d', caminho(d3.geoGraticule10()));

  svg.append('g').selectAll('path')
    .data(estado.mundo.features)
    .join('path')
    .attr('d', caminho)
    .attr('class', (d) => {
      const c = porCodigo.get(chaveNumerica(d.id));
      let classe = 'pais';
      if (c) classe += ' com-dado';
      if (c && estado.filtros.pais === c.pais) classe += ' selecionado';
      return classe;
    })
    .style('fill', (d) => {
      const c = porCodigo.get(chaveNumerica(d.id));
      return c ? cor(c.total) : null;
    })
    .on('mousemove', (evento, d) => {
      const c = porCodigo.get(chaveNumerica(d.id));
      if (!c) { dica.hidden = true; return; }
      dica.hidden = false;
      dica.innerHTML = `<b>${c.nome}</b>${c.total} incidente${c.total > 1 ? 's' : ''}`;
      dica.style.left = Math.min(evento.clientX + 14, window.innerWidth - 160) + 'px';
      dica.style.top = (evento.clientY + 14) + 'px';
    })
    .on('mouseleave', () => { dica.hidden = true; })
    .on('click', (evento, d) => {
      const c = porCodigo.get(chaveNumerica(d.id));
      if (!c) return;
      estado.filtros.pais = estado.filtros.pais === c.pais ? null : c.pais;
      dica.hidden = true;
      aoMudar();
    });

  const paradas = d3.range(0, 1.01, 0.1).map((t) => cor(t * maximo)).join(',');
  document.getElementById('legenda').innerHTML =
    `<span>1</span><span class="barra" style="background:linear-gradient(90deg,${paradas})"></span>` +
    `<span>${maximo}</span><span>incidentes por país</span>`;

  const fora = visiveis.length - contagem.reduce((s, c) => s + c.total, 0);
  document.getElementById('nota-mapa').textContent =
    `${fora} incidente(s) sem país informado ou com vítimas em vários países não aparecem no mapa. ` +
    'Nenhum incidente é colocado num país que a notícia não citou.';
}

function desenharTempo(semanas) {
  const svg = d3.select('#tempo');
  svg.selectAll('*').remove();
  if (!semanas.length) return;
  const largura = 960;
  const altura = 200;
  const margem = { topo: 10, direita: 10, baixo: 28, esquerda: 32 };
  const x = d3.scaleBand().domain(semanas.map((s) => s.semana))
    .range([margem.esquerda, largura - margem.direita]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(semanas, (s) => s.total) || 1]).nice()
    .range([altura - margem.baixo, margem.topo]);

  svg.append('g').selectAll('rect').data(semanas).join('rect')
    .attr('class', 'barra')
    .attr('x', (s) => x(s.semana))
    .attr('y', (s) => y(s.total))
    .attr('width', x.bandwidth())
    .attr('height', (s) => y(0) - y(s.total))
    .attr('rx', 3)
    .append('title')
    .text((s) => `${s.total} incidente(s) na semana de ${s.semana.split('-').reverse().join('/')}`);

  const passo = Math.ceil(semanas.length / 10);
  svg.append('g').attr('class', 'eixo').attr('transform', `translate(0,${altura - margem.baixo})`)
    .call(d3.axisBottom(x).tickValues(semanas.filter((_, i) => i % passo === 0).map((s) => s.semana))
      .tickFormat((s) => s.slice(8) + '/' + s.slice(5, 7)));
  svg.append('g').attr('class', 'eixo').attr('transform', `translate(${margem.esquerda},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')));
}

function desenharLista(dados, visiveis) {
  const alvo = document.getElementById('lista');
  if (!visiveis.length) {
    alvo.innerHTML = '<p class="vazio">Nenhum incidente com esses filtros.</p>';
    return;
  }
  const escapar = (t) => String(t).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fonteHtml = (f) =>
    `<li><a href="${escapar(f.url)}" target="_blank" rel="noopener">${escapar(f.titulo)}</a>` +
    `<span class="veiculo"> — ${escapar(f.fonte)}, ${escapar(f.data)}</span></li>`;

  alvo.innerHTML = agruparPorCaso(visiveis).map(({ caso, incidentes }) => {
    const reps = dados.repercussoes.filter((r) => r.caso === caso);
    const cabecalho = (incidentes.length > 1 || reps.length)
      ? `<p class="caso-titulo">Caso ${caso} · ${incidentes.length} incidente(s) · ${reps.length} repercussão(ões)</p>`
      : '';
    const corpo = incidentes.map((i) => {
      const n = nivel(i.gravidade);
      const local = i.pais === 'global' ? 'vários países'
        : (i.pais === 'nao_informado' ? 'país não informado' : i.pais_nome);
      return `<details class="incidente">
        <summary><span class="selo g${n.indice}">${n.nome}</span>
        <span class="titulo-incidente">${escapar(i.titulo)}</span></summary>
        <div class="corpo">
          <p class="meta"><b>${ROT_PAPEL[i.papel] || i.papel}</b> · ${ROT_EMPRESA[i.empresa] || i.empresa}
            · ${escapar(local)} · ${ROT_CONF[i.confirmacao] || i.confirmacao}
            ${i.divergencia ? ' · as fontes divergem sobre a gravidade' : ''}</p>
          <p class="meta">Gravidade ${i.gravidade.toFixed(1)} de 4 · ocorrido
            ${ROT_DEFASAGEM[i.defasagem] || ''} · ${i.fontes.length} fonte(s)</p>
          <ul class="fontes">${i.fontes.map(fonteHtml).join('')}</ul>
        </div></details>`;
    }).join('');
    const repercussoes = reps.length
      ? `<details class="repercussoes"><summary>Repercussões do caso ${caso} — leis, processos, relatórios (${reps.length})</summary>
         <ul class="fontes">${reps.map(fonteHtml).join('')}</ul></details>`
      : '';
    return `<div class="caso">${cabecalho}${corpo}${repercussoes}</div>`;
  }).join('');
}

if (typeof document !== 'undefined') iniciar();
if (typeof module !== 'undefined') {
  module.exports = { aplicarFiltros, contarPorPais, porSemana, agruparPorCaso, resumoTotais, nivel,
    inicioDaSemana, chaveNumerica };
}
