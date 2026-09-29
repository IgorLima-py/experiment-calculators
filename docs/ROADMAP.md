# Roadmap

A v2 da suíte, desenhada pelo `/360` de 27/09/2026. A v1 (o `BRIEF.md` e as seis fases do
`docs/PLAN.md`) está no ar desde 24/09; nada daqui refaz aquele plano. Quem escreve este arquivo
é o `/360`; quem lê é o `/tchau` (para resolver o perfil da próxima fatia) e o Igor. O bloco 5
guarda as decisões da entrevista.

---

## 1. Tabela de perfis

A política num lugar só — mudar política é **uma** edição, não N. Cada fatia aponta para um
perfil; nenhuma fatia escreve modelo e esforço direto.

| Perfil | Modelo | Esforço | Quando |
|---|---|---|---|
| `leve`    | haiku  | low    | ler, resumir, exportar |
| `ajuste`  | sonnet | low    | corrigir texto, renomear, uma conta só |
| `padrao`  | sonnet | medium | fatia mecânica, tela, worker, chamada de rede |
| `dificil` | opus   | high   | schema, serviço de fundo, quebrar arquivo, fórmula nova com validação |
| `replan`  | opus   | xhigh  | replanejar, pesquisar frente nova, decidir escopo |

**Regra de correção:** consertar o que uma fatia entregou errado usa **o modelo daquela fatia e
um nível de esforço acima**. Quem errou não foi o modelo, foi o orçamento de pensar.

---

## 2. A fila

Estado: ✅ feito · 🚧 em obras · ⬜ não começou · 🔴 travado

| # | Chat | Perfil | Forma | Estado | Máquina | Depende de | Paralelo com | O que muda no dia seguinte |
|---|---|---|---|---|---|---|---|---|
| 1 | C1 — frases testadas e guarda do site | `dificil` | sessao | ✅ | qualquer | — | — | frase de julgamento errada e ferramenta esquecida no nav ou no sitemap quebram a bateria; as duas frases falsas do index saem do ar |
| 2 | C2 — leitura do teste | `dificil` | sessao | ⬜ | qualquer | C1 | — | quem terminou um teste lê o resultado no site: lift com IC, SRM checado antes, erro tipo M quando faltou poder |
| 3 | C3a — leitura do teste geo | `dificil` | sessao | ⬜ | qualquer | C1 | — | um teste geo terminado vira receita incremental e iROAS com IC, no mesmo modelo que a Tool 4 usou para desenhá-lo |
| 4 | C3b — do teste geo ao prior do MMM | `dificil` | sessao | ⬜ | qualquer | C3a | — | o iROAS vira prior do Meridian e linha de calibração do Robyn; a suíte linka o artigo de MMM |
| 5 | C4a — métrica contínua | `dificil` | sessao | ⬜ | qualquer | C2 | — | teste de receita por usuário ou ticket médio pode ser planejado (Tools 1–2) e lido (C2) |
| 6 | C4b — split desigual, A/B/n e CUPED no tamanho de amostra | `dificil` | sessao | ⬜ | qualquer | C4a | — | teste 90/10, com 3+ braços ou com CUPED sai com o tamanho de amostra certo; a página do CUPED passa a conversar com a Tool 1 |
| 7 | C5a — sistema visual e landing | `dificil` | sessao | ⬜ | Karen | C3b, C4b | — | o site tem identidade própria, e o `DESIGN.md` guia toda página |
| 8 | C5b — as ferramentas no sistema novo | `padrao` | sessao | ⬜ | Karen | C5a | — | as sete ferramentas no visual novo, conferidas em 375 e 1280 px, claro e escuro |
| 9 | C6 — lançamento | `padrao` | sessao | ⬜ | qualquer | C5b | — | o site está pronto para ser mostrado: SEO, prévia de link e rascunhos de post na mão do Igor |

A última coluna é a que impede fatia decorativa: se nada muda no dia seguinte, a fatia não
merece um chat.

**Três regras que valem para toda fatia desta fila** (vêm do `CLAUDE.md` e da entrevista):

- ferramenta nova ou fórmula nova só sai com o par `reference_*.py` + `check_*.js`, a seção no
  `validation/RESULTS.md`, a página `validation/index.html` regerada, o passo no CI e o check na
  linha `bateria:` do `CLAUDE.md`;
- toda prosa pública nova (página, README) passa pela `humanize`: rascunho → final, com o
  `conferir.py` saindo 0;
- nenhuma requisição a outro domínio no site publicado.

---

## 3. Uma seção por fatia

### C1 — frases testadas e guarda do site

`dificil` · opus · high · forma: sessao · máquina: qualquer · plan mode: não · contexto: limpo antes

