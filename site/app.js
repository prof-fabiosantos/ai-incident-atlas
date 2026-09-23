/* AI Incident Atlas — site estático.
   Incidentes de segurança com agentes de IA, a partir de notícias públicas.
   As funções de dados ficam separadas do desenho, para poderem ser testadas fora do navegador. */

const MAPA_TOPOJSON = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const URL_REPORTE = 'https://github.com/prof-fabiosantos/ai-incident-atlas/issues/new';

const TEXTOS = {
  pt: {
    lang: 'pt-BR',
    titulo_pagina: 'AI Incident Atlas — incidentes com agentes de IA',
    subtitulo: 'Incidentes de segurança com agentes e modelos de IA, a partir de notícias públicas. '
      + 'Cada incidente reúne as matérias que falam do mesmo caso, com a gravidade relatada e o grau de confirmação.',
    atualizacao: 'Última atualização:',
    cartao_incidentes: 'Incidentes', cartao_casos: 'Casos',
    cartao_oficial: 'Com confirmação oficial', cartao_noticias: 'Notícias analisadas',
    mapa_titulo: 'Onde ficam as organizações atingidas',
    mapa_ajuda: 'Clique em um país para filtrar a lista. Clique de novo para limpar.',
    mapa_aria: 'Mapa de incidentes com agentes de IA por país',
    legenda: 'incidentes por país',
    tempo_titulo: 'Ao longo do tempo',
    tempo_ajuda: 'Semana da primeira notícia sobre cada incidente.',
    tempo_aria: 'Incidentes por semana',
    incidentes_titulo: 'Incidentes',
    f_papel: 'Papel da IA', f_confirmacao: 'Confirmação', f_empresa: 'Empresa de IA', f_pais: 'País',
    conf_todas: 'Todas', conf_oficial_imprensa: 'Oficial ou imprensa', conf_oficial: 'Só oficial',
    empresa_todas: 'Todas',
    rodape_titulo: 'Como estes dados são produzidos',
    rodape_metodo: 'Um programa coleta notícias de veículos de tecnologia e segurança e de buscas no Google '
      + 'Notícias. Cada notícia passa por um modelo de decisão, o Jev, da TypeSafe AI, que responde se ela relata '
      + 'um incidente concreto, qual foi o papel da IA, a gravidade do impacto relatado, o grau de confirmação, a '
      + 'empresa envolvida e o país da organização atingida. Depois, o mesmo modelo compara notícias duas a duas '
      + 'para reunir, num mesmo incidente, as matérias que falam do mesmo ataque, e num mesmo caso os '
      + 'desdobramentos, como projetos de lei, processos e relatórios.',
    rodape_limites_titulo: 'Limites que valem ser ditos.',
    rodape_limites: ' A classificação é automática e pode errar. A gravidade reflete o que a notícia relatou, '
      + 'não uma apuração própria. Nenhum incidente é colocado num país que a notícia não citou: quando o país não '
      + 'aparece, o incidente fica fora do mapa. O site guarda apenas título, link, veículo e data de cada '
      + 'matéria, e o texto completo continua no veículo de origem.',
    rodape_reportar: 'Encontrou um erro de classificação ou um incidente que falta?',
    rodape_link: 'Reporte aqui',
    rodape_creditos: 'Mapa desenhado com D3 e world-atlas.',
    vazio: 'Nenhum incidente com esses filtros.',
    erro: 'Não foi possível carregar os dados. Tente recarregar a página.',
    local_varios: 'vários países', local_nao_informado: 'país não informado',
    divergencia: ' · as fontes divergem sobre a gravidade',
    papeis: { agente_em_teste: 'Agente escapou de teste', agente_em_producao: 'Agente em uso real',
      ia_como_ferramenta: 'IA usada por atacantes', ataque_a_ia: 'Ataque contra IA' },
    confirmacoes: { oficial: 'Confirmação oficial', imprensa: 'Relato de imprensa',
      nao_confirmado: 'Não confirmado' },
    empresas: { openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', meta: 'Meta',
      microsoft: 'Microsoft', xai: 'xAI', varias: 'Várias', outra: 'Outra', nao_informado: 'Não informado' },
    defasagens: { mesma_semana: 'na semana da notícia', mesmo_mes: 'semanas antes da notícia',
      meses_antes: 'meses antes da notícia', nao_informado: 'em data não informada' },
    niveis: ['Sem impacto externo', 'Acesso indevido', 'Organização comprometida',
      'Várias organizações', 'Infraestrutura crítica'],
    nota_mapa: (fora) => `${fora} incidente(s) sem país informado ou com vítimas em vários países não aparecem `
      + 'no mapa. Nenhum incidente é colocado num país que a notícia não citou.',
    nota_sem_mapa: (n) => `Nenhuma das notícias destes ${n} incidente(s) informou o país da organização `
      + 'atingida, então não há o que desenhar no mapa.',
    dica_pais: (nome, total) => `<b>${nome}</b>${total} incidente${total > 1 ? 's' : ''}`,
    caso_linha: (caso, inc, reps) => `Caso ${caso} · ${inc} incidente(s) · ${reps} repercussão(ões)`,
    repercussoes: (caso, n) => `Repercussões do caso ${caso} — leis, processos, relatórios (${n})`,
    meta_gravidade: (g, quando, fontes) => `Gravidade ${g} de 4 · ocorrido ${quando} · ${fontes} fonte(s)`,
    dica_semana: (total, data) => `${total} incidente(s) na semana de ${data}`,
    titulo_pais: (nome, n) => `Incidentes em ${nome} (${n})`,
  },
  en: {
    lang: 'en',
    titulo_pagina: 'AI Incident Atlas — incidents involving AI agents',
    subtitulo: 'Security incidents involving AI agents and models, built from public news reports. Each '
      + 'incident gathers the stories covering the same event, with the reported severity and how well '
      + 'confirmed it is.',
    atualizacao: 'Last updated:',
    cartao_incidentes: 'Incidents', cartao_casos: 'Cases',
    cartao_oficial: 'Officially confirmed', cartao_noticias: 'Articles analysed',
    mapa_titulo: 'Where the affected organisations are',
    mapa_ajuda: 'Click a country to filter the list. Click again to clear.',
    mapa_aria: 'Map of AI agent incidents by country',
    legenda: 'incidents per country',
    tempo_titulo: 'Over time',
    tempo_ajuda: 'Week of the first article about each incident.',
    tempo_aria: 'Incidents per week',
    incidentes_titulo: 'Incidents',
    f_papel: 'Role of the AI', f_confirmacao: 'Confirmation', f_empresa: 'AI company', f_pais: 'Country',
    conf_todas: 'All', conf_oficial_imprensa: 'Official or press', conf_oficial: 'Official only',
    empresa_todas: 'All',
    rodape_titulo: 'How this data is produced',
    rodape_metodo: 'A program collects articles from technology and security outlets and from Google News '
      + 'searches. Each article goes through a decision model, Jev by TypeSafe AI, which answers whether it '
      + 'reports a concrete incident, what role the AI played, the severity of the reported impact, how well '
      + 'confirmed it is, which company was involved and the country of the affected organisation. The same '
      + 'model then compares articles pairwise to group, under one incident, the stories about the same attack, '
      + 'and under one case the follow-ups, such as bills, lawsuits and reports.',
    rodape_limites_titulo: 'Limits worth stating.',
    rodape_limites: ' The classification is automatic and can be wrong. Severity reflects what the article '
      + 'reported, not our own investigation. No incident is placed in a country the article did not name: when '
      + 'the country is missing, the incident stays off the map. The site stores only the title, link, outlet '
      + 'and date of each article; the full text stays with the original publisher.',
    rodape_reportar: 'Found a misclassification or a missing incident?',
    rodape_link: 'Report it here',
    rodape_creditos: 'Map drawn with D3 and world-atlas.',
    vazio: 'No incidents match these filters.',
    erro: 'Could not load the data. Try reloading the page.',
    local_varios: 'several countries', local_nao_informado: 'country not reported',
    divergencia: ' · sources disagree on severity',
    papeis: { agente_em_teste: 'Agent escaped a test', agente_em_producao: 'Agent in real use',
      ia_como_ferramenta: 'AI used by attackers', ataque_a_ia: 'Attack against an AI' },
    confirmacoes: { oficial: 'Officially confirmed', imprensa: 'Press report',
      nao_confirmado: 'Unconfirmed' },
    empresas: { openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', meta: 'Meta',
      microsoft: 'Microsoft', xai: 'xAI', varias: 'Several', outra: 'Other', nao_informado: 'Not reported' },
    defasagens: { mesma_semana: 'in the week of the article', mesmo_mes: 'weeks before the article',
      meses_antes: 'months before the article', nao_informado: 'on an unreported date' },
    niveis: ['No external impact', 'Unauthorised access', 'One organisation compromised',
      'Several organisations', 'Critical infrastructure'],
    nota_mapa: (fora) => `${fora} incident(s) with no country reported, or with victims in several countries, `
      + 'are not on the map. No incident is placed in a country the article did not name.',
    nota_sem_mapa: (n) => `None of the articles behind these ${n} incident(s) reported the country of the `
      + 'affected organisation, so there is nothing to draw on the map.',
    dica_pais: (nome, total) => `<b>${nome}</b>${total} incident${total > 1 ? 's' : ''}`,
    caso_linha: (caso, inc, reps) => `Case ${caso} · ${inc} incident(s) · ${reps} follow-up(s)`,
    repercussoes: (caso, n) => `Follow-ups on case ${caso} — bills, lawsuits, reports (${n})`,
    meta_gravidade: (g, quando, fontes) => `Severity ${g} of 4 · happened ${quando} · ${fontes} source(s)`,
    dica_semana: (total, data) => `${total} incident(s) in the week of ${data}`,
    titulo_pais: (nome, n) => `Incidents in ${nome} (${n})`,
  },
};

