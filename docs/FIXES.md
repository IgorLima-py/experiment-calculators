# Plano de correções — auditoria end-to-end

*Aberto em 2026-08-27. Este documento é o contrato de trabalho: qualquer sessão
pode retomar daqui sem contexto anterior.*

Origem: auditoria completa do projeto depois que as 6 fases do `docs/PLAN.md`
fecharam. Cada item abaixo tem **evidência medida**, **critério de aceite** e
**estado**. Marque o estado ao terminar. Não marque nada como feito sem rodar o
critério de aceite.

## Como retomar

```bash
python serve.py 8000
```

Estado: `TODO` · `EM ANDAMENTO` · `FEITO` · `DESCARTADO (motivo)`

---

# P0 — bloqueiam a publicação

## P0.1 — A frase de julgamento da Tool 1 mente para alpha ≠ 5%

**Estado:** FEITO — 2026-08-27. Verificado no browser: α=1% → 3,3%, α=5% → 14,2%, α=10% → 26,0%; teste de 1 dia diz "twice", não "five times"; o link para a Tool 3 leva alpha e looks junto, então as duas páginas concordam na tela.

**Evidência.** `tools/sample-size.html` chumba o texto *"the N% false-positive
rate you think you have is closer to 14% after five looks"*. Os 14% valem só
para alpha = 5%. Medido na própria `Sequential`:

| alpha nominal | 5 looks, valor real |
|---|---|
| 1% | 3.27% |
| 5% | 14.17% |
| 10% | 25.96% |

Carregando `sample-size.html?alpha=1`, a página afirma que 1% "is closer to
14%" — e a Tool 3 do mesmo site desmente isso a um clique. É o pior lugar
possível para um número chumbado: a frase de julgamento é, pelo BRIEF, o
produto inteiro.

**Correção.** Carregar `assets/sequential.js` em `sample-size.html` e calcular
`Sequential.alphaInflation(looks, alpha)` ao vivo. Usar um número de looks
coerente com a duração (um teste de 1 dia não comporta "watch the test daily"
por 5 dias): `looks = min(5, max(2, days))`, com o texto concordando com o
número usado.

**Aceite.**
- `?alpha=1` → a frase cita ~3.3%, não 14%.
- `?alpha=10` → cita ~26%.
- `?alpha=5` (default) → cita 14.2%.
- O número de looks citado nunca excede a duração em dias.
- Nenhum erro no console.

## P0.2 — O link da validação provavelmente baixa um arquivo

**Estado:** FEITO — 2026-08-27. `validation/build_page.py` gera `validation/index.html`. Fidelidade conferida por contagem: 119 linhas de corpo + 14 cabeçalhos de alinhamento = 133 linhas `|` do Markdown; 14 tabelas, 6 blocos de código, 20 h3, `<value>` escapado. TOC com âncoras que resolvem, `--check` idempotente.

**Evidência.** `GET /validation/RESULTS.md` responde `200 text/markdown`. O
Chrome faz download de `text/markdown` em vez de renderizar. Esse link está no
`index.html` e nas 5 ferramentas: é a espinha dorsal da credibilidade do site e
o clique dele não mostra página nenhuma.

**Correção.** Uma página HTML de validação de primeira classe:
`validation/index.html`, gerada de `RESULTS.md` por `validation/build_page.py`
(gerador em Python, roda à mão como os outros scripts de validação; o que o site
serve continua sendo HTML estático — a regra "sem build step" do `CLAUDE.md`
vale para o site, não para as ferramentas de desenvolvimento). O `RESULTS.md`
segue como fonte única da verdade para quem lê no GitHub.

O gerador precisa cobrir o subconjunto de Markdown que o `RESULTS.md` usa:
títulos, tabelas, listas, blocos de código, links, `code` inline, negrito,
itálico e regra horizontal.

**Aceite.**
- `/validation/` abre uma página estilizada com o `assets/style.css` do site.
- Todos os links para `RESULTS.md` no site apontam para a página HTML.
- O gerador falha ruidosamente diante de sintaxe que ele não cobre (nada de
  gerar HTML errado em silêncio).
- `python validation/build_page.py` é idempotente.
- README explica que a página é gerada e como regerar.

## P0.3 — Zero metadados de compartilhamento

**Estado:** FEITO — 2026-08-27. Favicon SVG, canonical único por página, 7 tags og e 4 twitter em cada uma, 7 imagens 1200×630 geradas por `assets/build_og.py`, mais `robots.txt`, `sitemap.xml` e `404.html`. Console limpo.

