# Status

*Atualizado em 2026-09-24: publicado (sessão C3 do carreira-ai).*

## 24/09/2026: no ar

- **Público desde 24/09**, com Pages na `main`:
  https://igorlima-py.github.io/experiment-calculators/ . As 7 páginas (home, 5
  ferramentas, validação) responderam `200` sem autenticação.
- **CI verde pela primeira vez.** O `setup-python` com `cache: pip` procurava
  `requirements.txt`; ganhou `cache-dependency-path: requirements-dev.txt` (commit
  `9506889`). Os dois jobs passam em ~1m40s.
- **Alguém olhou as páginas.** As 5, em viewport de celular (375 px): sem overflow
  horizontal, sem erro no console, frase de julgamento renderizada em todas. A
  simulação do peeking, rodada direto no console, deu 14,16% (a página diz 14,2%)
  e 5,1% com o limiar corrigido.
- **Humanize no texto público** (commit `90811bc`): travessão como conector e
  "actually" de enchimento saíram; nenhum número, link ou código mudou. A frase de
  julgamento do geo-holdout passou a dizer "IP-based geo targeting is commonly cited
  as", igual à caixa de honestidade da mesma página.
- **Não é bug, é o painel de preview:** num painel que não pinta, o
  `requestAnimationFrame` não dispara nenhum frame e a simulação fica em
  "Running…". Num navegador de verdade não acontece.


> **A próxima sessão pode ser em outra máquina.** A seção "Setup numa máquina
> nova" abaixo é obrigatória antes de rodar qualquer coisa. O site em si não
> precisa de nada — só a validação e os dois geradores precisam.

## Onde estamos

As 6 fases do `docs/PLAN.md` já estavam concluídas. Esta sessão fez uma
**auditoria end-to-end** do que existia, achou três defeitos que teriam ido ao
ar, e fechou tudo. O plano, com evidência medida e critério de aceite por item,
está em **`docs/FIXES.md`** — os **dez** itens estão `FEITO`.

| Item | O que era | Arquivos |
|---|---|---|
| P0.1 | Frase de julgamento da Tool 1 chumbava "14%" para qualquer alpha | `tools/sample-size.html` |
| P0.2 | Link da validação servia `text/markdown` e baixava arquivo | `validation/build_page.py`, `validation/index.html` |
| P0.3 | Sem favicon, OG, canonical, robots, 404 | `assets/favicon.svg`, `assets/build_og.py`, `assets/og/`, `robots.txt`, `sitemap.xml`, `404.html` |
| P1.1 | Demo de ratio metrics travada em 3 sessões/usuário | `tools/cuped.html` |
| P1.2 | Tool 3 congelava a thread principal por segundos | `assets/tasks.js`, `compute-worker.js`, `compute.js` |
| P1.3 | Links de nav com 22 px no mobile | `assets/style.css` |
| P1.4 | Campo `holdout` exibia número que a conta não usava | `assets/ui.js`, `tools/geo-holdout.html` |
| P2.1 | `spendingBounds` validado e inalcançável | `tools/peeking.html`, `validation/*_tool3_spending.*` |
| P2.2 | Docs de sessão em português indo a público sem enquadramento | `docs/HOW-THIS-WAS-BUILT.md` |
| P3.1 | Página de validação podia divergir do fonte em silêncio | `.github/workflows/validation.yml`, `requirements-dev.txt` |

O defeito mais sério era o P0.1: a frase de julgamento — que pelo BRIEF é o
produto inteiro — afirmava 14% em qualquer nível de significância, quando o
valor real é 3,3% a 1% e 26,0% a 10%. A Tool 3 do próprio site desmentia a
Tool 1 a um clique de distância.

## Próximo passo imediato

**Abra <https://github.com/IgorLima-py/experiment-calculators/actions> e veja o
resultado do workflow `validation` disparado por este push. Ele nunca rodou —
foi escrito e testado só localmente.**

