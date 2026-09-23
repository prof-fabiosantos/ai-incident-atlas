# Agent Incident Atlas

Mapa e linha do tempo de incidentes de segurança envolvendo agentes e modelos de IA, montados
automaticamente a partir de notícias públicas.

O site é estático e mostra **incidentes**, não notícias: as matérias que falam do mesmo ataque ficam
reunidas num incidente, e os desdobramentos (relatórios, projetos de lei, processos) ficam reunidos no
mesmo **caso**. Cada incidente traz a gravidade relatada, o grau de confirmação, a empresa de IA
envolvida, o país da organização atingida e todas as fontes.

## Como funciona

1. **Coleta** — feeds de veículos e órgãos de segurança, mais buscas no Google Notícias em inglês e em
   português. Um filtro de palavras, no código, descarta o que não fala de IA antes de gastar qualquer
   chamada de modelo.
2. **Classificação** — cada notícia passa por uma chamada ao [Jev](https://docs.typesafe.ai), modelo da
   TypeSafe AI, com sete perguntas tipadas: se relata um incidente concreto, o papel da IA, a gravidade,
   o grau de confirmação, a empresa, o país e há quanto tempo o incidente ocorreu.
3. **Agrupamento** — o código escolhe candidatos por janela de datas, palavras em comum e empresa; o Jev
   decide, par a par, se é o mesmo incidente e se é o mesmo caso.
4. **Exportação** — `exportar.py` gera `site/dados.json`, que é o contrato com o site.
5. **Publicação** — o site é HTML, CSS e D3, sem framework e sem servidor.

## Estrutura

| Arquivo | Para que serve |
| --- | --- |
| `observatorio.py` | Coleta, classificação, agrupamento e banco SQLite. Roda também pela linha de comando. |
| `painel.py` | Painel de curadoria em Streamlit, de uso local. Não faz parte do site público. |
| `exportar.py` | Gera o `site/dados.json` a partir do banco. |
| `paises.py` | Países para a pergunta de localização e os códigos que o mapa usa. |
| `site/` | O site estático publicado na Vercel. |
| `testar_sem_api.py` | Testa a coleta e o painel com o Jev e as fontes simulados, sem gastar créditos. |
| `site/testar_site.js` | Testa as funções de dados do site, sem navegador. |

## Rodando localmente

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

python testar_sem_api.py           # não gasta créditos
python observatorio.py feeds       # confere se as fontes estão no ar

export TYPESAFE_API_KEY=...        # Windows: $env:TYPESAFE_API_KEY='...'
python observatorio.py atualizar   # coleta e classifica
python exportar.py site            # gera site/dados.json

python -m http.server 8080 --directory site
```

O painel de curadoria roda com `python -m streamlit run painel.py --server.port 8505`.

## Coleta automática

O workflow `.github/workflows/atualizar.yml` roda todo dia às 10:00 UTC, coleta, classifica, exporta e
faz commit de `observatorio.db` e `site/dados.json`. Ele precisa do segredo `TYPESAFE_API_KEY` em
*Settings → Secrets and variables → Actions*. Dá para rodar na mão em *Actions → Atualizar dados → Run
workflow*, escolhendo quantas notícias novas processar.

Se você também coletar na sua máquina, rode `git pull` antes, porque o banco é versionado e o robô
escreve nele.

## Publicação na Vercel

Importe o repositório, defina **Root Directory: `site`**, framework **Other** e nenhum comando de build.
Cada push republica o site.

## Limites

A classificação é automática e pode errar. A gravidade reflete o que a notícia relatou, não uma apuração
própria. Nenhum incidente é colocado num país que a notícia não citou. O repositório guarda apenas
título, link, veículo e data de cada matéria; o texto completo continua no veículo de origem.

Encontrou um erro de classificação ou um incidente que falta?
[Abra uma issue](https://github.com/prof-fabiosantos/ai-incident-atlas/issues/new).