**Nota.** O `404.html` usa caminhos absolutos com o prefixo `/experiment-calculators/`, que é o que o GitHub Pages exige num project site. Ele por isso não funciona servido na raiz local — só no Pages.

**Evidência.** Medido nas 6 páginas: sem favicon (`/favicon.ico` → 404), sem
`og:`, sem `twitter:`, sem `canonical`. Sem `robots.txt`, sem página 404. O
BRIEF diz que a URL compartilhável **é o mecanismo de distribuição** — colado no
Slack ou no LinkedIn, isso renderiza como URL pelada.

**Correção.**
- `assets/favicon.svg` + `<link rel="icon">` nas 6 páginas.
- `og:title`, `og:description`, `og:type`, `og:url`, `og:image`,
  `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`,
  `twitter:image` e `<link rel="canonical">` em cada página, com texto próprio.
- `assets/og/*.png` 1200×630, um por página, gerados por `assets/build_og.py`
  (Pillow 12.1.1 disponível nesta máquina).
- `robots.txt` e `404.html`.
- URL base: `https://igorlima-py.github.io/experiment-calculators/`.

**Aceite.**
- As 6 páginas têm canonical absoluto e único.
- Cada `og:image` resolve para um arquivo que existe em disco.
- `/favicon.ico` deixa de aparecer como 404 no console.
- `404.html` existe e leva de volta ao índice.

---

# P1 — qualidade

## P1.1 — A demo de ratio metrics se subestima

**Estado:** FEITO - 2026-08-27. Slider de sessoes por usuario (2 a 12, default 6), na URL. Subestimacao no default subiu de 1,19x para 1,30x e vai a 1,58x em 12 sessoes. A simulacao passou a rodar no worker do P1.2.

**Evidência.** No default a página mostra o SE naive subestimando o ruído em
1.19×, enquanto o texto promete que "you get confident about effects that are
not there". `meanSessions: 3` está chumbado em `tools/cuped.html` e é a alavanca
dominante. Medido:

| sessões/usuário | spread | subestimação |
|---|---|---|
| 3 | 1 | 1.23× |
| 6 | 1 | 1.29× |
| 12 | 1 | 1.61× |
| 6 | 2 | 1.69× |
| 12 | 2 | 2.35× |

**Correção.** Expor sessões-por-usuário como segundo slider (2 a 12, default 6),
com o valor no `SPEC` para ir à URL. Ajustar o texto de julgamento para citar o
número de sessões vigente.

**Aceite.** Arrastar o slider muda a subestimação de forma visível; a URL carrega
a posição; a validação da Tool 5 continua passando.

## P1.2 — A Tool 3 congela a thread principal

**Estado:** FEITO - 2026-08-27. `assets/tasks.js` (as tarefas), `assets/compute-worker.js` (o worker) e `assets/compute.js` (despacho com fallback sincrono e descarte de respostas superadas). Medido com looks=50: numero principal imediato, fronteiras em 2,5 s, **pior travamento da thread principal 0 ms**, tecla respondida em 35 ms durante o calculo. Worker e fallback produzem valores identicos bit a bit, e batem com Pocock K=5 = 0,0158 da tabela publicada. O worker passou a ser construido no load, nao na primeira chamada, senao a espera do arranque aparecia na tela.

**Evidência.** `pocockBound(50)` + `obrienFlemingBounds(50)` custaram entre
1,3 s e 7,6 s neste desktop conforme o estado do JIT e a carga da máquina — as
duas medições saíram da mesma sessão e diferem por 6×, então a única conclusão
segura é "lento o bastante para importar", provavelmente vários segundos num
celular médio (que o BRIEF chama de metade do tráfego). Enquanto isso a UI
mostra apenas `…`.

Reduzir `intervals` foi considerado e **descartado como correção principal**:
n=100 erra 1.4e-6 em K=50 (aceitável para o que a página exibe) mas economiza só
4×, e mudar o default divergiria dos números já publicados no `RESULTS.md`.

**Correção.** Mover o cálculo das fronteiras para um Web Worker
(`assets/sequential-worker.js`, `importScripts('stats.js','sequential.js')` —
JS puro, sem build step, funciona no Pages), com **fallback síncrono** quando o
worker não sobe (é o caso de `file://` no Chrome). Estado de ocupado visível e
botão da simulação desabilitado até as fronteiras chegarem.