**persona:** quem tira a frase de julgamento de dentro do HTML e a põe sob teste, sem mudar uma
palavra do que as ferramentas dizem hoje.
**entra:** os `render` inline de `tools/sample-size.html`, `tools/mde.html`, `tools/peeking.html`,
`tools/geo-holdout.html` e `tools/cuped.html`; `assets/ui.js` (os formatadores `integer`,
`decimal` e `percent`, que já carregam no Node sem DOM); o padrão de `validation/check_tool1.js`
(carrega os assets por `eval`); `docs/HOW-THIS-WAS-BUILT.md:73-79` (a frase de "14%" que já saiu
errada uma vez); `CLAUDE.md` (linha `bateria:`); `.github/workflows/validation.yml`;
`index.html`, `404.html`, `sitemap.xml`, `README.md`; `assets/build_og.py` (lista `PAGES`);
`validation/README.md` (ainda descreve os `verify_*.py` da semente).
**sai:** `assets/judgement.js` (uma função pura por ferramenta: recebe números, devolve o HTML
da frase) e as cinco páginas chamando essas funções; `validation/check_judgement.js` (casos em
tabela: α = 1% → 3.3% e α = 10% → 26.0% na Tool 1, o caso de uma olhada na Tool 3, os três
níveis da Tool 2, os dois ramos da Tool 4, o ramo da razão na Tool 5);
`validation/check_site.js` (toda `tools/*.html` aparece no nav de todas as páginas, no
`index.html`, no `404.html`, no `sitemap.xml`, na tabela do `README.md` e na lista `PAGES` do
`build_og.py`; o `og:image` de cada página aponta para arquivo que existe; todo `<script src>`
existe; todo `validation/check_*.js` está na linha `bateria:` e no workflow); a linha
`bateria:` e o workflow com os dois checks novos; `validation/README.md` reescrito para os pares
`reference_*.py`/`check_*.js`; no `index.html` e no `README.md`, "five calculators" corrigido (a
Tool 5 é explicador) e o absoluto "none of them" trocado por uma frase que a pesquisa sustenta
(o ABTestGuide checa SRM sozinho); a meta tag `google-site-verification` no `index.html`, se
ainda não estiver lá.
**verificar:**

1. a bateria: 9 passou, 0 falhou (as 7 de hoje + `check_judgement` + `check_site`);
2. sabotagem, com `;` e não `&&`: mudar um número numa frase de `assets/judgement.js` faz
   `node validation/check_judgement.js` sair ≠ 0; tirar uma ferramenta do `sitemap.xml` faz
   `node validation/check_site.js` sair ≠ 0; o sha256 dos dois arquivos restaurados bate com o
   de antes;
3. `/run`: o texto das cinco páginas de ferramenta nos defaults (`get_page_text`), capturado
   **antes** de editar, é idêntico ao de depois;
4. `grep -c google-site-verification index.html` devolve 1;
5. a prosa nova (o `validation/README.md` e as frases do index e do README) passou pela
   `humanize`, com o `conferir.py` saindo 0.

**prompt de abertura:**

> Você é quem tira a frase de julgamento de dentro do HTML e a põe sob teste, sem mudar uma
> palavra do que as ferramentas dizem. Primeiro, peça ao Igor o token do Search Console (ele cria
> a propriedade de prefixo de URL `https://igorlima-py.github.io/experiment-calculators/`) e
> capture o texto das cinco páginas de ferramenta nos defaults, antes de editar qualquer coisa.
> Leia os `render` inline das cinco páginas, o `docs/HOW-THIS-WAS-BUILT.md:73-79` e o padrão de
> `validation/check_tool1.js`. Entregue `assets/judgement.js` com uma função pura por
> ferramenta, `validation/check_judgement.js` com casos em tabela, e `validation/check_site.js`,
> que garante que toda ferramenta está no nav, no index, no 404, no sitemap, no README e no
> `build_og.py`, e que todo check está na linha `bateria:` e no CI. Corrija as duas frases falsas
> do index e do README ("five calculators" e "none of them") e reescreva o `validation/README.md`,
> passando a prosa pela `humanize`. Pronto quando: bateria 9/0/0, as duas sabotagens falham e
> os arquivos restaurados batem no sha256, o texto das cinco ferramentas é idêntico antes e
> depois, e a meta tag está no `index.html`.

### C2 — leitura do teste

`dificil` · opus · high · forma: sessao · máquina: qualquer · plan mode: sim · contexto: limpo antes

**persona:** estatístico que escreve a leitura de resultado que ninguém faz de graça: o número,
o intervalo, e o que invalida os dois.
**entra:** o bloco 5 deste roadmap; `assets/experiments.js`, `assets/stats.js`,
`assets/judgement.js`, `assets/ui.js`; `tools/sample-size.html` (o molde de página);
`validation/reference_tool1.py` + `check_tool1.js` (o molde de validação);
`validation/RESULTS.md`, `validation/build_page.py`; `assets/build_og.py`;
`docs/REFERENCES.md` §1 (o SRM checker do Lukas Vermeer e o ABTestGuide).
**sai:** `tools/readout.html`; `assets/readout.js`; a função da frase em `assets/judgement.js` e
os casos no `check_judgement.js`; `validation/reference_tool6.py` + `reference_tool6.json` +
`check_tool6.js`; seção nova no `validation/RESULTS.md` e `validation/index.html` regerado; o
passo no workflow e o check na linha `bateria:`; a ferramenta no nav, `index.html`, `404.html`,
`sitemap.xml`, `README.md` e na lista `PAGES` do `build_og.py`; `assets/og/readout.png`; na
Tool 1, o link "read your result" levando o efeito planejado para a leitura.
**verificar:**

