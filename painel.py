"""Agent Incident Atlas — painel de curadoria (uso interno, não é o site público).

Como rodar (Windows, na pasta do projeto, com a .venv ativa):
    pip install streamlit requests pandas feedparser plotly
    python -m streamlit run painel.py --server.port 8505
"""
import pandas as pd
import plotly.express as px
import streamlit as st

import observatorio as ob
from paises import PAISES

ROT_PAPEL = {
    'agente_em_teste': 'Agente escapou de teste', 'agente_em_producao': 'Agente em uso real',
    'ia_como_ferramenta': 'IA usada por atacantes', 'ataque_a_ia': 'Ataque contra IA',
    'desdobramento': 'Repercussão', 'sem_incidente': 'Sem incidente',
}
ROT_CONF = {'oficial': 'Confirmação oficial', 'imprensa': 'Relato de imprensa', 'nao_confirmado': 'Não confirmado'}
ROT_EMPRESA = {'openai': 'OpenAI', 'anthropic': 'Anthropic', 'google': 'Google', 'meta': 'Meta',
               'microsoft': 'Microsoft', 'xai': 'xAI', 'varias': 'Várias', 'outra': 'Outra',
               'nao_informado': 'Não informado'}
ROT_DEFASAGEM = {'mesma_semana': 'na semana da notícia', 'mesmo_mes': 'semanas antes da notícia',
                 'meses_antes': 'meses antes da notícia', 'nao_informado': 'em data não informada'}
NIVEIS = ['Sem impacto externo', 'Acesso indevido', 'Organização comprometida',
          'Várias organizações', 'Infraestrutura crítica']


def nivel(g):
    return NIVEIS[int(round(min(max(g, 0), 4)))]


def nome_pais(codigo):
    return PAISES.get(codigo, (codigo, codigo))[1]


def link_md(texto):
    return texto.replace('[', '(').replace(']', ')')


@st.cache_resource
def conexao():
    return ob.conectar()


st.set_page_config(page_title='Agent Incident Atlas — curadoria', page_icon='🗺️', layout='wide')
st.title('🗺️ Agent Incident Atlas')
st.caption('Painel de curadoria: coleta, classificação e revisão. O site público é gerado pelo exportar.py.')
st.caption('Incidentes agrupados a partir de notícias, classificados automaticamente pelo Jev. A gravidade reflete '
           'o que foi relatado, não uma apuração própria. Confira sempre as fontes de cada incidente.')

con = conexao()

with st.sidebar:
    st.header('Coleta')
    chave = st.text_input('Chave da TypeSafe', type='password')
    padrao = ['Google Notícias (inglês)', 'Google Notícias (português)', 'Veículos de segurança']
    fontes = st.multiselect('Fontes', padrao + ['GDELT (instável)'], default=padrao)
    maximo = st.slider('Máximo de notícias novas por coleta', 5, 100, 30, step=5)
    atualizar = st.button('Atualizar agora', type='primary')
    exemplo = st.button('Carregar exemplo (7 notícias reais)')
    st.caption('Cada notícia nova custa uma chamada ao Jev, mais até cinco comparações para agrupar. '
               'Notícias já vistas não são cobradas de novo.')

if atualizar or exemplo:
    if not chave.strip():
        st.sidebar.warning('Informe a chave da TypeSafe.')
    else:
        itens = []
        if exemplo:
            itens = ob.ler_csv()
        else:
            coletores = {
                'Google Notícias (inglês)': lambda: ob.coletar_google_noticias(0),
                'Google Notícias (português)': lambda: ob.coletar_google_noticias(1),
                'GDELT (instável)': ob.coletar_gdelt,
            }
            for nome in fontes:
                if nome == 'Veículos de segurança':
                    lidos, erros, descartados = ob.coletar_feeds()
                    itens += lidos
                    for e in erros:
                        st.warning(e)
                    st.caption(f'Feeds de segurança: {len(lidos)} notícias falam de IA; '
                               f'{descartados} descartadas no código, sem custo.')
                    continue
                try:
                    itens += coletores[nome]()
                except ob.FalhaExterna as e:
                    st.warning(f'{nome}: {e}')
        if itens:
            barra = st.progress(0.0, text='Classificando com o Jev…')
            try:
                r = ob.processar(con, chave.strip(), itens, maximo=maximo,
                                 progresso=lambda i, t: barra.progress(i / t, text=f'{i} de {t} notícias classificadas'))
                barra.empty()
                st.success(f"{r['novas']} notícias novas · {r['repetidas']} repetidas ou já vistas · "
                           f"{r['incidentes']} ligadas a incidentes")
                if r['registro']:
                    with st.expander('Como as notícias foram agrupadas'):
                        st.text('\n'.join(r['registro']))
            except ob.FalhaExterna as e:
                barra.empty()
                st.error(str(e))

