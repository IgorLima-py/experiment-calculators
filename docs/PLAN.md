# PLAN — Suíte de calculadoras de experimentação

*Escrito na sessão de planejamento de 2026-08-26, a partir de pesquisa profunda
(5 frentes, ~80 fontes — ver `docs/REFERENCES.md`). Aguardando OK do Igor antes
de qualquer código.*

---

## 1. O que a pesquisa confirmou (posicionamento)

A aposta do BRIEF se sustenta, com evidência:

- **Peeking (Tool 3): confirmado com dois asteriscos.** Não existe ferramenta
  gratuita que responda "olhei k vezes — qual meu falso-positivo real e qual
  threshold eu deveria ter usado?". Os concorrentes mais próximos: Evan Miller
  (sequential design de 2015, só conversões, pré-registro), Convert.com (modo
  sequencial não documentado, lead-gen), MetricGate (mSPRT completo mas exige
  upload de dados brutos e escolha de prior — inacessível a marketeiro),
  Analytics-Toolkit (rigoroso, **pago**).
- **Geo-holdout (Tool 4): nicho 100% vazio.** Nenhuma calculadora web de poder
  para geo-testes existe. As referências são pacotes R/Python (GeoLift,
  trimmed_match). Guias práticos mandam o leitor "procurar uma calculadora de
  t-test e adaptar". Seremos a primeira.
- **CUPED (Tool 5): zero explainers interativos na internet.** Só notebooks
  estáticos e docs de vendor.
- **Validação publicada: ninguém faz.** Nenhuma calculadora do censo publica
  cross-check contra implementação de referência.
- **Frase de julgamento + invalidação: sem incumbente.** ABTestGuide (SRM check
  automático) e experimentcalculator.com ("seu teste levaria 9 meses, não rode")
  são os únicos parentes parciais. Ninguém combina veredito + significado +
  condições de invalidação.
- **Mobile-first: ninguém.** As ferramentas com matemática boa são de era
  desktop (2010–2015); as modernas são páginas de lead-gen com matemática rasa.
- O campo é **lotado** exatamente onde não vamos competir: calculadora de
  significância z-test genérica.

## 2. Arquitetura comum

**Stack (travada pelo CLAUDE.md):** HTML + JS vanilla, zero dependências, zero
build, GitHub Pages. UI em inglês.

```
index.html                  — landing: a suíte, 1 parágrafo de filosofia, links
tools/sample-size.html      — Tool 1
tools/mde.html              — Tool 2
tools/peeking.html          — Tool 3 ⭐
tools/geo-holdout.html      — Tool 4
tools/cuped.html            — Tool 5
assets/stats.js             — núcleo numérico compartilhado (ver abaixo)
assets/ui.js                — estado ↔ URL, copy link, binding de forms
assets/style.css            — mobile-first, um só CSS
validation/                 — scripts Python + RESULTS.md (tabelas publicadas)
```

**`stats.js` — núcleo numérico** (tudo com fórmula publicada, sem libs):
- `Φ` (erf via Abramowitz-Stegun 7.1.26 ou Cody) e `Φ⁻¹` (Acklam/Wichura).
- CDF/quantil da t de Student via beta incompleta regularizada (Lentz, ~40
  linhas) — para o Tool 4 (n pequeno).
- CDF da t não-central (integração Gauss–Legendre, ~30 linhas) — poder exato
  do Tool 4.
- Recursão de Armitage–McPherson (convolução em grade + truncamento) — Tool 3.
- RNG normal (Box-Muller sobre `Math.random`) para as simulações.

**Padrão de URL compartilhável** (síntese das 3 implementações verificadas —
Evan Miller, ABTestGuide, ABBA):
- Query params **nomeados e curtos**, unidades humanas: `?base=2.5&mde=10&rel=1`.
- **Defaults omitidos** da URL (links curtos, diff legível).
- Atualização **ao vivo** via `history.replaceState` (sem spam de histórico) +
  botão **"Copy link"** com feedback.
- Parse estrito no load, fallback para defaults em lixo, **auto-cálculo** — link
  compartilhado abre em resultado renderizado, nunca em form vazio.