1. a bateria: 10 passou, 0 falhou;
2. `check_tool6.js` compara contra `statsmodels` (`proportions_ztest`,
   `confint_proportions_2indep`) e `scipy.stats.chisquare` com `f_exp` do split planejado, e o
   erro tipo M contra a forma fechada de Gelman & Carlin (2014) e um Monte Carlo em numpy; as
   tolerâncias estão no `RESULTS.md` com a origem;
3. `python validation/build_page.py --check` e `node validation/check_site.js` saem 0;
4. `/run`: a página abre nos defaults com lift, IC e p; a URL com split planejado 50/50 e
   10000 × 10800 usuários mostra o veredito de SRM **no lugar** do lift; a URL com split
   planejado 90/10 e observado 90/10 **não** acusa SRM; uma URL de teste com pouco poder mostra
   a razão de exagero igual à do `reference_tool6.json`;
5. a prosa da página passou pela `humanize`, com o `conferir.py` saindo 0.

**prompt de abertura:**

> Você é o estatístico que escreve a leitura de resultado com julgamento. Antes de tudo, confira
> o stack de referência (`python -c "import scipy, statsmodels"`); se faltar, rode
> `python -m pip install -r requirements-dev.txt`. A ferramenta recebe usuários e conversões de
> cada braço, o split planejado (50/50 por padrão, omitido da URL) e o alfa, e devolve lift
> absoluto e relativo com IC, p-valor e a frase de julgamento. Três regras de produto: (1) o SRM
> é checado **antes**, contra o split planejado — com SRM, a página não lê o lift e diz por quê;
> (2) o erro tipo M (Gelman & Carlin 2014) usa um efeito que vem de fora — o MDE planejado, que
> a Tool 1 passa por link, ou um valor digitado —, **nunca** o lift observado, que viraria poder
> post-hoc; (3) toda frase mora em `assets/judgement.js`, com caso no `check_judgement.js`.
> Decida no plan mode, com fonte: o método do IC (Wald × Newcombe; publique os dois se
> divergirem), o limiar de SRM (cite de onde vem) e os nomes dos parâmetros de URL. Pronto
> quando: bateria 10/0/0, `build_page.py --check` e `check_site.js` saindo 0, a URL de SRM
> mostrando o veredito no lugar do lift e a de 90/10 não acusando SRM.

### C3a — leitura do teste geo

`dificil` · opus · high · forma: sessao · máquina: qualquer · plan mode: sim · contexto: limpo antes

**persona:** quem fecha o ciclo da Tool 4: o teste foi desenhado aqui, agora é lido aqui, com o
mesmo modelo.
**entra:** `assets/geo.js` (o parser de "cole seus dados" e o modelo da Tool 4);
`tools/geo-holdout.html`; `validation/reference_tool4.py` + `check_tool4.js`;
`docs/REFERENCES.md` §5 (geo); `assets/judgement.js`; `validation/RESULTS.md`;
`assets/build_og.py`.
**sai:** `tools/geo-readout.html`; `assets/geo-readout.js` (ou extensão do `geo.js`); a função
da frase e os casos; `validation/reference_tool7.py` + `reference_tool7.json` +
`check_tool7.js`; seção no `RESULTS.md` e página de validação regerada; o passo no workflow e o
check na linha `bateria:`; a ferramenta no nav, index, 404, sitemap, README e `PAGES`;
`assets/og/geo-readout.png`; link de ida e volta entre `geo-holdout.html` e `geo-readout.html`.
**verificar:**

1. a bateria: 11 passou, 0 falhou;
2. `check_tool7.js`: estimativa, erro-padrão e IC da receita incremental batem com `statsmodels`
   OLS (`post ~ treat + pre`, geos como unidades) em pelo menos 3 conjuntos sintéticos gerados
   com semente fixa no `reference_tool7.py`; o iROAS é incremental ÷ investimento, com o IC
   escalado;
3. `python validation/build_page.py --check` e `node validation/check_site.js` saem 0;
4. `/run`: colar os dados de exemplo da página devolve iROAS e IC iguais aos do
   `reference_tool7.json`; os links entre a Tool 4 e a leitura geo funcionam nos dois sentidos;
5. a prosa da página passou pela `humanize`, com o `conferir.py` saindo 0.

**prompt de abertura:**