tab = ob.tabela_incidentes(con)
total_noticias = con.execute('SELECT COUNT(*) FROM noticias').fetchone()[0]
if tab.empty:
    st.info('Nenhum incidente registrado ainda. Use "Carregar exemplo" ou "Atualizar agora" na barra lateral.')
    st.stop()

# ------------------------------------------------------------------ filtros
f1, f2, f3 = st.columns(3)
opcoes_papel = [p for p in ROT_PAPEL if p not in ('sem_incidente', 'desdobramento')]
papeis = f1.multiselect('Papel da IA', opcoes_papel, default=opcoes_papel, format_func=ROT_PAPEL.get)
confianca = f2.selectbox('Confirmação', ['Todas', 'Oficial ou imprensa', 'Só oficial'])
empresas = f3.multiselect('Empresa de IA', list(ROT_EMPRESA), default=list(ROT_EMPRESA),
                          format_func=ROT_EMPRESA.get)
aceitas = {'Todas': list(ROT_CONF), 'Oficial ou imprensa': ['oficial', 'imprensa'], 'Só oficial': ['oficial']}[confianca]
vis = tab[tab['papel'].isin(papeis) & tab['confirmacao'].isin(aceitas) & tab['empresa'].isin(empresas)]

m1, m2, m3, m4 = st.columns(4)
m1.metric('Incidentes', len(vis))
m2.metric('Notícias analisadas', total_noticias)
m3.metric('Com confirmação oficial', int((vis['confirmacao'] == 'oficial').sum()))
m4.metric('Gravidade mais alta', nivel(vis['gravidade'].max()) if not vis.empty else '—')

if vis.empty:
    st.warning('Nenhum incidente com esses filtros.')
    st.stop()

# ------------------------------------------------------------------ mapa e gráficos
st.markdown('#### Onde ficam as organizações atingidas')
no_mapa = vis[~vis['pais'].isin(['global', 'nao_informado'])]
fora = len(vis) - len(no_mapa)
TODOS = 'Todos os países'
paises_no_mapa = {nome_pais(p): p for p in sorted(no_mapa['pais'].unique())}
clicado = None
if not no_mapa.empty:
    contagem = no_mapa.groupby('pais').size().rename('incidentes').reset_index()
    contagem['iso3'] = contagem['pais'].str.upper()
    contagem['nome'] = contagem['pais'].map(nome_pais)
    fig = px.choropleth(contagem, locations='iso3', color='incidentes', hover_name='nome',
                        custom_data=['pais'], color_continuous_scale='Reds')
    fig.update_layout(margin=dict(l=0, r=0, t=0, b=0), height=380)
    fig.update_coloraxes(colorbar=dict(dtick=1))
    try:  # clique no mapa (precisa do Streamlit 1.35 ou mais novo)
        evento = st.plotly_chart(fig, on_select='rerun', selection_mode='points', key='mapa')
        selecao = getattr(evento, 'selection', None) or (evento or {}).get('selection', {})
        pontos = (selecao or {}).get('points', [])
        if pontos:
            dados = pontos[0].get('customdata') or [pontos[0].get('location', '').lower()]
            clicado = nome_pais(dados[0] if isinstance(dados, (list, tuple)) else dados)
    except TypeError:
        st.plotly_chart(fig)
        st.caption('Atualize o Streamlit para clicar no mapa: pip install -U streamlit')
st.caption(f'{fora} incidente(s) sem país informado ou com vítimas em vários países não aparecem no mapa. '
           'Nenhum incidente é colocado num país que a notícia não citou.')

opcoes_pais = [TODOS] + sorted(paises_no_mapa)
if clicado in paises_no_mapa and st.session_state.get('pais_sel') != clicado:
    st.session_state['pais_sel'] = clicado           # o clique no mapa move o filtro
if st.session_state.get('pais_sel') not in opcoes_pais:
    st.session_state['pais_sel'] = TODOS