function detectarIdioma(armazenado, navegador) {
  if (armazenado === 'pt' || armazenado === 'en') return armazenado;
  return String(navegador || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

let idioma = 'pt';
const t = (chave) => TEXTOS[idioma][chave];

/* ---------------------------------------------------------------- dados */
function nivel(gravidade) {
  const i = Math.max(0, Math.min(4, Math.round(gravidade)));
  return { indice: i, nome: t('niveis')[i] };
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
    { chave: 'cartao_incidentes', valor: visiveis.length },
    { chave: 'cartao_casos', valor: new Set(visiveis.map((i) => i.caso)).size },
    { chave: 'cartao_oficial', valor: visiveis.filter((i) => i.confirmacao === 'oficial').length },
    { chave: 'cartao_noticias', valor: dados.totais.noticias },
  ];
}

/* ---------------------------------------------------------------- desenho */
function iniciar() {
  const estado = { dados: null, mundo: null, filtros: { papeis: [], confirmacao: 'todas', empresa: 'todas', pais: null } };
  const dica = document.getElementById('dica');
  let guardado = null;
  try { guardado = window.localStorage.getItem('idioma'); } catch (e) { guardado = null; }
  idioma = detectarIdioma(guardado, window.navigator && window.navigator.language);

  Promise.all([d3.json('dados.json'), d3.json(MAPA_TOPOJSON)])
    .then(([dados, mundo]) => {
      estado.dados = dados;
      estado.mundo = topojson.feature(mundo, mundo.objects.countries);
      montarIdiomas(estado, desenhar);
      desenhar();
    })
    .catch((e) => {
      document.getElementById('lista').innerHTML = `<p class="vazio">${t('erro')}</p>`;
      console.error(e);
    });

  function desenhar() {
    aplicarTextos(estado);
    const visiveis = aplicarFiltros(estado.dados.incidentes, estado.filtros);
    montarFiltros(estado, desenhar);
    desenharCartoes(estado.dados, visiveis);
    desenharMapa(estado, visiveis, dica, desenhar);
    desenharTempo(porSemana(visiveis));
    desenharLista(estado, visiveis);
  }
}

function montarIdiomas(estado, aoMudar) {
  const caixa = document.getElementById('idiomas');
  caixa.innerHTML = '';
  [['pt', 'PT'], ['en', 'EN']].forEach(([chave, rotulo]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (idioma === chave ? ' ativo' : '');
    b.textContent = rotulo;
    b.setAttribute('lang', chave);
    b.onclick = () => {
      idioma = chave;
      try { window.localStorage.setItem('idioma', chave); } catch (e) { /* navegação privada */ }
      montarIdiomas(estado, aoMudar);
      aoMudar();
    };
    caixa.appendChild(b);
  });
}

function aplicarTextos(estado) {
  document.documentElement.lang = t('lang');
  document.title = t('titulo_pagina');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  const reportar = document.getElementById('reportar');
  reportar.href = URL_REPORTE;
  reportar.textContent = t('rodape_link');
  document.getElementById('gerado').textContent =
    new Date(estado.dados.gerado_em).toLocaleString(t('lang'), { dateStyle: 'long', timeStyle: 'short' });
}

function montarFiltros(estado, aoMudar) {
  const chaves = Object.keys(t('papeis'));
  const caixa = document.getElementById('filtro-papel');
  caixa.innerHTML = '';
  chaves.forEach((chave) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t('papeis')[chave];
    const ativo = !estado.filtros.papeis.length || estado.filtros.papeis.includes(chave);
    b.className = 'chip' + (ativo ? ' ativo' : '');
    b.onclick = () => {
      const f = estado.filtros;
      const ativos = f.papeis.length ? f.papeis : [...chaves];
      f.papeis = ativos.includes(chave) ? ativos.filter((p) => p !== chave) : [...ativos, chave];
      if (f.papeis.length === chaves.length) f.papeis = [];
      aoMudar();
    };
    caixa.appendChild(b);
  });

  const conf = document.getElementById('filtro-confirmacao');
  conf.innerHTML = [['todas', 'conf_todas'], ['oficial_imprensa', 'conf_oficial_imprensa'],
    ['oficial', 'conf_oficial']].map(([v, k]) => `<option value="${v}">${t(k)}</option>`).join('');
  conf.value = estado.filtros.confirmacao;
  conf.onchange = () => { estado.filtros.confirmacao = conf.value; aoMudar(); };

  const empresas = [...new Set(estado.dados.incidentes.map((i) => i.empresa))].sort();
  const sel = document.getElementById('filtro-empresa');
  sel.innerHTML = `<option value="todas">${t('empresa_todas')}</option>` +
    empresas.map((e) => `<option value="${e}">${t('empresas')[e] || e}</option>`).join('');
  sel.value = estado.filtros.empresa;
  sel.onchange = () => { estado.filtros.empresa = sel.value; aoMudar(); };

  const grupo = document.getElementById('grupo-pais');
  const botao = document.getElementById('limpar-pais');
  grupo.hidden = !estado.filtros.pais;
  if (estado.filtros.pais) {
    const inc = estado.dados.incidentes.find((i) => i.pais === estado.filtros.pais);
    botao.textContent = (inc ? inc.pais_nome : estado.filtros.pais) + ' ✕';
    botao.onclick = () => { estado.filtros.pais = null; aoMudar(); };
  }
}