**Padrão de página** (igual nas 5): inputs com defaults sensatos no topo →
resultado grande → **frase de julgamento** destacada → "honesty box" (premissas
+ o que NÃO cobre) → link de validação → footer com autor.

## 3. Ferramenta por ferramenta

### Tool 1 — Sample size & duration (`tools/sample-size.html`)

- **Inputs:** baseline (%), MDE (toggle absoluto/relativo), tráfego diário,
  power (default 80%), alpha (default 5%), one/two-tailed.
- **Outputs:** n por variante, total, dias (`ceil(2n/tráfego)`).
- **Método (decisão):** fórmula z de duas proporções com **variância pooled
  p̄ sob H0** — bate dígito a dígito com
  `statsmodels.samplesize_proportions_2indep_onetail`. A pesquisa resolveu a
  discrepância famosa: Evan Miller dá ~6% menos (1030 vs 1094 nos defaults dele)
  porque usa variância de H0 com os dois braços no baseline, não pooled — não é
  correção de continuidade nem Cohen's h. A tabela de validação publica **as
  duas convenções lado a lado** e explica a diferença; isso é o artefato de
  honestidade.
- **Julgamento (do BRIEF):** "This assumes you don't look at the results before
  day X. If you check early and stop when it looks significant, your real
  false-positive rate is roughly 3× what you think it is." — com link pro Tool 3.
- **Honesty box:** aproximação normal, sem correção de continuidade, tráfego
  50/50, um único teste primário.
- **Validação:** `verify_tool1.py` (já roda) → tabela EM vs statsmodels vs
  pooled vs Fleiss+CC.
- **URL:** `?base=20&mde=5&abs=1&traffic=1000&power=80&alpha=5&tails=2`.

### Tool 2 — Minimum Detectable Effect (`tools/mde.html`)

- **Inputs:** tráfego disponível, janela de tempo, baseline, power, alpha.
- **Output:** menor lift detectável (relativo e absoluto).
- **Método:** inversão numérica da fórmula do Tool 1 por bissecção (δ aparece
  dentro da variância de H1 — **não há forma fechada**; inversa aproximada que
  ignora isso é exatamente a "errada sutil" que o CLAUDE.md proíbe).
- **Julgamento (do BRIEF):** "If this number is bigger than the effect you
  realistically expect, don't run the test. You'll get an inconclusive result
  and call it a failure." — a filosofia do experimentcalculator.com, generalizada.
- **Validação:** round-trip contra Tool 1 + `NormalIndPower.solve_power`
  (rota Cohen's h, statsmodels) com back-transform.
- **URL:** `?traffic=1000&days=14&base=2.5&power=80&alpha=5`.

### Tool 3 — ⭐ Peeking checker (`tools/peeking.html`)

O carro-chefe. **Decisão de método (a pendência do STATUS.md): híbrido — os
dois, não um dos dois.** Exato para os números, simulação para a persuasão:

1. **Resposta central (defensável):** recursão de Armitage–McPherson em JS
   computa o alfa real inflacionado para k peeks igualmente espaçados
   (k≤50 interativo; protótipo Python levou <1s por k≤20 — JS com JIT é mais
   rápido). Não achamos **nenhuma** implementação client-side de bounds
   group-sequential — seria a primeira.
2. **Threshold corrigido (explicável):** manchete = **Pocock** — um único
   número acionável ("com 5 olhadas, exija p < 0.016 em cada uma, não 0.05");
   é o que o artigo canônico do Evan Miller popularizou. Aba avançada:
   **O'Brien-Fleming + alpha-spending Lan-DeMets** (formas fechadas
   verificadas: OBF `2−2Φ(z_{α/2}/√t)`, Pocock `α·ln(1+(e−1)t)`) com peeks em
   tempos desiguais — a defesa para a audiência estatística; é o que
   Spotify/ensaios clínicos usam.
3. **Simulação ao vivo (mostrar > afirmar):** Monte Carlo animado de testes A/B
   nulos com o k do usuário — contador converge para o número exato (~14.2% em
   k=5), depois roda de novo com o threshold corrigido e volta a ~5%. 100k reps
   em nível de incremento-z ≈ dezenas de ms, sem web worker. A convergência da
   simulação sobre o número exato **é** a validação na tela.
