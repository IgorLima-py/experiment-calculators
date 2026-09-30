# Status

*Atualizado em 2026-09-29: C3a fechada. Próxima fatia: C3b.*

## 29/09/2026 (madrugada): C3a — leitura do teste geo

**Bateria:** `bateria 60: 60/0/0`, rodada pelo subagente no `/tchau` pela trava. O subagente
conta 60 testes; na sessão, os 11 checks da linha `bateria:`, rodados um por um, deram 11/0/0.

**Decisões do Igor no plan mode:**
1. **Estimador:** OLS clássico, `post ~ treat + pre`, EP homocedástico e t com n−3 gl. É o
   mesmo modelo que a Tool 4 assume no (1−ρ²). O HC1 e o WLS 1/pré (o GBR de Vaver & Koehler)
   saem só no `RESULTS.md`, como comparação.
2. **Dados colados no link:** vão no fragmento `#data=`, que o navegador não envia ao servidor.
   Investimento, α e ρ ficam na query.
3. **Link Tool 4 → leitura:** leva `alpha` e o `rho` planejado. A frase compara o ρ realizado
   (correlação parcial dado o grupo) com o planejado, e é esse o ramo "pré-período instável",
   sem limiar inventado.

**O que foi feito:**

- **`assets/geo-readout.js` (`GeoReadout`):**
  - ANCOVA por OLS 3×3 com o pré centrado, por Gauss-Jordan com pivô;
  - `b`, EP, t e p por `Stats.tCdf`, IC por `Stats.tQuantile(1−α/2, n−3)`;
  - incremental = b·nT e iROAS = incremental ÷ investimento, com os ICs escalados;
  - lift relativo só pontual; ρ within-group; CV do pré; `noiseFactor` contra o ρ planejado.
- **`assets/geo.js`:**
  - a tokenização da Tool 4 virou `tokens()`, e o `check_tool4` segue verde;
  - `Geo.parseGroups` lê `nome grupo pré pós`. O grupo é uma palavra de um vocabulário fechado
    (test/treatment/treated/t × control/holdout/h/c) e nunca um dígito;
  - uma linha não lida vira erro com o número da linha, e é o que acontece com "471,900".
- **`tools/geo-readout.html`:**
  - a textarea já vem com o exemplo (`reference_tool7.py`: 40 mercados, 10 no controle, os
    defaults da Tool 4), com investimento 44000 e α 10;
  - resultados: iROAS com IC, incremental com IC, p, lift, divisão e ρ;
  - avisos de holdout < 5 e geos < 10, com os mesmos limiares da Tool 4;
  - caixa de honestidade com o porquê do OLS, GeoLift/TBR como método melhor, spillover,
    receita ≠ lucro e o lift sem IC.
- **`Judgement.geoReadout`:** 7 ramos e 2 acréscimos, com o spillover em todos. São 11 casos
  novos, e o `check_judgement` tem 49.
- **Links nos dois sentidos, conferidos clicando:**
  - `geo-holdout.html?rho=0.7&alpha=5` leva a `geo-readout.html?alpha=5&rho=0.7`;
  - o link de volta leva a `geo-holdout.html?geos=40&holdout=10&cv=64.9&rho=0.99&alpha=5`.
- **`assets/ui.js`:** `write` preserva o `location.hash`, com uma linha. Nenhuma outra página
  usa hash.
- **`assets/style.css`:** `.fields textarea` em monoespaçada 0,8rem, e só a da leitura geo está
  dentro de `.fields`.