function desenharCartoes(dados, visiveis) {
  document.getElementById('cartoes').innerHTML = resumoTotais(dados, visiveis)
    .map((c) => `<div class="cartao"><div class="valor">${c.valor}</div><div class="nome">${t(c.chave)}</div></div>`)
    .join('');
}

function desenharMapa(estado, visiveis, dica, aoMudar) {
  const svg = d3.select('#mapa');
  svg.selectAll('*').remove();
  const largura = 960;
  const altura = 460;
  const contagem = contarPorPais(visiveis);
  const caixa = document.getElementById('mapa-caixa');
  const ajuda = document.getElementById('ajuda-mapa');
  const nota = document.getElementById('nota-mapa');
  if (!contagem.length) {            // sem país não há mapa: um mapa vazio parece defeito
    caixa.hidden = true;
    ajuda.hidden = true;
    nota.textContent = visiveis.length ? t('nota_sem_mapa')(visiveis.length) : '';
    return;
  }
  caixa.hidden = false;
  ajuda.hidden = false;
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
      dica.innerHTML = t('dica_pais')(c.nome, c.total);
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
    `<span>${maximo}</span><span>${t('legenda')}</span>`;

  const fora = visiveis.length - contagem.reduce((s, c) => s + c.total, 0);
  nota.textContent = t('nota_mapa')(fora);
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
    .text((s) => t('dica_semana')(s.total, formatarData(s.semana)));

  const passo = Math.ceil(semanas.length / 10);
  svg.append('g').attr('class', 'eixo').attr('transform', `translate(0,${altura - margem.baixo})`)
    .call(d3.axisBottom(x).tickValues(semanas.filter((_, i) => i % passo === 0).map((s) => s.semana))
      .tickFormat(formatarEixo));
  svg.append('g').attr('class', 'eixo').attr('transform', `translate(${margem.esquerda},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')));
}

function formatarData(iso) {                 // 2026-09-14 → 14/09/2026 ou 09/14/2026
  const [a, m, d] = iso.split('-');
  return idioma === 'pt' ? `${d}/${m}/${a}` : `${m}/${d}/${a}`;
}

function formatarEixo(iso) {
  const [, m, d] = iso.split('-');
  return idioma === 'pt' ? `${d}/${m}` : `${m}/${d}`;
}

function desenharLista(estado, visiveis) {
  const alvo = document.getElementById('lista');
  const titulo = document.getElementById('titulo-incidentes');
  if (estado.filtros.pais) {
    const inc = estado.dados.incidentes.find((i) => i.pais === estado.filtros.pais);
    titulo.textContent = t('titulo_pais')(inc ? inc.pais_nome : estado.filtros.pais, visiveis.length);
  } else {
    titulo.textContent = t('incidentes_titulo');
  }
  if (!visiveis.length) {
    alvo.innerHTML = `<p class="vazio">${t('vazio')}</p>`;
    return;
  }
  const escapar = (t) => String(t).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fonteHtml = (f) =>
    `<li><a href="${escapar(f.url)}" target="_blank" rel="noopener">${escapar(f.titulo)}</a>` +
    `<span class="veiculo"> — ${escapar(f.fonte)}, ${escapar(f.data)}</span></li>`;

  alvo.innerHTML = agruparPorCaso(visiveis).map(({ caso, incidentes }) => {
    const reps = estado.dados.repercussoes.filter((r) => r.caso === caso);
    const agrupado = incidentes.length > 1 || reps.length > 0;
    const cabecalho = agrupado
      ? `<p class="caso-titulo">${t('caso_linha')(caso, incidentes.length, reps.length)}</p>` : '';
    const corpo = incidentes.map((i) => {
      const n = nivel(i.gravidade);
      const local = i.pais === 'global' ? t('local_varios')
        : (i.pais === 'nao_informado' ? t('local_nao_informado') : i.pais_nome);
      return `<details class="incidente">
        <summary><span class="selo g${n.indice}">${n.nome}</span>
        <span class="titulo-incidente">${escapar(i.titulo)}</span></summary>
        <div class="corpo">
          <p class="meta"><b>${t('papeis')[i.papel] || i.papel}</b> · ${t('empresas')[i.empresa] || i.empresa}
            · ${escapar(local)} · ${t('confirmacoes')[i.confirmacao] || i.confirmacao}
            ${i.divergencia ? t('divergencia') : ''}</p>
          <p class="meta">${t('meta_gravidade')(i.gravidade.toFixed(1),
            t('defasagens')[i.defasagem] || '', i.fontes.length)}</p>
          <ul class="fontes">${i.fontes.map(fonteHtml).join('')}</ul>
        </div></details>`;
    }).join('');
    const repercussoes = reps.length
      ? `<details class="repercussoes"><summary>${t('repercussoes')(caso, reps.length)}</summary>
         <ul class="fontes">${reps.map(fonteHtml).join('')}</ul></details>`
      : '';
    return `<div class="caso${agrupado ? ' agrupado' : ''}">${cabecalho}${corpo}${repercussoes}</div>`;
  }).join('');
}

if (typeof document !== 'undefined') iniciar();
if (typeof module !== 'undefined') {
  module.exports = { aplicarFiltros, contarPorPais, porSemana, agruparPorCaso, resumoTotais, nivel,
    inicioDaSemana, chaveNumerica, detectarIdioma, TEXTOS,
    definirIdioma: (i) => { idioma = i; }, idiomaAtual: () => idioma };
}
