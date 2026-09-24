"""Testa o AI Incident Atlas sem gastar créditos: Jev, Google Notícias e GDELT são simulados.

Como rodar (na pasta do projeto, com a .venv ativa):
    python testar_sem_api.py

Usa um banco temporário: o seu observatorio.db não é tocado.
As respostas simuladas usam palavras-chave simples e NÃO representam o Jev real.
"""
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

PASTA = Path(__file__).parent
BANCO_TESTE = Path(tempfile.mkdtemp()) / 'teste.db'
os.environ['OBSERVATORIO_DB'] = str(BANCO_TESTE)
sys.path.insert(0, str(PASTA))

import observatorio as ob  # noqa: E402  (depois de definir o banco de teste)
from streamlit.testing.v1 import AppTest  # noqa: E402


def classificacao_simulada(e):
    t = (e['titulo'] + ' ' + e['resumo']).lower()
    sem = 'letter' in t or 'list' in e['titulo'].lower()
    desdobramento = 'bill' in t or 'congress' in t or 'lawsuit' in t
    incidente = (any(k in t for k in ['hack', 'breach', 'stole', 'malware', 'ataque', 'rouba', 'invas'])
                 and not sem and not desdobramento)
    empresa = ('google' if 'gemini' in t else 'openai' if 'hugging face' in t
               else 'anthropic' if 'anthropic' in t else 'nao_informado')
    return {
        'e_incidente': {'type': 'noul', 'noul': 0.9 if incidente else 0.1},
        'papel': {'type': 'choice',
                  'choice': 'sem_incidente' if sem else 'desdobramento' if desdobramento else 'agente_em_teste',
                  'confidence': 0.8},
        'gravidade': {'type': 'score', 'score': 3.0 if 'malware' in t else 2.0, 'confidence': 0.7},
        'confirmacao': {'type': 'choice', 'choice': 'oficial' if 'disclos' in t or 'reports' in t else 'imprensa',
                        'confidence': 0.8},
        'empresa': {'type': 'choice', 'choice': empresa, 'confidence': 0.8},
        'pais': {'type': 'choice', 'choice': 'usa' if 'fbi' in t else 'nao_informado', 'confidence': 0.6},
        'defasagem': {'type': 'choice', 'choice': 'meses_antes' if ' may' in t else 'mesmo_mes', 'confidence': 0.6},
    }


chamadas = {'classificar': 0, 'comparar': 0}


def post_simulado(url, **kw):
    corpo = kw['json']
    r = MagicMock(status_code=200)
    if 'mesmo_incidente' in corpo['questions']:
        chamadas['comparar'] += 1
        a, b = corpo['state']['noticia_a'], corpo['state']['noticia_b']
        textos = [(x['titulo'] + x['resumo']).lower() for x in (a, b)]
        mesmo_caso = all('hugging face' in x for x in textos) or all('375' in x for x in textos)
        mesmo_inc = mesmo_caso and not any('bill' in x for x in textos)
        r.json.return_value = {'answers': {
            'mesmo_incidente': {'type': 'noul', 'noul': 0.9 if mesmo_inc else 0.1},
            'mesmo_caso': {'type': 'noul', 'noul': 0.9 if mesmo_caso else 0.1}}}
    else:
        chamadas['classificar'] += 1
        r.json.return_value = {'answers': classificacao_simulada(corpo['state'])}
    return r