Se falhar, o suspeito número um é o `python-version: '3.14'` em
`.github/workflows/validation.yml` combinado com as versões fixadas do
`requirements-dev.txt`: se `scipy==1.17.1` não tiver wheel para 3.14 no runner
Linux, o passo "Install the reference stack" quebra. A correção é baixar para
`'3.13'` no workflow — as tolerâncias do `RESULTS.md` não dependem da versão do
Python, só das versões de scipy/statsmodels, que continuam fixadas.

**Depois disso: virar o repositório público**, o que liga o GitHub Pages na
conta free. Nada no código depende disso.

## O que NÃO foi verificado

- **Ninguém olhou as páginas com os próprios olhos. Ainda.** Continua sendo a
  lacuna mais antiga do projeto. **Todo screenshot falhou nas duas sessões** —
  o painel do browser do Claude Code não compõe frames quando está oculto, e
  não há como forçá-lo por aqui. O que foi verificado por DOM e CSS computado:
  nenhuma página com overflow horizontal a 375 px, nenhum controle interativo
  abaixo de 24 px, contraste 5,0–17,8:1 no claro e 6,7–15,3:1 no escuro,
  console limpo, todos os links internos resolvem, uma `h1` por página. Isso
  pega estrutura e acessibilidade; **não** pega "está feio" nem "o gráfico
  ficou torto".
- **O workflow do GitHub Actions nunca rodou.** Ver próximo passo.
- **As imagens de OG nunca foram desdobradas de verdade** por Slack/LinkedIn —
  só dá para testar depois de público.
- **Um único motor de browser.** Tudo em Chromium. Sem Safari, sem Firefox.
- **O texto em inglês não foi revisado por humano.**

```bash
python serve.py 8000
# index.html, tools/{sample-size,mde,peeking,geo-holdout,cuped}.html,
# validation/index.html
```

## Medições desta sessão (para não refazer)

| O quê | Valor |
|---|---|
| Inflação de alpha, 5 looks | 3,27% a α=1% · 14,17% a α=5% · 25,96% a α=10% |
| Pocock nominal, K=2/3/5/10 | 0,0294 / 0,0221 / 0,0158 / 0,0106 (batem com a tabela de 1977) |
| Tool 3, looks=50, antes | 1,3 s a 7,6 s de thread principal travada |
| Tool 3, looks=50, depois | **0 ms** de travamento; fronteiras em 2,5 s; tecla em 35 ms |
| Ratio metrics, subestimação | 1,19× (3 sessões) → 1,30× (6, novo default) → 2,35× (12) |
| Alpha spending vs scipy | pior desacordo 2,9e-4 em z; 0,00006 pp entre prometido e gasto |
| Contraste | 5,0–17,8:1 claro · 6,7–15,3:1 escuro |

## O que foi tentado e falhou

- **Screenshot do browser** — timeout nas duas sessões, painel oculto. Contornado
  medindo `scrollWidth`, `getBoundingClientRect` e `getComputedStyle` por JS.
- **`preview_start` na porta 8000** — recusado porque outro chat já tinha um
  `serve.py` de pé nessa porta nesta máquina. Contornado navegando direto para
  `http://localhost:8000`. Numa máquina limpa isso não acontece.
- **Heredoc do bash para escrever prosa longa** — quebra com apóstrofos
  (`O'Brien`). Use a ferramenta de escrita de arquivo.
- **`print()` do Python neste console** — é cp1252 e explode com `α`, `×`, `é`.
  **O arquivo grava em UTF-8 normalmente**; é só o stdout. Não confunda o
  traceback com falha da escrita.
- **`innerText` para inspecionar conteúdo dentro de `<details>` fechado** —
  retorna vazio. Custou uma falsa pista ("os avisos não estão sendo escritos").
  Use `textContent`.
- **Primeira medição do Web Worker** — pareceu bug ("o callback não chega"), era
  só o custo de subir o worker e baixar quatro scripts. Resolvido construindo o
  worker no load, não na primeira chamada.
- **Um teste de sabotagem com `&&`** — `python -c ... && node check.js` não roda
  o `node` quando o python falha, e o `$?` mede o python. O teste parecia
  provar algo e não provava nada. Refeito com `;` e conferindo o sha256 do
  arquivo restaurado.

## Um erro que vale registrar