4. **Justificativa citável da escolha:** plataformas de dados batched (Spotify,
   Analytics-Toolkit) escolheram group-sequential; as de streaming contínuo
   (Optimizely, Statsig) escolheram mSPRT. Um checker de peeking é
   inerentemente discreto ("quantas vezes você olhou?") → território
   group-sequential. mSPRT responde a pergunta *prospectiva* — vira nota
   "o que as plataformas grandes fazem", com link.
- **Inputs:** nº de peeks, alpha nominal; avançado: tempos dos peeks.
- **Outputs:** alfa real, threshold corrigido por peek, simulação.
- **Julgamento:** "You've looked 5 times: your real false-positive rate is
  ~14%, not 5%. To keep 5% overall you needed p < 0.016 at every look. Assumes
  equally spaced looks and that you'd have stopped at the first significant
  result."
- **Validação (tripla, sem precisar de R):** recursão JS vs (a) tabela
  publicada Armitage/Pocock/OBF — 0.083/0.107/0.126/0.142/0.193/0.248 para
  k=2..20, Pocock c=2.178/2.289/2.361/2.413/2.555, OBF k=3: 3.471/2.454/2.004 —
  vs (b) rota MVN scipy (`verify_tool3_mvn.py`), vs (c) recursão Python +
  Monte Carlo (`verify_tool3_recursion.py`). Os dois scripts já rodam e batem
  em ±0.002.
- **URL:** `?looks=5&alpha=5` (+ `&times=0.2,0.5,1` no avançado).

### Tool 4 — Geo-holdout power (`tools/geo-holdout.html`)

- **Método:** t-test de duas amostras com **geos como unidades** (linhagem
  Hayes & Bennett 1999, quantis t — não z, porque ν é pequeno), variância via
  **CV entre geos da métrica ajustada pelo pré-período**:
  `MDE = (t_{1−α/2,ν} + t_{1−β,ν}) · CV_eff · √(1/n_T + 1/n_C)`,
  com `CV_eff = CV·√(1−ρ²)` se o usuário der a correlação pré/pós. Poder exato
  via t não-central. É o que a matemática fechada do próprio Google (Vaver &
  Koehler eq. 4) vira quando se tira a covariável — defensável se declarado.
- **Dois modos:** (a) MDE dado o holdout; (b) menor holdout para poder-alvo.
  Mais a **curva MDE × tamanho do holdout** (50/50 minimiza; segurar só 10% de
  50 geos custa ~1.7× o MDE — responde visualmente "quantos mercados seguro?").
- **Helper "cole seus totais por geo"** (textarea, opcional coluna de
  pré-período) → computa média/SD/CV/ρ **client-side** — resolve o "ninguém
  sabe seu CV" sem backend.
- **Avisos duros:** holdout < 5 geos → vermelho (Trimmed Match usa piso ~10
  pares); CV bruto ≥ 0.5 → "use métrica ajustada"; N < 10 → "métodos de série
  temporal, fora do escopo".
- **Julgamento:** "With 40 geos and 8 held out you can detect a ~X% lift. This
  assumes no spillover between markets (IP targeting is only 55–80% accurate)
  and a stable pre-period — one regional promo or storm in either arm breaks
  it. Before spending real budget, run GeoLift's simulation on your actual
  data; this is the design-stage estimate."
- **Honesty box:** geos independentes, sem adstock, primeira ordem; GeoLift /
  Trimmed Match / synthetic control obtêm MDEs melhores dos mesmos geos.
- **Validação:** t central/não-central vs `scipy.stats.nct` +
  `TTestIndPower.power`; fórmula MDE vs Hayes & Bennett publicada.
- **URL:** `?geos=40&holdout=8&cv=15&lift=5&alpha=10&power=80&rho=0`.

### Tool 5 — CUPED & ratio metrics explainer (`tools/cuped.html`)

Não-calculadora; explainer interativo com **dois demos** (+1 opcional):