RSS = '''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>t</title>
<item><title>Fortune copy - Fortune</title>
<link>https://fortune.com/2026/09/01/openais-reports-on-its-ai-agents-attack-on-hugging-face-should-be-ringing-alarm-bellsand-making-all-companies-rethink-how-they-secure-ai-agents/?utm_source=rss</link>
<pubDate>Tue, 01 Sep 2026 14:00:00 GMT</pubDate><description>duplicate by URL</description></item>
<item><title>New bill cracks down on AI agents after Hugging Face breach</title>
<link>https://example.com/news/bill-ai-agents</link><pubDate>Wed, 16 Sep 2026 10:00:00 GMT</pubDate>
<description>A congressman filed a bill after the Hugging Face breach by OpenAI agents.</description></item>
<item><title>AI-driven hack snags 375 Brazil government employee logins</title>
<link>https://example.com/news/brazil-en</link><pubDate>Thu, 10 Sep 2026 12:00:00 GMT</pubDate>
<description>An AI agent hack stole 375 government employee logins in Brazil.</description></item>
<item><title>Ataque com IA rouba login de 375 servidores públicos no Brasil</title>
<link>https://example.com/news/brazil-pt</link><pubDate>Wed, 09 Sep 2026 12:00:00 GMT</pubDate>
<description>Um agente de IA roubou 375 logins de servidores públicos.</description></item>
<item><title>New AI agent breach reported at logistics firm</title>
<link>https://example.com/news/agent-breach</link><pubDate>Mon, 21 Sep 2026 10:00:00 GMT</pubDate>
<description>&lt;b&gt;An AI agent&lt;/b&gt; caused a breach at a logistics company.</description></item>
</channel></rss>'''


FEED_SEGURANCA = '''<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>s</title>
<item><title>Ransomware gang hits hospital chain</title><link>https://example.com/sec/ransomware</link>
<pubDate>Mon, 21 Sep 2026 09:00:00 GMT</pubDate><description>Hospitals in three states were affected.</description></item>
<item><title>Researchers show prompt injection against an AI agent</title>
<link>https://example.com/sec/prompt-injection</link><pubDate>Mon, 21 Sep 2026 09:30:00 GMT</pubDate>
<description>An AI agent was tricked into leaking data.</description></item>
</channel></rss>'''.encode('utf-8')


def get_simulado(url, **kw):
    r = MagicMock(status_code=200)
    r.raise_for_status = MagicMock()
    if 'news.google.com' in url:
        r.content = RSS
    elif 'gdelt' not in url:
        r.content = FEED_SEGURANCA
    else:
        r.json.return_value = {'articles': [{
            'url': 'https://example.com/news/agent-breach', 'title': 'New AI agent breach reported at logistics firm',
            'seendate': '20260921T110000Z', 'domain': 'example.com'}]}
    return r


def ok(condicao, mensagem):
    print(('  OK     ' if condicao else '  FALHOU ') + mensagem)
    return bool(condicao)