> Você fecha o ciclo da Tool 4: o teste geo foi desenhado aqui, agora é lido aqui, com o mesmo
> modelo — geos como unidades, pré-período como covariável. Entrada: uma linha por geo (grupo,
> pré, pós), colada, reaproveitando o parser do `assets/geo.js`, e o investimento. Saída:
> receita incremental com IC, iROAS com IC, e a frase de julgamento (spillover, pré-período
> instável, poucos geos). Decida no plan mode o estimador — ANCOVA por OLS é o candidato, por ser
> o que a Tool 4 assume ao ajustar o CV pelo pré-período — e escreva a escolha no honesty box
> junto com o que ele não cobre: GeoLift e synthetic control continuam sendo o método melhor, e
> a página diz isso. Valide contra `statsmodels` OLS. Pronto quando: bateria 11/0/0,
> `build_page.py --check` e `check_site.js` saindo 0, e os dados de exemplo colados devolvendo
> o que o `reference_tool7.json` diz.

### C3b — do teste geo ao prior do MMM

`dificil` · opus · high · forma: sessao · máquina: qualquer · plan mode: não · contexto: limpo antes

**persona:** quem liga o experimento ao modelo de mix: o número que o teste geo mediu vira o
prior que o MMM vai usar, sem inventar nada que o teste não mediu.
**entra:** `tools/geo-readout.html` e o código dela (da C3a); a doc de priors e calibração do
Meridian (https://developers.google.com/meridian/docs/advanced-modeling/roi-priors-and-calibration)
e a do `calibration_input` do Robyn, lidas na sessão; o artigo público do Igor,
https://github.com/IgorLima-py/mmm-meridian-vs-robyn/blob/main/article/meridian-vs-robyn.md
(só para linkar).
**sai:** a seção "hand it to your MMM" na `geo-readout.html`: os parâmetros do prior LogNormal
do ROI no Meridian (casamento de momentos a partir do iROAS e do seu erro-padrão) e a linha de
`calibration_input` do Robyn, cada um com a tag de release da biblioteca e o link da doc; o
campo "valor por conversão" quando a métrica não é receita, ecoado no honesty box numa frase
fixa; a função da frase e os casos; casos de casamento de momentos no `reference_tool7.py` e no
`check_tool7.js` (ou um par próprio, e aí na `bateria:` e no CI); a mesma tag de release no
`RESULTS.md`; link para o artigo de MMM na leitura geo e no `index.html`.
**verificar:**

1. a bateria sem falha, com o número de passou igual ao número de suítes na linha `bateria:`;
2. o check compara μ e σ contra `scipy.stats.lognorm(s=σ, scale=exp(μ))` — `.mean()` e `.std()`
   batendo com o iROAS e o erro-padrão de entrada — dentro da tolerância publicada no
   `RESULTS.md`;
3. `curl -s -o /dev/null -w "%{http_code}"` na doc do Meridian, na doc do Robyn e no artigo
   devolve 200; a tag de release de cada biblioteca é a mesma na página e no `RESULTS.md`
   (`grep` nos dois);
4. `/run`: com os dados de exemplo, a seção mostra μ, σ e a linha do Robyn; com a métrica em
   conversões, o texto da página contém a frase fixa com o valor por conversão digitado (caso
   no `check_judgement.js`);
5. a prosa da seção passou pela `humanize`, com o `conferir.py` saindo 0.

**prompt de abertura:**

> Você liga o teste geo ao MMM. O iROAS e o erro-padrão que a leitura geo (C3a) calcula viram
> (1) o prior LogNormal do ROI no Meridian, por casamento de momentos, e (2) a linha de
> `calibration_input` do Robyn. Leia a doc atual das duas bibliotecas antes de escrever uma
> linha: a API de calibração muda entre versões, então a página e o `RESULTS.md` escrevem a
> mesma tag de release e o link. A armadilha: lift em conversões não vira ROI sem valor por
> conversão — a página pede esse número e diz, numa frase fixa, que ele é do usuário e não do
> teste. O artigo de MMM do Igor é público e diz que MMM é o que se calibra com teste desse
> tipo: linke a partir desta seção e do `index.html`. O projeto irmão de geo tem saída própria de
> prior e ainda é privado: não linke nem copie nada de lá; quando ele ficar público, é ele que
> linka para cá, e o `RESULTS.md` daqui é a referência da fórmula. Pronto quando: bateria
> verde, o `scipy.stats.lognorm` confirmando o casamento de momentos, as três URLs em 200 e a
> seção renderizada com os dados de exemplo.

### C4a — métrica contínua

`dificil` · opus · high · forma: sessao · máquina: qualquer · plan mode: sim · contexto: limpo antes

**persona:** quem leva a suíte além da taxa de conversão: receita por usuário e ticket médio,
planejados e lidos com o mesmo rigor.
**entra:** `assets/experiments.js`, `assets/stats.js` (a t não-central já existe);
`tools/sample-size.html`, `tools/mde.html`, `tools/readout.html`; `assets/judgement.js`;
`validation/reference_tool1.py`, `reference_tool2.py`, `reference_tool6.py` e os checks;
`tools/cuped.html` (a lista de equívocos sobre receita e delta method).
**sai:** um seletor de tipo de métrica (conversão | média) nas Tools 1 e 2 e na leitura, com
conversão como default omitido da URL — todo link antigo abre igual; as fórmulas de média com
desvio-padrão; as frases de julgamento de média e os casos; os casos novos em arquivos JSON
próprios (`reference_tool1_mean.json` e afins), com os checks estendidos; a seção no
`RESULTS.md` e a página de validação regerada.
**verificar:**

1. a bateria sem falha, e `git diff --quiet -- validation/reference_tool1.json
   validation/reference_tool2.json validation/reference_tool6.json` sai 0 (nenhum valor antigo
   mudou);
2. média: tamanho de amostra e MDE batem com `statsmodels` `TTestIndPower`; a leitura bate com
   `scipy.stats.ttest_ind_from_stats(equal_var=False)` (Welch);
3. `python validation/build_page.py --check` e `node validation/check_site.js` saem 0;
4. `/run`: `sample-size.html` sem parâmetros mostra o mesmo n anotado no começo da sessão; com o
   parâmetro de média, mostra n, e o link copiado reabre igual;
5. a prosa nova passou pela `humanize`, com o `conferir.py` saindo 0.

**prompt de abertura:**

> Você leva a suíte além da taxa de conversão. As Tools 1 e 2 e a leitura do teste ganham o
> tipo de métrica "média" (receita por usuário, ticket médio), com média e desvio-padrão como
> entrada. Planejamento contra `statsmodels` `TTestIndPower` (a t não-central já existe em
> `assets/stats.js`); leitura por Welch contra `scipy.stats.ttest_ind_from_stats`. Regra de
> compatibilidade: conversão continua o default e é omitida da URL, então todo link já
> compartilhado abre igual — anote o n dos defaults antes de mexer, ponha os casos novos em
> arquivos JSON próprios e prove com `git diff --quiet` nos antigos. A frase de julgamento de
> média fala do que invalida teste de receita: cauda longa, outlier, e unidade de análise
> diferente da de randomização (a página do CUPED já explica; linke). Decida no plan mode os
> nomes dos parâmetros e onde o seletor mora na página. Pronto quando: bateria verde com os JSON
> antigos intactos, os dois cruzamentos de referência passando, e `sample-size.html` sem
> parâmetros igual a antes.

### C4b — split desigual, A/B/n e CUPED no tamanho de amostra

`dificil` · opus · high · forma: sessao · máquina: qualquer · plan mode: não · contexto: limpo antes

**persona:** quem faz o tamanho de amostra aguentar o teste de verdade: split 90/10, três ou
mais braços, e a redução de variância que o CUPED compra.
**entra:** `assets/experiments.js`; `tools/sample-size.html`, `tools/mde.html`,
`tools/readout.html`, `tools/cuped.html`; `assets/judgement.js`; `validation/reference_tool1.py`,
`reference_tool2.py`, `reference_tool6.py` e os checks.
**sai:** nas Tools 1 e 2, os parâmetros de proporção de alocação, número de braços (Bonferroni
sobre as comparações contra o controle) e ρ do CUPED, todos omitidos da URL no default; na
leitura, o número de braços, lendo cada comparação a α ÷ (braços − 1); na `cuped.html`, o link
que leva o ρ do slider para a Tool 1; as frases e os casos; os casos novos em arquivos JSON
próprios; a seção no `RESULTS.md` e a página de validação regerada.
**verificar:**

1. a bateria sem falha, e `git diff --quiet` nos `reference_*.json` que existiam antes da fatia
   sai 0;
2. nas Tools 1 e 2: o split desigual bate com o `ratio=` do `statsmodels` (proporções e
   médias); com braços, n e MDE batem com o `statsmodels` rodado em α ÷ (braços − 1); com ρ,
   batem com o `statsmodels` rodado com a variância × (1 − ρ²);
3. `python validation/build_page.py --check` e `node validation/check_site.js` saem 0;
4. `/run`: na `cuped.html`, o link com ρ = 0,6 abre a Tool 1 com `rho=0.6` na URL e n igual ao
   de sem ρ × 0,64;
5. a prosa nova passou pela `humanize`, com o `conferir.py` saindo 0.

**prompt de abertura:**

> Você faz o tamanho de amostra aguentar o teste de verdade. Três parâmetros nas Tools 1 e 2,
> todos omitidos da URL no default para não quebrar link antigo: proporção de alocação (o
> `ratio` do `statsmodels`), número de braços (Bonferroni sobre as comparações contra o
> controle — escreva no honesty box que Dunnett é menos conservador e por que ficou de fora) e o
> ρ do CUPED (variância × (1 − ρ²)). A leitura do teste ganha o número de braços, para não
> desfazer na leitura o Bonferroni do planejamento. Na página do CUPED, o slider ganha um link
> que leva o ρ para a Tool 1: a página ensinava e não aplicava. Casos novos em arquivos JSON
> próprios; valide contra `statsmodels`. Pronto quando: bateria verde com os JSON antigos
> intactos, os três cruzamentos passando nas duas ferramentas, e o link da página do CUPED
> abrindo a Tool 1 com o ρ.

### C5a — sistema visual e landing

`dificil` · opus · high · forma: sessao · máquina: Karen · plan mode: sim · contexto: limpo antes

**persona:** diretor de design que sabe que isto é uma ferramenta: identidade própria, sem
enfeite que custe velocidade ou confiança.
**entra:** `~/.claude/skills/impeccable/` (v4.3.1, a cópia a trazer para o projeto);
`assets/style.css` (os 13 tokens em `style.css:9-42`); `index.html`; `404.html`;
`assets/favicon.svg`; `assets/build_og.py`; `BRIEF.md:114` ("Don't gold-plate") e o bloco 5
(que o relaxa); `README.md` (a promessa "no dependencies, no tracking").
**sai:** o impeccable instalado em `.claude/skills/impeccable/`, sem o plugin, com `LICENSE` e
`NOTICE.md` do upstream (github.com/pbakaus/impeccable), marcado `linguist-vendored` no
`.gitattributes` e com `git check-ignore -v` vazio; `PRODUCT.md` (inclui "utility, loads
instantly") e `DESIGN.md` (inclui a lista fechada dos pares texto/fundo); `assets/style.css`
reescrito sobre tokens novos (cor, tipo, espaço), claro e escuro; `index.html` e `404.html`
redesenhados; `assets/favicon.svg` no sistema; fonte, se houver, auto-hospedada em `assets/`;
`assets/build_og.py` usando a fonte do repositório (fim da dependência do Segoe UI) e as
`assets/og/*.png` regeradas de uma vez.
**verificar:**

1. `read_network_requests` no `index.html`: zero requisição fora da própria origem;
2. contraste ≥ 4,5:1 (WCAG 2.x, SC 1.4.3) em cada par texto/fundo listado no `DESIGN.md`, no
   claro e no escuro (`resize_window` com `colorScheme`), medido por script;
3. a 375 px, `scrollWidth ≤ clientWidth` no `index.html` e no `404.html`;
4. o peso do `index.html` — a soma do que o browser baixa da própria origem, por
   `read_network_requests` — fica ≤ a base medida pelo mesmo método no começo da sessão + 100 KB
   (referência de 27/09, só HTML+CSS+JS+SVG sem compressão: 17,0 KB);
5. `/run`: screenshots do `index.html` em 375 e 1280 px, claro e escuro, anexados no
   `STATUS.md`;
6. a bateria sem falha e `python validation/build_page.py --check` saindo 0;
7. a prosa nova da landing passou pela `humanize`, com o `conferir.py` saindo 0.

**prompt de abertura:**

> Você é o diretor de design de uma ferramenta: identidade própria, sem enfeite que custe
> velocidade ou confiança. Primeiro, instale o impeccable no projeto: copie
> `~/.claude/skills/impeccable/` para `.claude/skills/impeccable/` sem o plugin, baixe `LICENSE`
> e `NOTICE.md` do github.com/pbakaus/impeccable, marque a pasta como `linguist-vendored` no
> `.gitattributes`, confira `git check-ignore -v` e faça um commit só dela. Meça o peso do
> `index.html` antes de mexer. Deixe o painel do browser visível: com ele oculto, o screenshot
> volta em branco. Depois, no plan mode e com o Igor, escreva `PRODUCT.md` e `DESIGN.md` —
> público (analista no celular numa reunião, e quem contrata), tom, a lista dos pares de cor, e
> as três restrições que não se negociam: nenhuma requisição a outro domínio (fonte
> auto-hospedada ou pilha do sistema), nenhum framework ou build step, e o número mais a frase de
> julgamento continuam sendo o centro da página. Então reescreva os tokens do
> `assets/style.css`, redesenhe o `index.html` e o `404.html`, e faça o `assets/build_og.py` usar
> a fonte do repo e regerar as imagens de uma vez. As páginas das ferramentas são a C5b: aqui,
> só o sistema e a landing. Pronto quando: zero requisição fora da origem, contraste ≥ 4,5:1 nos
> dois temas, nenhum overflow a 375 px, o peso dentro do teto, e os screenshots anexados.

### C5b — as ferramentas no sistema novo

`padrao` · sonnet · medium · forma: sessao · máquina: Karen · plan mode: não · contexto: limpo antes

**persona:** quem aplica um sistema de design pronto a sete páginas sem reinventá-lo em nenhuma.
**entra:** `DESIGN.md`, `PRODUCT.md`, `assets/style.css` (da C5a); `tools/*.html`;
`validation/index.html` e `validation/build_page.py`; os gráficos SVG montados em JS com
geometria fixa (`tools/geo-holdout.html:216`, `tools/cuped.html`); a simulação do peeking (hoje
só aparece depois de um clique); a skill `.claude/skills/impeccable/`.
**sai:** as sete ferramentas e a página de validação no sistema novo; gráficos lendo os tokens e
cabendo no contêiner; o padrão de página igual nas sete (entrada → resultado → frase → honesty
box → validação → rodapé), com a Tool 5 marcada como explicador; legendas do "Copy link"
iguais; a simulação do peeking mostrando uma estimativa sem clique.
**verificar:**

1. `grep -E "#[0-9a-fA-F]{3,6}\b|rgba?\(|hsla?\(" tools/*.html assets/*.js` vazio (cor só
   por token);
2. a 375 px, em cada uma das sete páginas e na de validação: `scrollWidth ≤ clientWidth`, e
   nenhum controle interativo menor que 24 × 24 px (critério mais rígido que o WCAG 2.2 SC
   2.5.8, que tem exceções);
3. `read_network_requests`: zero requisição fora da origem em todas as páginas;
4. `peeking.html` mostra uma estimativa numérica da simulação em até 5 s depois de abrir, sem
   nenhum clique;
5. o peso de cada página fica ≤ a base medida no começo da sessão + 100 KB, pelo método da C5a;
6. `/run`: screenshots de cada página em 375 e 1280 px, claro e escuro, anexados no `STATUS.md`;
7. a bateria sem falha, `python validation/build_page.py --check` e
   `node validation/check_site.js` saindo 0.

**prompt de abertura:**

> Você aplica o sistema do `DESIGN.md` às sete ferramentas e à página de validação, sem
> reinventá-lo em nenhuma. Meça o peso de cada página antes de mexer e deixe o painel do browser
> visível. Os gráficos são SVG montado em JS com geometria fixa: faça-os ler os tokens e caber
> no contêiner. Uniformize o padrão de página e marque a Tool 5 como explicador. A simulação do
> peeking é a prova visual do site e hoje só aparece depois de um clique: ela tem de mostrar uma
> estimativa sozinha (uma rodada curta no worker basta; a de 200 mil continua no botão). Rode a
> crítica do impeccable em cada página antes de dar por pronta. Pronto quando: nenhuma cor fora
> de token, nenhum overflow nem alvo menor que 24 px a 375 px, zero requisição fora da origem, a
> simulação aparecendo sem clique, o peso dentro do teto e os screenshots anexados.

### C6 — lançamento

`padrao` · sonnet · medium · forma: sessao · máquina: qualquer · plan mode: não · contexto: limpo antes

**persona:** quem prepara a vitrine e entrega os rascunhos: o Igor publica.
**entra:** `README.md`, `index.html`, `sitemap.xml`, `docs/HOW-THIS-WAS-BUILT.md`;
`validation/check_site.js`; a skill `humanize`; o About do repositório
(`gh repo view --json description,homepageUrl,repositoryTopics`).
**sai:** `README.md` e `index.html` falando das sete ferramentas; JSON-LD (`WebApplication`) no
`index.html`, em cada `tools/*.html` e no `validation/index.html` (o `404.html` fica de fora);
`sitemap.xml` com o `lastmod` de cada página igual à data do último commit que a tocou, e o
`check_site.js` conferindo isso; o `HOW-THIS-WAS-BUILT` linkado a partir do site; o About do
GitHub em rascunho, se ainda estiver vazio (o Igor aplica); rascunhos de post (LinkedIn e mais
um canal que o Igor escolher) entregues por arquivo, **fora do repositório**; no `STATUS.md`, a
lista do que só o Igor faz: publicar os posts, aplicar o About, verificar a propriedade no
Search Console e enviar o sitemap, testar no celular (Safari), revisar o inglês.
**verificar:**

1. `grep -c "application/ld+json"` devolve 1 em cada um de `index.html`, `tools/*.html` e
   `validation/index.html`;
2. `node validation/check_site.js` sai 0 conferindo o `lastmod` de cada página contra
   `git log -1 --format=%cs -- <arquivo>`;
3. `grep -c HOW-THIS-WAS-BUILT index.html` devolve ≥ 1;
4. num validador de Open Graph sem login (opengraph.xyz ou metatags.io), para o `index.html` e
   duas ferramentas: `og:title` e `og:description` iguais aos da página, e o `og:image`
   respondendo 200 no `curl`; o screenshot vai no `STATUS.md`;
5. cada rascunho passou pelo `conferir.py` da `humanize`, com a entrada = `README.md` +
   `docs/HOW-THIS-WAS-BUILT.md`, saindo 0;
6. a bateria sem falha.

**prompt de abertura:**

> Você prepara a vitrine; o Igor publica. Atualize README e landing para as sete ferramentas,
> ponha JSON-LD em cada página publicada (menos o 404), dê a cada página do sitemap o `lastmod`
> do último commit que a tocou e estenda o `check_site.js` para conferir isso, e linke o
> `HOW-THIS-WAS-BUILT` a partir do site. Confira a prévia de link num validador de Open Graph
> sem login. Escreva pela `humanize`, como rascunho, o About do GitHub (se ainda estiver vazio)
> e os posts, e entregue os posts por arquivo, fora do repositório: post é do Igor, não do repo.
> No `STATUS.md`, a lista do que só ele faz. Pronto quando: JSON-LD nas páginas, `lastmod` por
> página conferido, prévia de link conferida com screenshot, e rascunhos com o `conferir.py`
> saindo 0.

---

## 4. Tabela de escape

Para quando o trabalho **não** é uma fatia, que é a maioria dos dias.

| O que se vai pedir | Perfil |
|---|---|
| mudar texto, cor, tamanho, uma palavra | `ajuste` |
| mudar o comportamento de algo que já funciona | `padrao` |
| um bug que se **consegue** reproduzir | `padrao` |
| um bug que aparece **às vezes** | `dificil` |
| **não sei descrever o problema direito** | `dificil` |
| mexer numa fórmula que a validação cobre | `dificil` |

A regra em uma linha: *«às vezes» e «não sei por quê» pedem mais esforço; o resto não.*

---

## 5. Decisões da entrevista

```
2026-09-27 | respondida | Destino da v2 | Visual próprio no lugar do tema genérico; leitura de teste terminado; toda ferramenta nova validada; ligação com o artigo de MMM; kit de lançamento em rascunho, o Igor publica | a fila tem 9 fatias
2026-09-27 | respondida | Profundidade da entrevista | Médio | uma rodada de 4 perguntas, mais uma aberta pelo refutador
2026-09-27 | respondida | Ferramentas novas | Leitura do teste; leitura geo + prior do MMM; Tools 1–2 com métrica contínua, split desigual, A/B/n e ρ do CUPED | C2, C3a, C3b, C4a, C4b
2026-09-27 | fora       | Efeito de cluster (ICC) no geo | nicho estreito; reabrir se alguém pedir | —
2026-09-27 | fora       | SRM, bayesiano e Holm/BH como ferramentas avulsas | saturados em ferramenta grátis (pesquisa de 27/09); o SRM entra embutido na leitura do teste | —
2026-09-27 | respondida | Visual antes ou depois das ferramentas | Ferramentas antes; o visual é uma passada só, depois | C5a depende de C3b e C4b
2026-09-27 | assumida   | O alicerce vem antes das ferramentas | C1 (frases testadas e guarda do site) primeiro | toda ferramenta nova nasce com teste de frase e guarda de nav, sitemap e bateria
2026-09-27 | respondida | Como o impeccable entra | Pasta no projeto, sem plugin, com LICENSE e NOTICE.md do upstream, linguist-vendored | a C5a instala
2026-09-27 | respondida | Quando o impeccable entra | No começo da C5a | nada instalado antes; as C1–C4b não carregam a skill
2026-09-27 | respondida | Medir uso | Search Console por meta tag, sem script | meta tag na C1; o "no tracking" do README continua verdade
2026-09-27 | fora       | Contador de visitas ou analytics com script | contradiz o "no tracking" do README | —
2026-09-27 | fora       | React, framework, build step, backend | stack travada no CLAUDE.md | —
2026-09-27 | respondida | Onde mora a conta do prior do MMM | Nos dois projetos, com papéis diferentes: aqui a calculadora geral para o teste de qualquer um; o projeto irmão de geo gera o próprio arquivo e linka para cá quando for público | a C3b calcula o prior; o RESULTS.md daqui é a referência da fórmula
2026-09-27 | assumida   | O destino relaxa o "Don't gold-plate" do BRIEF.md:114 | Visual próprio, mas utilitário que carrega na hora | o PRODUCT.md diz isso; teto de peso no verificar da C5a e da C5b
2026-09-27 | assumida   | Teto de peso por página | Base medida no começo da fatia + 100 KB | C5a e C5b falham acima disso
2026-09-27 | assumida   | Nenhuma requisição a outro domínio no site publicado | Fonte auto-hospedada ou pilha do sistema | regra no CLAUDE.md; restringe C5a e C5b
2026-09-27 | assumida   | Onde roda o visual | Karen: o screenshot precisa do painel do browser visível, e a nuvem não tem painel | C5a e C5b com máquina: Karen
2026-09-27 | assumida   | De onde vem o efeito do erro tipo M | MDE planejado (link da Tool 1) ou digitado, nunca o lift observado | C2
2026-09-27 | assumida   | Posts e About do GitHub | Rascunho entregue ao Igor, posts fora do repositório; ele publica e aplica | C6
```