1. **Slider de ρ (CUPED):** scatter pré×durante com reta θ, duas curvas de
   distribuição amostral (Δ cru vs Δ_cv) estreitando com `1−ρ²`, e leituras ao
   vivo: "variance reduction = ρ² = 36%", "**effective traffic multiplier**
   = 1/(1−ρ²) = 1.56×" (framing do Microsoft ExP), "14 dias → 9 dias".
   Âncoras reais no slider: Bing queries/user ≈ 0.7 (~50% redução),
   Bing **revenue/user ≈ 0.2 (<5% redução)** — o fato-manchete: CUPED não é
   varinha mágica para receita.
2. **Demo delta method:** ~2k usuários simulados, métrica por sessão; três
   barras de erro — SE ingênuo vs SE delta method vs verdade Monte Carlo.
   Slider de correlação intra-usuário: em 0 o ingênuo acerta, degradando
   conforme cresce — ensina cineticamente o conceito-chave: **delta method é
   sobre unidade de análise ≠ unidade de randomização**, não sobre "receita é
   enviesada". Toggle "randomize by session" colapsa o gap.
3. **(Opcional, corta se apertar):** painel de skewness — lognormal, CLT
   convergindo, regra 355·s², slider de winsorização mostrando SE encolhendo e
   viés aparecendo.
- **Equívocos que o texto corrige** (com fonte): revenue/user com randomização
  por usuário NÃO precisa de delta method; covariável tem que ser
  pré-experimento (Deng 2013 §5.3: covariável in-experiment inverteu sinal com
  CI apertado); θ pooled entre braços; CLT vale para receita enviesada, só
  devagar.
- **Modelo de design:** rpsychologist.com (padrão-ouro de explainer interativo).
- **Validação:** simulação numpy → razão de variância ≈ 1−ρ², SE delta vs
  fórmula de Deng 2018; cross-check opcional contra `gbstats`/spotify-confidence.
- **URL:** `?rho=0.6` (estado leve; demos são o conteúdo).

## 4. Pipeline de validação (regra inegociável)

- `validation/` com um script por família + `RESULTS.md` gerado (tabelas
  markdown commitadas). Pin: `statsmodels==0.14.6`, `scipy==1.17.1`
  (rodou nesta máquina, Python 3.14.3). **R não é necessário** — o check
  triplo do Tool 3 substitui `gsDesign`/`ldbounds` (que ficam citados).
- 3 scripts-semente já estão no repo e reproduzem as tabelas canônicas
  (ver `validation/README.md`).