res = []
with patch('requests.post', side_effect=post_simulado), patch('requests.get', side_effect=get_simulado):
    con = ob.conectar()

    print('1. Exemplo com 7 notícias reais')
    r = ob.processar(con, 'chave-falsa', ob.ler_csv())
    tab = ob.tabela_incidentes(con)
    res.append(ok(r['novas'] == 7, f"7 notícias novas ({r['novas']})"))
    res.append(ok(len(tab) == 3, f'3 incidentes: Anthropic, Hugging Face e Gemini ({len(tab)})'))
    ids = dict(con.execute("SELECT fonte, incidente_id FROM noticias").fetchall())
    res.append(ok(ids['Poynter'] == ids['Fortune'] and ids['Poynter'] is not None,
                  'Poynter e Fortune agrupadas no mesmo incidente (Hugging Face)'))
    res.append(ok(ids['TechCrunch'] is None and ids['Rappler'] is None,
                  'carta aberta e lista não viraram incidente'))
    res.append(ok(chamadas['classificar'] == 7, f"7 classificações ({chamadas['classificar']})"))

    print('2. Nada é cobrado duas vezes')
    antes = dict(chamadas)
    r = ob.processar(con, 'chave-falsa', ob.ler_csv())
    res.append(ok(r['novas'] == 0 and chamadas == antes, 'segunda carga do exemplo não chamou o Jev'))

    print('3. Coleta de Google Notícias e GDELT')
    itens = ob.coletar_google_noticias() + ob.coletar_gdelt()
    r = ob.processar(con, 'chave-falsa', itens)
    res.append(ok(r['novas'] == 4, f"4 notícias novas: link com utm e duplicata entre fontes descartados ({r['novas']})"))
    br = con.execute("SELECT incidente_id FROM noticias WHERE url LIKE '%brazil-%' ORDER BY url").fetchall()
    res.append(ok(len(br) == 2 and br[0][0] is not None and br[0][0] == br[1][0],
                  f'matérias em português e inglês sobre o mesmo ataque viraram um incidente só ({br})'))
    lei = con.execute("SELECT incidente_id, caso_id, papel FROM noticias WHERE url LIKE '%bill-ai-agents%'").fetchone()
    caso_hf = con.execute("SELECT caso_id FROM noticias WHERE fonte = 'Poynter'").fetchone()[0]
    res.append(ok(lei[2] == 'desdobramento' and lei[0] is None,
                  'projeto de lei não virou incidente'))
    res.append(ok(lei[1] == caso_hf, 'projeto de lei ficou no mesmo caso do Hugging Face'))
    res.append(ok('<b>' not in con.execute("SELECT resumo FROM noticias WHERE url LIKE '%agent-breach%'")
                  .fetchone()[0], 'HTML removido do resumo'))

    print('4. Feeds de segurança com filtro de palavras')
    lidos, erros, descartados = ob.coletar_feeds(['BleepingComputer'])
    res.append(ok(len(lidos) == 1 and descartados == 1,
                  f'só a notícia que fala de IA passou ({len(lidos)} passou, {descartados} descartada)'))
    res.append(ok(not erros, 'nenhum erro de feed'))

    print('5. Reclassificar e reagrupar o acervo')
    antes_ids = dict(con.execute('SELECT id, incidente_id FROM noticias').fetchall())
    antes_chamadas = chamadas['classificar']
    total = con.execute('SELECT COUNT(*) FROM noticias').fetchone()[0]
    feitas = ob.reclassificar(con, 'chave-falsa')
    res.append(ok(feitas == total and chamadas['classificar'] == antes_chamadas + total,
                  f'todas as {total} notícias passaram pelo Jev de novo ({feitas})'))
    agrupadas = ob.reagrupar(con, 'chave-falsa')
    depois = dict(con.execute('SELECT id, incidente_id FROM noticias').fetchall())
    res.append(ok(agrupadas > 0 and all(v is not None for k, v in depois.items()
                                        if antes_ids.get(k) is not None),
                  f'quem era incidente continua sendo depois do reagrupamento ({agrupadas} avaliadas)'))
    fontes = dict(con.execute("SELECT fonte, incidente_id FROM noticias WHERE fonte IN "
                              "('Poynter', 'Fortune')").fetchall())
    res.append(ok(fontes.get('Poynter') == fontes.get('Fortune') and fontes.get('Poynter') is not None,
                  'o agrupamento do Hugging Face se manteve'))
    caminho = ob.copia_de_seguranca()
    res.append(ok(caminho and caminho.exists(), f'cópia de segurança criada ({caminho and caminho.name})'))

    print('6. Painel')
    at = AppTest.from_file(str(PASTA / 'painel.py'), default_timeout=60).run()
    metricas = {m.label: m.value for m in at.metric}
    res.append(ok(not at.exception, 'painel renderizou sem exceções'))
    res.append(ok(metricas.get('Incidentes') == '5', f"5 incidentes no painel ({metricas.get('Incidentes')})"))
    at.selectbox[0].set_value('Só oficial').run()
    res.append(ok(not at.exception, 'filtro "Só oficial" sem erro'))
    at.selectbox[0].set_value('Todas').run()
    paises = at.selectbox[1].options
    res.append(ok('Estados Unidos' in paises, f'mapa oferece filtro por país ({paises})'))
    at.selectbox[1].set_value('Estados Unidos').run()
    titulos = [m.value for m in at.markdown if 'Incidentes em' in m.value]
    res.append(ok(not at.exception and titulos, f'filtro por país aplicado ({titulos})'))

print(f'\n{sum(res)} de {len(res)} verificações passaram.')