**Aceite.**
- Com looks=50 a página continua respondendo à digitação enquanto calcula.
- Abrindo por `file://` a página ainda funciona (fallback).
- Os números exibidos são idênticos aos de antes (a matemática não muda).

## P1.3 — Alvos de toque abaixo do mínimo no mobile

**Estado:** FEITO - 2026-08-27. `.site-nav a` com `min-height: 28px`. A 375 px nao ha mais nenhum controle abaixo de 24 px. Links inline em frase ficam como estao: a 2.5.8 os isenta.

**Evidência.** A 375 px os links da navegação medem 22 px de altura, abaixo do
mínimo de 24 px do WCAG 2.2 (2.5.8), e são a navegação principal. Contraste
(5,0–17,8:1 no claro, 6,7–15,3:1 no escuro) e overflow horizontal foram medidos
e estão corretos — não precisam de nada.

**Correção.** Padding vertical nos links de `.site-nav` para ≥ 24 px de altura
sem quebrar o layout de duas linhas no mobile.

**Aceite.** Nenhum elemento interativo abaixo de 24 px de altura a 375 px.

## P1.4 — Campo que mostra um número que a conta não usa

**Estado:** FEITO - 2026-08-27. `UI.attach` ganhou um terceiro argumento `normalise` para restricoes entre campos; a geo usa. `?holdout=400` com 40 mercados agora deixa campo, URL e resultado todos em 39.

**Evidência.** Em `tools/geo-holdout.html` o `render` faz
`Math.min(v.holdout, v.geos - 1)`, mas o valor não clampado continua no estado e
na URL. Com 40 mercados o campo pode exibir 400 enquanto o cálculo usa 39.

**Correção.** Clampar no estado (não só no render), de forma que campo, URL e
resultado sempre concordem.

**Aceite.** Digitar 400 com 40 mercados deixa o campo, a URL e o resultado todos
em 39.

---

# P2 — portfólio

## P2.1 — Funcionalidade validada e inalcançável

**Estado:** TODO

**Evidência.** `Sequential.spendingBounds` e `Sequential.overallAlphaUneven`
estão implementados, comentados, validados e no bundle — e nenhuma página os
chama. É a parte mais sofisticada da Tool 3 e ela não existe para o usuário.

**Correção.** UI de peeks desigualmente espaçados na Tool 3: entrada das frações
de informação, escolha da função de gasto (O'Brien-Fleming / Pocock, Lan-DeMets)
e tabela de fronteiras resultante.

**Aceite.** Frações desiguais produzem fronteiras diferentes das igualmente
espaçadas, e o alpha total gasto bate com o alvo.

## P2.2 — Docs de sessão em português vão a público

**Estado:** TODO — **decisão tomada pelo Igor em 2026-08-27**

**Evidência.** `CLAUDE.md`, `.claude/commands/` e `docs/STATUS.md` estão
commitados e vão a público com o histórico inteiro. O `STATUS.md` diz, em
português, que "um dos 5 agentes de pesquisa (CUPED) morreu com erro de API" e
documenta armadilhas do painel do Claude Code. Quem abrir o repo descobre em 30
segundos que foi construído por um agente.

**Decisão do Igor:** assumir, em inglês e bem escrito.

**Correção.** `docs/HOW-THIS-WAS-BUILT.md`, em inglês: o método, as decisões de
estatística e por quê, o que a validação pegou que a inspeção não pegaria, e o
papel do agente dito de frente — como argumento, não como rastro acidental.
Linkado do README. `docs/STATUS.md` e `docs/PLAN.md` seguem em português como
documentos de trabalho (regra do `CLAUDE.md`).

**Aceite.** README linka o documento; ele responde "como isto foi feito e por que
devo acreditar" sem que o leitor precise abrir o `docs/` em português.

---

# Fora de escopo (decidido, não esquecido)

- **Nenhuma ferramenta nova.** Cinco é uma suíte; seis é enchimento.
- **Painel de skewness/winsorização na Tool 5** — cortado deliberadamente na
  construção; o conteúdo virou texto na lista de equívocos e está bom assim.
- **Segundo motor de browser.** Continua testado só em Chromium. Segue como
  lacuna honesta declarada no `STATUS.md`.
- **Revisão do inglês por humano.** Continua pendente e continua sendo do Igor.