- Cada página da suíte linka a comparação correspondente ("validated against
  statsmodels — see the table").

## 5. Fases de execução

**Como usar isto:** cada fase é independente e fecha em commit. Marque `[x]` ao
concluir. `docs/STATUS.md` sempre aponta a fase atual — uma sessão nova lê o
STATUS, acha a fase, e continua daqui. Nenhuma fase vai ao ar sem sua tabela de
validação (regra do CLAUDE.md).

Ordem 1→2→3 é deliberada: as duas primeiras são simples e exercitam o núcleo
compartilhado, então a ⭐ Tool 3 chega com o esqueleto já rodado.

### Restrições desta máquina (importante para qualquer sessão)

- **`node` NÃO está instalado.** Não dá para validar o JS por linha de comando.
  A validação do JS roda **no browser**: subir `python -m http.server`, abrir a
  página de validação e comparar com os valores de referência do Python.
  `validation/RESULTS.md` guarda a tabela final commitada.
- **`gh` NÃO está instalado.** Para consultar o GitHub, usar a API pública
  via `curl` + `python -c`.
- **R NÃO está instalado** e não é necessário (o check triplo da Tool 3
  substitui `gsDesign`/`ldbounds`).
- Python 3.14.3 com `statsmodels==0.14.6`, `scipy==1.17.1` — é o lado de
  referência de toda validação.

---

### Fase 0 — Esqueleto e núcleo numérico ✅

- [x] **0.1** `assets/stats.js` — primitivas: `normalPdf`, `normalCdf` (Φ, West
      2005), `normalQuantile` (Φ⁻¹, Acklam + refino de Halley), `logGamma`
      (Lanczos), `incompleteBeta` (Lentz), `tCdf`, `tQuantile`,
      `noncentralTCdf` (Simpson sobre a densidade qui), `randNormal`
      (Marsaglia polar), `bisect`.
- [x] **0.2** Validação por linha de comando (`node` foi instalado; ver
      restrições) — `reference_core.py` + `check_core.js`, 546 casos contra o
      scipy. Passou. Pegou 2 bugs reais (`tCdf` perto de t=0 com ν grande;
      cancelamento do refino de Halley no `normalQuantile`).
- [x] **0.3** `assets/ui.js` — params nomeados, defaults omitidos,
      `replaceState` ao vivo, botão "Copy link" com fallback fora de contexto
      seguro, parse estrito, auto-cálculo no load.
- [x] **0.4** `assets/style.css` — mobile-first, dark mode, bloco de julgamento
      e honesty box.
- [x] **0.5** Template aplicado em `tools/sample-size.html`.

**Pronto:** primitivas batem com o scipy dentro das tolerâncias documentadas.

### Fase 1 — Tool 1: sample size & duration ✅

- [x] **1.1** `assets/experiments.js`: `sampleSizePooled()`,
      `sampleSizeEvanMiller()`, `powerPooled()`, `durationDays()`.
- [x] **1.2** `tools/sample-size.html` — template da suíte.
- [x] **1.3** `reference_tool1.py` + `check_tool1.js` → tabela no `RESULTS.md`
      com as duas convenções e a explicação da diferença.

**Pronto:** bate com o statsmodels em **7.9e-16**. Testado no browser (URL nos
dois sentidos, defaults omitidos, guardas, mobile a 375px sem overflow).

### Fase 2 — Tool 2: MDE ✅

- [x] **2.1** `mdeFromSampleSize()` por bissecção sobre a função real.
- [x] **2.2** `tools/mde.html` + julgamento em três níveis de severidade.
- [x] **2.3** Validação: inversão numérica do statsmodels + round-trip +
      rota Cohen's h → `RESULTS.md`.

**Pronto:** 1.5e-13 contra o statsmodels invertido, round-trip em 2.2e-13.
As linhas 2–4 da tabela recuperam exatamente os efeitos da tabela da Fase 1.

### Fase 3 — ⭐ Tool 3: peeking checker ✅

- [x] **3.1** Recursão de Armitage–McPherson em `assets/sequential.js`.
      Bate com a tabela publicada **exatamente** em 3 casas (k=2..50).
- [x] **3.2** Constante de Pocock por bissecção sobre a recursão:
      2.178 / 2.289 / 2.361 / 2.413 / 2.555 — casamento exato.
- [x] **3.3** O'Brien-Fleming (exato) + formas fechadas de spending Lan-DeMets
      + `overallAlphaUneven` para peeks desigualmente espaçados. OBF k=5:
      4.562 / 3.226 / 2.634 / 2.281 / 2.040 — exato.
- [x] **3.4** Simulação Monte Carlo animada, 200k testes nulos, duas barras
      (peeking vs limiar corrigido), banda de ±2 SE. Converge para 14,10%
      contra a cifra exata de 14,17%.
- [x] **3.5** `tools/peeking.html` com julgamento, aba avançada e a nota sobre
      mSPRT/always-valid (o que as plataformas grandes fazem, e por que este
      problema é discreto e portanto group-sequential).
- [x] **3.6** Validação **quádrupla** publicada: recursão JS vs integração
      multivariada no scipy vs tabelas publicadas (1969/1977/1979) vs Monte
      Carlo de 1 milhão de rodadas. Pior desvio contra o scipy: 8.1e-6.

**Pronto:** quatro rotas independentes concordam. A rota MVN foi limitada a 12
looks — acima disso o algoritmo de Genz fica lento e impreciso (a primeira
versão rodou 20+ min sem retornar), então lá valem tabela publicada + Monte
Carlo. Está documentado no `RESULTS.md`.

### Fase 4 — Tool 4: geo-holdout power · ~1.5–2h

- [ ] **4.1** `geoMde()` e `geoPower()` — t de duas amostras com geos como
      unidades, `CV_eff = CV·√(1−ρ²)`, poder exato por t não-central.
- [ ] **4.2** Helper "cole seus totais por geo" (textarea → média/SD/CV/ρ
      client-side).
- [ ] **4.3** Curva MDE × tamanho do holdout (SVG inline, sem lib).
- [ ] **4.4** `tools/geo-holdout.html` — avisos duros (holdout < 5 geos
      vermelho; CV bruto ≥ 0.5; N < 10 → fora do escopo), julgamento com
      spillover/IP 55–80%/pré-período estável, honesty box apontando GeoLift.
- [ ] **4.5** Validação vs `scipy.stats.nct` + `TTestIndPower.power` e vs a
      fórmula publicada de Hayes & Bennett → `RESULTS.md`.

**Pronto quando:** poder JS bate com `scipy.stats.nct` em 1e-6 numa grade de
(n_T, n_C, CV, lift).

### Fase 5 — Tool 5: CUPED & ratio metrics explainer · ~1.5–2h

- [ ] **5.1** Demo 1: slider de ρ — scatter com reta θ, duas distribuições
      amostrais estreitando com `1−ρ²`, leituras (redução %, multiplicador de
      tráfego efetivo `1/(1−ρ²)`, dias economizados), âncoras Bing
      (queries/user ρ≈0.7 → ~50%; **revenue/user → <5%**).
- [ ] **5.2** Demo 2: delta method — três barras de erro (SE ingênuo, SE delta,
      verdade Monte Carlo) + slider de correlação intra-usuário + toggle
      "randomize by session".
- [ ] **5.3** `tools/cuped.html` — texto com os 4 equívocos corrigidos
      (com fontes), fórmulas, links canônicos.
- [ ] **5.4** Validação: simulação numpy → razão de variância ≈ 1−ρ² e SE delta
      vs fórmula de Deng 2018 → `RESULTS.md`.
- [ ] **(opcional, 1º a cortar)** Painel 3: skewness/CLT/355·s²/winsorização.

**Pronto quando:** os dois demos rodam e a simulação bate com a teoria em
`RESULTS.md`.

### Fase 6 — Fechamento · ~1h

- [ ] **6.1** `index.html` — a suíte, 1 parágrafo de filosofia, links.
- [ ] **6.2** `README.md` em inglês — o que é, como validar, premissas.
- [ ] **6.3** Passada mobile em todas as páginas (375px) + footer/links.
- [ ] **6.4** `validation/RESULTS.md` consolidado e conferido.
- [ ] **6.5** Teste do público em todo o histórico; repo pronto pra virar
      público (a chave é do Igor).

**Pronto quando:** o Definition of Done do BRIEF fecha (§7 abaixo).

---

**Total estimado: 9–12h.** O BRIEF dizia 6–8h; a pesquisa mostrou que o
diferencial (Tool 3 triplo + Tool 4 inédito) vale as horas a mais.
**Cortes se apertar, nesta ordem:** 5.4-opcional → 3.3 (fica Pocock + OBF
tabelado) → 4.2 (fica input manual de CV).

## 6. Riscos e mitigação

- **Recursão em JS mais chata que o protótipo** → fallback já decidido: tabela
  precomputada k=1..50 (gerada pela própria recursão, validada) embutida; perde
  peeks desiguais, mantém tudo o mais.
- **t não-central (Tool 4)** → aproximação shifted-t erra em ν pequeno; por
  isso integração numérica exata + validação contra `scipy.stats.nct` desde o
  dia 1.
- **Escopo do Tool 5 crescer** → é explainer, não paper; dois demos e acabou.
- **GitHub Pages** → só liga quando o repo virar público (decisão do Igor,
  fora deste plano); nada no código depende disso (`python -m http.server`).

## 7. Mapa para o Definition of Done do BRIEF

- 5 tools mobile-responsive → passos 0–6. ✓ planejado
- Frase de julgamento em todo output → especificada por tool acima. ✓
- URLs compartilháveis → padrão único no `ui.js`, params por tool acima. ✓
- Validação publicada → `validation/` + RESULTS.md, sementes já no repo. ✓
- Repo público + README + Pages → passo 6 + chave virada pelo Igor. ✓

---

**Próximo passo: OK do Igor neste plano (ou ajustes) → começar pelo passo 0.**