- **Validação:**
  - `reference_tool7.py` + JSON + `check_tool7.js`, com 5 conjuntos contra o OLS do statsmodels;
  - pior erro de 7,9e-12, com tolerância 1e-9;
  - o check exige que a textarea da página seja idêntica ao exemplo do JSON e confere os
    defaults de investimento e α;
  - segura também a frase da caixa de honestidade sobre o WLS ("from 19% above … to 69% below
    it", sempre dentro do IC).
- **`RESULTS.md` Phase 7:**
  - as tabelas de leitura e OLS × HC1 × WLS × diferença de médias;
  - a coluna 1/√(1−ρ²), que é a previsão da Tool 4 e bate com o realizado (16,8× contra
    17,2×). A exceção é o conjunto desbalanceado (7× contra 12×): o desequilíbrio no pré entra
    na variância da ANCOVA;
  - `validation/index.html` regerado.
- **Integração no site:**
  - nav das 8 páginas e do `build_page.py`, index, 404, sitemap, README, `PAGES`, workflow
    ("Geo test readout") e a linha `bateria:`, que agora tem 11 checks;
  - `og/geo-readout.png` é nova e a `home.png` foi regerada; as outras saíram idênticas;
  - "Five free calculators" virou "Six" no index ×3, no README e no `build_og.py`.
- **Prosa:** passou pela `humanize`, com o `conferir.py` saindo 0. Saíram dois fechos que
  repetiam o título e um "revenue, not profit".
- **Sabotagem com `;`:** gl n−2 e control→treat no parser fazem o `check_tool7` sair 1; o
  limiar da frase faz o `check_judgement` sair 1. O sha256 dos restaurados bate.

**O que foi tentado e falhou:**

- **Sabotar tirando o centramento do pré não quebra nada.** Sem centrar o erro é 7,1e-12, e
  com centramento 7,0e-12. O comentário que eu tinha escrito atribuía o erro ao condicionamento;
  era chute e foi corrigido. O centramento fica como seguro barato, e o `RESULTS.md` diz que o
  check não distingue os dois casos.
- **O RESULTS dizia que todo IC continha o iROAS verdadeiro.** O de 80% do "biggest markets
  held out" não contém (2,0 contra 2,12 a 7,00). Corrigido antes do commit.
- **Subtítulo da OG cortado na 3ª linha.** Foi encurtado.
- **O `preview_start` recusou a porta 8000,** porque outro chat tem um `serve.py` de pé nesta
  máquina. O contorno foi `preview_start` com `url` para `http://localhost:8000`, que serve a
  mesma pasta.
- **Depois de rolar, o screenshot do painel voltou uma imagem velha**, a armadilha de sempre. O
  layout a 375 px foi medido pelo DOM (`scrollWidth` 375, nenhum elemento passando da borda).
- **Eu comecei um comando com `cd`,** contra a regra. Não foi negado, mas não repita.

**Riscos que ficaram abertos:**

- O CI regenera o `reference_tool7.json`, e o `check_tool7` exige a textarea igual ao
  `example_text`. Localmente a regeneração deu idêntica. Noutro SO, um arredondamento no limite
  (x,5 do lognormal) poderia mudar um dígito e quebrar o CI. Não medi isso; se quebrar, é aí.
- A leitura mostra o EP do incremental, mas não expõe o EP do iROAS como número. A C3b vai
  precisar dele (é `se·nT/spend`, já em `r.fit.se` e `r.nTreat`).

**Segunda opinião:** o subagente Opus, com contexto limpo e o diff desde `fefae9b`, não achou
nada. Ele rodou de novo o `check_tool7`, o `check_judgement` e o `check_site`. Fez uma
observação que não conta como achado: apagar o campo de investimento faz a conta voltar ao
default 44000, e não a 0 (o campo volta a mostrar 44000 ao perder o foco). É o padrão de campo
vazio das outras páginas; fica como está.

**O que só o Igor faz:**

- **About do GitHub:** agora são seis calculadoras. Revisado com a mesma frase do README:

  ```bash
  gh repo edit IgorLima-py/experiment-calculators --description "Six free calculators and an interactive explainer for people who run A/B tests and marketing experiments. Every result comes with one plain sentence on what it means and what would invalidate it."
  ```

- **Sitemap no Search Console:** agora com a `geo-readout.html`. A submissão continua marcada
  para a C6.

**Próximo passo concreto:** abrir a **C3b — do teste geo ao prior do MMM** numa sessão nova, em
opus/high e sem plan mode. O prompt de abertura está no `docs/ROADMAP.md`. Comece lendo a doc
atual de calibração do Meridian e do Robyn, porque a API muda entre versões.

## 29/09/2026 (noite): C2 — leitura do teste

**Bateria:** `bateria 49: 49/0/0`, rodada pelo subagente no `/tchau` e marcada verde pela
trava para o código `204bcf0a255d`. O subagente conta 49 testes; na sessão, os 10 checks da
linha `bateria:`, rodados um por um, deram 10/0/0. A segunda opinião (subagente Opus, contexto limpo,
diff desde `6842222`) achou duas lacunas, e as duas foram consertadas antes do push:
(1) as tolerâncias do `check_tool6` (1e-12 e 4 EP) não estavam no `RESULTS.md` com a origem;
agora há "What the tolerances mean" na Phase 6. (2) O link da Tool 1 ignorava o plano
unicaudal: um plano unicaudal a α chegava à leitura como bicaudal a α, com menos poder do que o
plano tinha. Agora passa `alpha = 2α`, a mesma região de rejeição na direção planejada, com teto
de 50. Conferido no browser: `?tails=1` → `readout.html?mde=10&alpha=10`.

**O que foi feito:**

- **`tools/readout.html` + `assets/readout.js`:** a leitura de um teste A/B de conversão, com
  dois braços. A ordem é a da leitura:
  1. SRM primeiro: qui-quadrado contra o split planejado, sem correção de continuidade, p < 0,001.
     Com SRM, as células de resultado ficam `--` e a frase diz por quê;
  2. lift absoluto e relativo;
  3. IC de Newcombe na diferença e IC log (Katz) no lift relativo;
  4. p do z combinado;
  5. erro tipo M pela forma fechada de Lu, Qiu & Deng (2019). O efeito é sempre o MDE
     planejado, aplicado à taxa observada do controle, e nunca o lift observado.
- **Parâmetros de URL:** `na`, `ca`, `nb`, `cb`, `split` (default 50), `alpha` (default 5) e
  `mde` (vazio por padrão, decisão do Igor). Só bicaudal, também decisão do Igor.
- **`Judgement.readout`** com 7 ramos: SRM, na beirada (p e IC discordam), significativo com
  poder, significativo com poder < 50% (exagero), significativo sem MDE, inconclusivo com MDE e
  inconclusivo sem MDE. São 14 casos novos no `check_judgement.js`, que agora tem 38.
- **`reference_tool6.py` + `check_tool6.js`:**
  - compara contra `proportions_ztest`, `confint_proportions_2indep` e `scipy.stats.chisquare`;
  - o tipo M é conferido contra a forma fechada em scipy, contra um Monte Carlo com 10⁶
    sorteios e contra o 1,12 e o 77 de Gelman & Carlin;
  - o check segura também a composição da página (o `analyse`) e o limiar de SRM;
  - pior erro: 2e-15; Monte Carlo a 2,1 EP.
- **Tool 1:** ganhou o link "Test finished? Read your result against this plan →", que leva
  `mde` relativo (converte de pp pela base) e `alpha`.
- **Integração no site:**
  - a ferramenta entrou no nav das 6 ferramentas e no do `build_page.py`, no index, no 404, no
    `sitemap.xml`, no README e no `PAGES`;
  - `og/readout.png` é nova; a `home.png` foi regerada, e as outras seis saíram idênticas byte a
    byte;
  - "Four free calculators" virou "Five" (index ×3, README, `build_og.py`).
- **`RESULTS.md` Phase 6:**
  - a tabela de limiares de SRM, com fontes;
  - Wald × Newcombe e log × log-adjusted, com o porquê da escolha;
  - o tipo M em grade;
  - o argumento de Hoenig & Heisey.
  - `validation/index.html` regerado. Workflow e linha `bateria:` com o `check_tool6.js`.
- **`assets/ui.js`:** `syncInputs` escreve `''` para valor `null`, que é o que viabiliza o
  campo opcional. O texto das outras 5 ferramentas nos defaults deu o mesmo hash antes e
  depois; na Tool 1, só depois de tirar o parágrafo do link novo.
- **Sabotagem com `;`:** mudar o limiar para 0,01, trocar Newcombe por Wald no `analyse` ou
  perturbar o limite de Newcombe faz o `check_tool6` sair 1. O sha256 do restaurado bate.
- **Prosa:** passou pela `humanize`, com o `conferir.py` saindo 0. Saíram quatro "X, not Y".
- **Stack de referência instalado nesta máquina (Karen-v2):** scipy 1.17.1, statsmodels 0.14.6,
  numpy 2.4.3 e Pillow 12.3.0.

**O que foi tentado e falhou:**

- **A primeira pesquisa em subagente (Sonnet) morreu no limite de sessão da conta** (429,
  "resets 9:40pm"). Na segunda tentativa entregou, depois de ~9 min.
- **Checar o 1,12 de Gelman & Carlin por arredondamento falhou:** a forma fechada dá 1,1252, e
  o número deles vem de simulação com 10⁴ sorteios. A regra virou "até uma unidade na última
  casa impressa".
- **A primeira versão do `check_tool6` não pegava a troca de Newcombe por Wald dentro do
  `analyse`,** porque testava as funções e não a composição. Só a frase fixada pegava.
  Corrigido.
- **O heredoc do bash quebrou de novo ao escrever a seção do RESULTS.md** (apóstrofos), como a
  armadilha abaixo já avisava. O arquivo não foi tocado; escrevi pela ferramenta de edição.
- **O screenshot em 375 px veio ladrilhado 2×2** (artefato do painel). O segundo, depois de
  rolar a página, veio normal. O DOM mediu `scrollWidth` 375 e nenhum overflow.

**Decisões com fonte (moram no `RESULTS.md` Phase 6 e na caixa de honestidade da página):**

- **Limiar de SRM:** 0,001, como Eppo, GrowthBook e o alerta do Statsig. A Microsoft usa 0,0005
  e o Vermeer usava 0,01. **Não** atribuir 0,001 ao livro do Kohavi: não foi verificado.
- **Aviso de exagero:** abaixo de 50% de poder, onde Gelman & Carlin dizem que o problema
  começa.

**O que só o Igor faz:**

- **About do GitHub:** ainda diz "Four free calculators". O rascunho, com a mesma frase do
  README:

  ```bash
  gh repo edit IgorLima-py/experiment-calculators --description "Five free calculators and an interactive explainer for people who run A/B tests and marketing experiments. Every result comes with one plain sentence on what it means and what would invalidate it."
  ```

- **Sitemap no Search Console:** o `sitemap.xml` agora tem a `readout.html`. A submissão
  continua marcada para a C6.

**Próximo passo concreto:** abrir a **C3a — leitura do teste geo** numa sessão nova, em
opus/high e com plan mode. O prompt de abertura está no `docs/ROADMAP.md`. O stack de
referência já está instalado nesta máquina.

## 29/09/2026: C1 — frases testadas e guarda do site

**Bateria:** `bateria 9: 9/0/0`, medida comando a comando no fim da sessão.
No `/tchau`, a trava deu verde para este código, e a segunda opinião (subagente
Opus, contexto limpo, diff desde `1f91afd`) não teve achado. O ponteiro avançou para a C2.

**O que foi feito:**

- **`assets/judgement.js`:** as frases de julgamento das cinco páginas saíram do HTML. Agora
  há uma função pura por ferramenta, que recebe números e devolve o HTML da frase. Nenhuma
  palavra mudou:
  - antes de editar, capturei 19 URLs (defaults e parâmetros que forçam cada ramo). O
    `innerText` e o HTML da `.judgement` deram o mesmo hash antes e depois, nas 19;
  - o Node reproduz as 19 frases byte a byte.
- **`validation/check_judgement.js`:** 24 casos.
  - Texto fixado nos defaults das cinco ferramentas.
  - Um caso por ramo, e os limites de 20%, 100% e spread 0,05.
  - O número de peeking da Tool 1 comparado com o do peeking checker a 1%, 5% e 10%.
- **`validation/check_site.js`:** 10 checagens.
  - Toda ferramenta no nav, na home, no 404, no sitemap, na tabela do README e no `PAGES` do
    `build_og.py`.
  - As imagens de prévia existem, e os 100 `src`/`href` locais resolvem.
  - Nada carrega de outro domínio (a regra do `CLAUDE.md`, que não estava na fatia).
  - Todo `check_*.js` está na linha `bateria:` e no workflow.
- **Os dois checks novos** entraram na linha `bateria:` e no workflow, no job `numerics`.
- **Sabotagem com `;`:** saem ≠ 0 e o sha256 dos restaurados bate, nos três casos:
  - trocar "55–80%" por "55–85%" faz o `check_judgement` sair com 1;
  - tirar o CUPED do `sitemap.xml` faz o `check_site` sair com 1;
  - recolocar o bug de agosto ("14.2%" fixo no Tool 1) quebra 5 dos 24 casos.
- **Frases falsas corrigidas, com a prosa passando pela `humanize` e o `conferir.py` saindo 0:**
  - "five calculators" virou "four free calculators and an interactive explainer" no index
    (3 meta), no README, no 404 e na `assets/og/home.png`. A imagem foi regerada, e as outras
    seis saíram idênticas byte a byte;
  - "none of them" virou "only a few warn you when it might be a lie", citando o ABTestGuide;
  - "fifty free calculators" não tinha origem (vinha da tese do `BRIEF.md`) e virou "There
    are free A/B test calculators everywhere".
- **`validation/README.md` reescrito:** documenta os pares `reference_*.py`/`check_*.js` e os
  dois checks novos, e diz que os `verify_*.py` ficam só como registro.
- **Search Console:** criei a propriedade de prefixo de URL
  `https://igorlima-py.github.io/experiment-calculators/` pelo Chrome do Igor. A meta tag está
  no `index.html` (`grep -c` = 1). **Ainda não verificada:** o Google só consegue verificar
  depois que a tag estiver no ar.
- O docstring de `reference_tool1.py` dizia "statsmodels 1.14.6"; agora diz 0.14.6.

**Fechado depois do handoff, na mesma sessão:**

- O Igor deu o push para a `main`. O Pages publicou, e a tag está no ar (`curl` + `grep -c` = 1).
- **Search Console verificado** pelo método Tag HTML, clicando pelo Chrome do Igor. O Google
  re-checa a tag, e tirá-la desfaz a verificação: o `check_site.js` ganhou a 11ª checagem para
  isso (sabotagem: sem a tag, sai 1).
- **About do GitHub atualizado** (`gh repo edit`): "Four free calculators for A/B tests and
  marketing experiments (...) and an interactive CUPED explainer". Topics e homepage já estavam.
- **A frase da Tool 2 com MDE de 1,5% não foi mudada.** A pesquisa mostrou que ela não está
  errada a 1,5%: o Qubit dá 90% dos efeitos abaixo de 1,2%. Ela só fica falsa abaixo de ~1%, e os
  cortes de 20% e 100% não têm fonte. As fontes medem receita, não conversão; o registro está na
  seção da C4a do `docs/ROADMAP.md`.
- Ainda não submetido: o `sitemap.xml` no Search Console. É um clique em Sitemaps e fica
  para a C6 (SEO).

**Armadilhas desta sessão:**

- O `innerWidth` dá 0 com o painel do browser oculto, e aí toda página "tem overflow".
  Emulando 375 px (`resize_window` mobile), a home não tem.
- Remover os `<script>` antes de medir o `textContent` deixa um `\n` por tag. Uma tag nova
  muda o hash sem mudar o texto: foram 3310 contra 3309 caracteres, exatamente o `\n`. Compare
  pelo `innerText` e pelo HTML da frase.
- O erro de `importScripts` do worker no console é de navegar para outra página no meio do
  carregamento, e fica no buffer entre navegações.

**Próximo passo concreto:** numa sessão nova em opus/high com plan
mode, a **C2 — leitura do teste**. O prompt de abertura está no `docs/ROADMAP.md`, e a primeira
coisa dele é conferir o scipy e o statsmodels: esta máquina não tinha os dois em 27/09.

## 27–29/09/2026: `/360` — a v2 tem roadmap

**Bateria:** `bateria 7: 7/0/0`, rodada na abertura de 27/09. Esta sessão não mexeu em
código (só `docs/` e `CLAUDE.md`), então não rodou de novo.

**O que foi feito:**

- **`docs/ROADMAP.md`**: 9 fatias, C1 → C6, cada uma com `sai:`, `verificar:` e prompt de
  abertura pronto; o bloco 5 guarda as 19 decisões da entrevista. **`docs/PROXIMO.md`**
  aponta a C1 (`dificil`, opus/high). **`docs/DESVIOS.md`** criado vazio.
- **`CLAUDE.md`**: regra nova, "zero requisição a outro domínio no site publicado"; a seção
  velha "A primeira sessão — planejamento" virou um ponteiro para o roadmap.
- **Pesquisa de 27/09** registrada em `docs/REFERENCES.md` §8 (concorrência de novo e
  candidatas a ferramenta).
- `AGENTS.md` apagado a pedido do Igor. Tinha aparecido sem commit em 28/09, cópia idêntica do
  `CLAUDE.md`, criado por alguma ferramenta que não é o Claude Code.

**A avaliação brutal (auditoria do código + olho no site publicado):**

- **Bom de verdade:** a matemática. Sete suítes, CI re-derivando tudo do scipy, três defeitos
  pegos e publicados. Peeking, poder geo e CUPED interativo seguem sem concorrente grátis.
- **Fraco:**
  1. a suíte só planeja, não lê resultado;
  2. a frase de julgamento (o produto) não tem teste, e já saiu errada uma vez;
  3. visual genérico: tema escuro estilo GitHub, landing sem imagem, e a simulação do peeking
     escondida atrás de um clique;
  4. só taxa de conversão, 50/50 e dois braços;
  5. a página do CUPED ensina e não aplica;
  6. ferramenta nova exige editar 5+ arquivos duplicados à mão;
  7. invisível: About vazio, e o `HOW-THIS-WAS-BUILT` não é linkado do site;
  8. duas frases falsas no index: "Five free calculators", sendo a Tool 5 explicador, e o
     absoluto "none of them".
- **O MMM se conecta:** o artigo público do `mmm-meridian-vs-robyn` diz que MMM é o que se
  calibra com teste geo; a ponte é a C3b.

**O que falhou, e por quê:**

- **Screenshot em branco** assim que o painel do browser ficou oculto (a armadilha de sempre).
  Com o painel visível, o site publicado fotografou normal: landing e peeking. As fatias
  visuais (C5a/C5b) ficaram presas à Karen por isso.
- **O arquivo de plano do plan mode foi negado:** o `/360` declara
  `disallowed-tools: Write`. O plano saiu no chat e foi aprovado pelo `ExitPlanMode`.
- **Um dos dois verificadores do passe adversarial morreu pelo limite semanal de uso**
  (reinicia 29/09, 11h), mas já tinha entregado o relatório inteiro antes. Nada se perdeu.

**Medições (para não refazer):**

- **Peso por página em 27/09**, HTML + CSS + JS + SVG da própria origem, sem compressão:
  index 17,0 KB · peeking 67,5 · geo-holdout 57,3 · cuped 66,3. É a referência do teto de
  +100 KB da C5a/C5b.
- **Upstream do impeccable:** `LICENSE` com 10.766 bytes e `NOTICE.md` com 503 bytes, no
  github.com/pbakaus/impeccable. A pasta local tem 2,2 MB (51 arquivos, v4.3.1).

**Preso a esta máquina (Karen-v2):**

- **Falta o stack de referência:** tem Python 3.14.3 e numpy, mas não tem **scipy nem
  statsmodels**. A bateria passa porque só roda os checks em Node contra os JSON commitados.
  Antes da C2: `python -m pip install -r requirements-dev.txt`.
- **O `gh` agora está instalado** (2.98.0). A nota antiga lá embaixo dizia que não.
- **O impeccable** está no nível de usuário (`~/.claude/skills/impeccable`), com o binário
  em `~/.impeccable/bin/0.1.5`. Ele entra no projeto só no começo da C5a.

**O que só o Igor faz:**

- **Search Console:** criar a propriedade de prefixo de URL
  `https://igorlima-py.github.io/experiment-calculators/` e ter o token de verificação em mãos
  para a C1.
- **About do GitHub:** continua vazio. O rascunho que passou pela `humanize` e o comando:

  ```bash
  gh repo edit IgorLima-py/experiment-calculators --description "Five free calculators for A/B tests and marketing experiments: sample size, minimum detectable effect, peeking, geo holdout and CUPED. Each result comes with one plain sentence on what it means and what would invalidate it. Every formula is checked against scipy, statsmodels and numpy on every push." --homepage "https://igorlima-py.github.io/experiment-calculators/" --add-topic ab-testing,experimentation,statistics,sample-size,power-analysis,cuped,sequential-testing,alpha-spending,geo-experiments,incrementality,vanilla-javascript,github-pages
  ```

  Atenção: esse texto diz "five calculators", e a C1 corrige exatamente isso no index. Se
  aplicar agora, revise no C6.

**Próximo passo concreto:** abrir a **C1 — frases testadas e guarda do site** numa sessão
nova, em opus/high. O prompt de abertura está no `docs/ROADMAP.md`, e a primeira coisa que
ele faz é pedir o token do Search Console.

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

*(Superado: o workflow rodou verde e o repositório é público desde 24/09. O próximo
passo agora é a C1 do `docs/ROADMAP.md`; ver a seção de 27–29/09 no topo.)*

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
- ~~O workflow do GitHub Actions nunca rodou.~~ Rodou verde em 24/09.
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

- `gh` agora está instalado aqui (2.98.0, conferido em 27/09); antes a API
  pública do GitHub era usada via `curl`.
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
