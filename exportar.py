r"""Agent Incident Atlas — exporta o banco para o JSON que o site estático consome.

Uso (rode na pasta onde está o observatorio.py, com a .venv ativa):
    python exportar.py                      # grava site/dados.json
    python exportar.py ..\meu-site         # grava dados.json dentro dessa pasta
    python exportar.py caminho/arquivo.json # grava exatamente nesse arquivo

O JSON não contém o texto das matérias, apenas título, link, veículo e data,
além das classificações do Jev. É o contrato entre a coleta e o site.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

import observatorio as ob
from paises import NUMERICO, PAISES

SAIDA = Path(__file__).parent / 'site' / 'dados.json'


def nome_pais(codigo):
    if codigo == 'global':
        return 'Vários países'
    if codigo == 'nao_informado' or codigo is None:
        return 'País não informado'
    return PAISES.get(codigo, (codigo, codigo))[1]


def fontes_de(con, incidente_id=None, caso_id=None):
    if incidente_id is not None:
        sql = ('SELECT titulo, url, fonte, publicada_em FROM noticias WHERE incidente_id = ? '
               'ORDER BY publicada_em')
        parametro = int(incidente_id)
    else:
        sql = ('SELECT titulo, url, fonte, publicada_em FROM noticias WHERE caso_id = ? '
               'AND incidente_id IS NULL ORDER BY publicada_em')
        parametro = int(caso_id)
    return [{'titulo': t, 'url': u, 'fonte': f, 'data': (d or '')[:10]}
            for t, u, f, d in con.execute(sql, (parametro,))]


def exportar(con, saida=SAIDA):
    tab = ob.tabela_incidentes(con)
    incidentes = []
    for incidente_id, inc in tab.iterrows():
        caso = inc['caso']
        incidentes.append({
            'id': int(incidente_id),
            'caso': int(caso) if pd.notna(caso) else 0,
            'titulo': inc['titulo'],
            'papel': inc['papel'],
            'gravidade': round(float(inc['gravidade']), 1),
            'divergencia': bool(inc['gravidade_max'] - inc['gravidade_min'] >= 1),
            'confirmacao': inc['confirmacao'],
            'empresa': inc['empresa'],
            'defasagem': inc['defasagem'],
            'pais': inc['pais'],
            'pais_nome': nome_pais(inc['pais']),
            'numerico': NUMERICO.get(inc['pais']),
            'primeira': inc['primeira_noticia'].strftime('%Y-%m-%d') if pd.notna(inc['primeira_noticia']) else None,
            'ultima': inc['ultima_noticia'].strftime('%Y-%m-%d') if pd.notna(inc['ultima_noticia']) else None,
            'fontes': fontes_de(con, incidente_id=incidente_id),
        })

    casos = {i['caso'] for i in incidentes}
    repercussoes = []
    for caso in sorted(casos):
        for r in fontes_de(con, caso_id=caso):
            repercussoes.append({'caso': caso, **r})

    total_noticias = con.execute('SELECT COUNT(*) FROM noticias').fetchone()[0]
    dados = {
        'gerado_em': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'totais': {
            'incidentes': len(incidentes),
            'casos': len(casos),
            'noticias': total_noticias,
            'repercussoes': len(repercussoes),
        },
        'incidentes': incidentes,
        'repercussoes': repercussoes,
    }
    saida = Path(saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding='utf-8')
    return dados


if __name__ == '__main__':
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else SAIDA
    if destino.is_dir() or destino.suffix.lower() != '.json':
        destino = destino / 'dados.json'   # aceita receber só a pasta do site
    if not Path(ob.BANCO).exists():
        print(f'Não encontrei o banco em {ob.BANCO}. Rode a coleta primeiro:\n'
              '    python observatorio.py atualizar   (ou use o painel)')
        sys.exit(1)
    d = exportar(ob.conectar(), destino)
    print(f"{d['totais']['incidentes']} incidentes, {d['totais']['repercussoes']} repercussões "
          f"e {d['totais']['noticias']} notícias em {destino}")