st.selectbox('Filtrar incidentes por país (ou clique no mapa)', opcoes_pais, key='pais_sel')

g1, g2 = st.columns(2)
with g1:
    st.markdown('#### Ao longo do tempo')
    tempo = vis.assign(semana=vis['primeira_noticia'].dt.tz_localize(None).dt.to_period('W').dt.start_time,
                       papel=vis['papel'].map(ROT_PAPEL))
    st.bar_chart(tempo.pivot_table(index='semana', columns='papel', values='titulo', aggfunc='count', fill_value=0))
    st.caption('Semana da primeira notícia sobre cada incidente.')
with g2:
    st.markdown('#### Por empresa de IA')
    por_empresa = vis.assign(empresa=vis['empresa'].map(ROT_EMPRESA), nivel=vis['gravidade'].map(nivel))
    st.bar_chart(por_empresa.pivot_table(index='empresa', columns='nivel', values='titulo',
                                         aggfunc='count', fill_value=0))
    st.caption('Número de incidentes, por gravidade relatada.')

# ------------------------------------------------------------------ lista
escolha_pais = st.session_state.get('pais_sel', TODOS)
if escolha_pais != TODOS:
    vis = vis[vis['pais'] == paises_no_mapa[escolha_pais]]
    st.markdown(f'#### Incidentes em {escolha_pais} ({len(vis)})')
else:
    st.markdown('#### Incidentes')
vis = vis.assign(caso=vis['caso'].fillna(0).astype(int))
if vis.empty:
    st.info('Nenhum incidente nesse país com os filtros atuais.')
    st.stop()
repercussoes = pd.read_sql('SELECT titulo, url, fonte, publicada_em, caso_id FROM noticias '
                           'WHERE caso_id IS NOT NULL AND incidente_id IS NULL', con)


def linha_fonte(titulo, url, fonte, data):
    st.markdown(f'- [{link_md(titulo)}]({url}) — {fonte}, {(data or "")[:10]}')


for caso, grupo in vis.groupby('caso', sort=False):
    reps = repercussoes[repercussoes['caso_id'] == caso]
    if len(grupo) > 1 or not reps.empty:
        st.markdown(f'**Caso {caso}** · {len(grupo)} incidente(s) · {len(reps)} repercussão(ões)')
    for incidente_id, inc in grupo.iterrows():
        variacao = ''
        if inc['gravidade_max'] - inc['gravidade_min'] >= 1:
            variacao = ' · as fontes divergem sobre a gravidade'
        with st.expander(f"{nivel(inc['gravidade'])} · {inc['titulo']}"):
            st.write(f"**{ROT_PAPEL.get(inc['papel'])}** · {ROT_EMPRESA.get(inc['empresa'])} · "
                     f"{nome_pais(inc['pais']) if inc['pais'] not in ('global', 'nao_informado') else ('vários países' if inc['pais'] == 'global' else 'país não informado')} · "
                     f"{ROT_CONF.get(inc['confirmacao'])}{variacao}")
            st.caption(f"Gravidade {inc['gravidade']:.1f} de 4 · ocorrido {ROT_DEFASAGEM.get(inc['defasagem'])} · "
                       f"{inc['fontes']} fonte(s)")
            fontes_inc = con.execute('SELECT titulo, url, fonte, publicada_em FROM noticias WHERE incidente_id = ? '
                                     'ORDER BY publicada_em', (int(incidente_id),)).fetchall()
            for titulo, url, fonte, data in fontes_inc:
                linha_fonte(titulo, url, fonte, data)
    if not reps.empty:
        with st.expander(f'Repercussões do caso {caso} — leis, processos, relatórios ({len(reps)})'):
            for _, r_ in reps.sort_values('publicada_em').iterrows():
                linha_fonte(r_['titulo'], r_['url'], r_['fonte'], r_['publicada_em'])

with st.expander('Notícias que não foram classificadas como incidente'):
    outras = pd.read_sql('SELECT titulo, fonte, papel, e_incidente FROM noticias WHERE incidente_id IS NULL', con)
    outras['papel'] = outras['papel'].map(ROT_PAPEL)
    st.dataframe(outras.rename(columns={'titulo': 'Título', 'fonte': 'Fonte', 'papel': 'Papel',
                                        'e_incidente': 'Prob. de incidente'}), hide_index=True)