Ao revisar as fronteiras de alpha spending, afirmei de memória que os valores
publicados para O'Brien-Fleming a 3 looks eram 3,471 / 2,454 / 2,004 e que o
código discordava. **O código estava certo.** Aqueles são os valores da
fronteira O'Brien-Fleming *original* (que o `reference_tool3.py` já valida), não
os da fronteira de *gasto* Lan-DeMets, que é outro objeto e dá 3,395 / 2,407 /
2,015. O scipy confirmou o código de forma independente. Documentado no
`RESULTS.md` numa seção própria, porque os nomes colidem e os números são
próximos o bastante para parecerem uma discrepância.

Memória não é referência. Só a implementação independente decide.

## Estrutura que esta sessão adicionou

- **`validation/index.html`** — a validação virou página do site, gerada de
  `RESULTS.md` por `validation/build_page.py`. O `.md` é a fonte da verdade;
  edite ele e regere. `--check` falha se a página estiver desatualizada, e o CI
  roda esse `--check`.
- **`assets/og/*.png`** — link previews, geradas por `assets/build_og.py`.
- **`assets/tasks.js` + `compute-worker.js` + `compute.js`** — trabalho pesado
  fora da thread principal, com fallback síncrono quando o worker não sobe
  (`file://`). As duas rotas rodam o mesmo código, de propósito.
- **`docs/HOW-THIS-WAS-BUILT.md`** — em inglês, linkado do README.
- **Sétima suíte de validação** — `reference_tool3_spending.py` +
  `check_tool3_spending.js`.
- **`.github/workflows/validation.yml`** + `requirements-dev.txt`.

## Como rodar

```bash
python serve.py 8000
```

Validação completa (as **sete** suítes):

```bash
cd validation
python reference_core.py  && node check_core.js
python reference_tool1.py && node check_tool1.js
python reference_tool2.py && node check_tool2.js
python reference_tool3.py && node check_tool3.js   # ~7 min só o reference
python reference_tool3_spending.py && node check_tool3_spending.js
python reference_tool4.py && node check_tool4.js
python reference_tool5.py && node check_tool5.js
```

Regerar os dois arquivos gerados:

```bash
python validation/build_page.py    # validation/index.html
python assets/build_og.py          # assets/og/*.png
```

## Setup numa máquina nova

O **site** não precisa de nada — é HTML e JS estáticos. Só a validação e os
geradores precisam:

```bash
python -m pip install -r requirements-dev.txt
```

- **Python 3** — 3.14.3 na máquina onde isto foi construído.
- **Node** — só test runner, v24.19.0 aqui. Não existe `package.json`, de
  propósito, e nada do que é publicado usa npm.
- **Fontes:** `assets/build_og.py` procura Segoe UI, depois DejaVu (Linux),
  depois Arial (macOS). **As imagens commitadas foram feitas com Segoe UI** —
  noutra plataforma o tipo assenta diferente, então regere as sete de uma vez
  ou elas deixam de combinar entre si.
- **R não é necessário.**

### Preso a esta máquina (não vale noutra)

- `gh` **não** está instalado aqui; a API pública do GitHub foi usada via
  `curl`. Noutra máquina, prefira o `gh` se existir.
- O `serve.py` na porta 8000 pode estar ocupado por outra sessão **nesta**
  máquina; noutra, `python serve.py 8000` sobe limpo.
- O console é cp1252 **aqui**; noutra máquina o `print()` com acento
  provavelmente funciona.
- Usuário do GitHub é **`IgorLima-py`** (o do remote), não o que se deduz do
  e-mail do commit.

## Armadilhas permanentes

- **Use `serve.py`, não `python -m http.server`** — cache do browser servindo
  `.js` velho.
- **`requestAnimationFrame` não dispara com o painel oculto** — por isso a
  simulação da Tool 3 cai para `setTimeout` quando `document.hidden`.
- **O buffer de console do browser persiste entre navegações** — erros velhos
  reaparecem e parecem atuais.

## Melhorias possíveis (nenhuma bloqueia)

- Painel de skewness/winsorização na Tool 5 — cortado deliberadamente.
- Revisão humana do inglês.
- Um segundo motor de browser.
