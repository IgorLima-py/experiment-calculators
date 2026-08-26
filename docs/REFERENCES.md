# REFERENCES — o que a pesquisa achou e o que cada fonte vale

*Sessão de planejamento, 2026-08-26. Cinco frentes de pesquisa em paralelo.*

**Legenda de verificação:** ✅ = conteúdo verificado por fetch direto (página,
paper ou código-fonte lido); 🔬 = número **reproduzido por execução** nesta
máquina (scripts em `validation/`); 🔎 = confirmado só por snippet de busca —
conferir antes de citar publicamente.

---

## 1. Censo de calculadoras (Tool 1–3 — concorrência e lacunas)

### Suítes com matemática séria

- ✅ **Evan Miller — "Evan's Awesome A/B Tools"** — https://www.evanmiller.org/ab-testing/ —
  a referência do campo: sample size, sequential, chi-squared, t-test, Poisson,
  survival. Estático, client-side, URLs hash-bang. UI de 2010, não mobile.
  Sem frase de julgamento, sem caveats inline.
  - ✅ Fórmula exata recuperada do fonte: https://www.evanmiller.org/ab-testing/sample-size-fixed.js —
    variância H0 com os dois braços no baseline (não pooled), sempre two-sided,
    dobra por simetria em p>0.5. Defaults: 20%, MDE 5% abs, α=5%, power 80%.
  - ✅ Sequential: https://www.evanmiller.org/ab-testing/sequential.html — regra
    gambler's ruin `|T−C| ≥ 2.25√N` do artigo https://www.evanmiller.org/sequential-ab-testing.html.
    Design pré-registrado, só conversões — não corrige peeking a posteriori.
- ✅ **ABTestGuide** — https://abtestguide.com/calc/ — z-test com **SRM check
  automático** e aviso de dados insuficientes — o parente mais próximo do nosso
  conceito de invalidação. URLs com params nomeados e defaults omitidos
  (padrão que vamos copiar). Irmãos: /bayesian/, /abtestsize/.
- ✅ **Thumbtack ABBA** — https://thumbtack.github.io/abba/demo/abba.html +
  https://github.com/thumbtack/abba — ancestral arquitetural do projeto:
  estático, open source, estado no hash com integração de histórico. 2012,
  abandonado.
- ✅ **GIGAcalculator** (conteúdo de Georgi Georgiev, grátis) —
  https://www.gigacalculator.com/calculators/power-sample-size-calculator.php —
  a documentação estatística mais profunda do censo (derivações, 7 referências,
  "post-hoc power é inútil"), mas zero interpretação de resultado e sem URL state.
- ✅ **experimentcalculator.com** (Dan McKinley) + ensaio
  https://mcfunley.com/how-long-should-you-run-experiments — a alma gêmea do
  nosso diferencial: existe para dizer "esse teste não vale a pena". Escopo
  limitado a duração.

### Vendors (matemática opaca ou engine-specific)

- ✅ **VWO** — https://vwo.com/tools/ab-test-significance-calculator/ e
  /ab-test-duration-calculator/ — Bayesian SmartStats + toggle frequentista;
  números atrelados ao engine deles; sem URL state.
- ✅ **Optimizely** — https://www.optimizely.com/sample-size-calculator/ — mSPRT
  por trás (🔎 método: https://support.optimizely.com/hc/en-us/articles/39714777161229 e
  whitepaper https://www.optimizely.com/contentassets/9205a8a811e84957a7cca527d4af20be/whitepaper_optimizely_stats_engine.pdf),
  mas a calculadora não expõe nada — nem power.
- ✅ **Statsig** — https://statsig.com/calculator e /powercalculator — fixed-horizon
  com split ratio (raro); botão de share link; sem discussão de peeking.
- ✅ **Convert.com** — https://www.convert.com/calculator/ — a mais completa do
  censo: modos frequentista/sequencial/Bayesiano, receita, SRM, curva de MDE.
  **O contra-exemplo mais forte à aposta do peeking** — mas método sequencial
  não documentado, lead-gen, sem validação publicada.
- ✅ **CXL** — https://cxl.com/ab-test-calculator/ — pré+pós-teste + Bayesian
  readout; anti-peeking só em prosa.
- ✅ **SurveyMonkey** — https://www.surveymonkey.com/mp/ab-testing-significance-calculator/ —
  z-test genérico de marketing.
- ✅ **Analytics-Toolkit** (Georgiev) — https://www.analytics-toolkit.com/ —
  o sequencial mais rigoroso do mercado (AGILE), **pago** — sustenta nossa
  aposta no tier grátis. Blog canônico sobre peeking:
  https://blog.analytics-toolkit.com/2022/comparison-of-the-statistical-power-of-sequential-tests/ 🔎,
  https://blog.analytics-toolkit.com/2020/error-spending-in-sequential-testing-explained/ 🔎.
- ✅ **MetricGate** — https://metricgate.com/docs/mixture-sequential-ratio-test/ —
  mSPRT completo grátis, mas exige dataset em formato longo + escolher τ:
  correto e inacessível. A exceção que prova a regra.
- ✅ **Lukas Vermeer — SRM Checker** — https://www.lukasvermeer.nl/srm/ — o
  invalidador canônico (SRM) como ferramenta; extensão aposentada.
- ✅ **Dynamic Yield** — https://marketing.dynamicyield.com/ab-test-duration-calculator/ —
  Bayesian não documentado; input de múltiplas variações é o único destaque.
- 🔎 Vistos e descartados (nada metodologicamente novo): Swetrix, MCP Analytics,
  Unbounce, Mida, Zoho PageSense, ABTestResult, statscalculators.com.

### Lacunas confirmadas (= posicionamento)

1. Peeking corrector grátis e acessível: **não existe**.
2. Geo power na web: **não existe**.
3. CUPED interativo: **não existe**.
4. Validação publicada contra referência: **ninguém**.
5. Julgamento + invalidação por resultado: **ninguém** (ABTestGuide chega perto).
6. Simulação mostrada ao usuário: **ninguém** (só blog posts estáticos).
7. Mobile-first com matemática boa: **ninguém**.

## 2. Padrões de URL compartilhável (verificados no código-fonte)

- ✅ **Evan Miller**: hash-bang posicional `#!20;80;5;5;0`, campo de link sempre
  visível, atualização ao vivo, regex estrito no load. Fraqueza: params
  posicionais quebram com evolução.
- ✅ **ABTestGuide**: params nomeados curtos, **defaults omitidos**, botão
  "save & share url", `history.replaceState` limpa a barra depois do load.
  **O melhor modelo — é o que vamos seguir.**
- ✅ **ABBA**: `key=value` no hash + cada análise vira entrada de histórico
  (back button navega análises).
- Exemplares conhecidos: crontab.guru (input É a URL + paths bonitos pra SEO),
  bundlephobia (estado no path), carbon.now.sh (params legíveis + base64 só
  pro texto livre), godbolt (short link **precisa de backend — evitar**),
  regex101/Desmos (permalink server-side — **o anti-padrão pra site estático**).

## 3. Tool 1/2 — fórmulas e referência de validação

- ✅ 🔬 **statsmodels** (0.14.6, assinaturas introspectadas e executadas):
  - `samplesize_proportions_2indep_onetail(diff, prop2, power, alpha, alternative)` —
    https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.samplesize_proportions_2indep_onetail.html —
    **a referência primária do Tool 1** (= fórmula pooled p̄ ao decimal).
  - `power_proportions_2indep(...)` — docstring confirma: pooled sob H0,
    unpooled sob H1 — https://www.statsmodels.org/stable/generated/statsmodels.stats.proportion.power_proportions_2indep.html
  - `proportion_effectsize` (Cohen's h) + `NormalIndPower.solve_power` —
    rota do Tool 2 (round-trip verificado: h=0.11990 → MDE 0.0500 exato).
  - `tt_ind_solve_power` / `TTestIndPower` — referência do Tool 4.
- 🔬 **A discrepância resolvida** (tabela completa em `validation/verify_tool1.py`):
  nos defaults do Evan Miller — EM 1030.2, statsmodels/pooled 1093.7, Cohen's h
  1091.9, Fleiss+CC 1133.4. Causa: convenção de variância sob H0 (baseline nos
  dois braços vs pooled). `power_proportions_2indep(nobs1=1030)` → power 0.776:
  o n do EM é levemente subpotente sob o modelo pooled. Publicar as duas.
- ✅ **scipy**: `scipy.stats.norm.ppf/isf` — https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html —
  `isf(α/2)` tem melhor numérica na cauda que `ppf(1−α/2)`.
- Inversão do Tool 2: sem forma fechada em δ (δ está na variância H1) —
  bissecção/brentq. Nunca aproximar ignorando δ na variância.

## 4. Tool 3 — literatura sequencial e escolha de método

### Números canônicos (âncoras de validação)

- 🔎 **Armitage, McPherson & Rowe (1969)**, "Repeated Significance Tests on
  Accumulating Data", *JRSS-A* 132:235–244 — https://academic.oup.com/jrsssa/article/132/2/235/7104382 —
  paywalled, mas: ✅ **Lakens** (cap. 10 aberto, cita verbatim: 0.142 em 5
  looks, 0.374 em 100, 0.530 em 1000) — https://lakens.github.io/statistical_inferences/10-sequential.html —
  e 🔬 **reproduzido por duas rotas independentes nesta máquina**
  (`validation/verify_tool3_mvn.py` e `verify_tool3_recursion.py`):
  k=2..50 → 0.083 / 0.107 / 0.126 / 0.142 / 0.193 / 0.248 / 0.320.
- 🔬 **Pocock (1977)**, *Biometrika* 64:191–199 — constantes reproduzidas:
  c = 2.178 / 2.289 / 2.361 / 2.413 / 2.555 (k=2/3/4/5/10) → α por look
  0.0294 / 0.0221 / 0.0182 / 0.0158 / 0.0106. 🔎 Tabelas públicas:
  https://online.stat.psu.edu/stat509/lesson/9/9.5
- 🔬 **O'Brien & Fleming (1979)**, *Biometrics* 35:549–556 — k=3:
  3.471/2.454/2.004 (bate com Lakens ✅); k=5: 4.562/3.226/2.634/2.281/2.040.
- ✅ **Lan-DeMets spending, formas fechadas** (man page do gsDesign):
  OBF-like `f(t)=2−2Φ(Φ⁻¹(1−α/2)/√t)`, Pocock-like `f(t)=α·ln(1+(e−1)t)` —
  https://search.r-project.org/CRAN/refmans/gsDesign/html/sfLDOF.html
- ✅ **Evan Miller, "How Not To Run an A/B Test"** —
  https://www.evanmiller.org/how-not-to-run-an-ab-test.html — a popularização
  canônica (26.1% com peeking contínuo; tabela de correção ≈ Pocock). O
  registro de tom a imitar.

### Always-valid / mSPRT (a nota "o que as plataformas fazem")

- ✅ **Johari, Pekelis, Walsh** — "Always Valid Inference" — arXiv
  https://arxiv.org/abs/1512.04922, *Operations Research* 70(3) 2021
  https://pubsonline.informs.org/doi/pdf/10.1287/opre.2021.2135 — mSPRT,
  p-valor always-valid; "even with 10,000 samples… fivefold" (extraído do PDF).
- 🔎 **Johari, Koomen, Pekelis, Walsh**, "Peeking at A/B Tests", KDD 2017 —
  o paper de deployment da Optimizely.
- ✅ **Howard, Ramdas, McAuliffe, Sekhon** — confidence sequences —
  https://arxiv.org/abs/1810.08240 — fundação moderna do anytime-valid.
- ✅ **Statsig docs** — https://docs.statsig.com/experiments-plus/sequential-testing —
  mSPRT com Z* fechado, seguindo 🔎 https://arxiv.org/abs/1905.10493.
- ✅ **Spotify engineering** — https://engineering.atspotify.com/2023/03/choosing-sequential-testing-framework-comparisons-and-discussions —
  comparação simulada: GST ≈ 90% de poder vs mSPRT ≈ 72–77% — a citação-chave
  para justificar group-sequential no nosso caso (dados batched, looks
  discretos). Partes 1–2 sobre dados longitudinais no mesmo blog.
- ✅ **GrowthBook docs** — https://docs.growthbook.io/statistics/sequential —
  asymptotic confidence sequences, honestos sobre perda de poder.
- 🔎 **Jennison & Turnbull**, *Group Sequential Methods* (2000) — o livro-texto.

### Referências de implementação e precedentes

- 🔎 **R `ldbounds`** — https://cran.r-project.org/package=ldbounds (Lan-DeMets
  clássico) e **`gsDesign`** — https://keaven.github.io/gsDesign/ — citados como
  referência; **não necessários** (check triplo local substitui; R nem está
  instalado nesta máquina). Sem port canônico em Python/JS — **seríamos a
  primeira implementação client-side**.
- ✅ **R-bloggers, "Weekend at Bernoulli's"** — https://www.r-bloggers.com/2014/06/weekend-at-bernoullis/ —
  reprodução por simulação da tabela de Armitage; precedente do nosso approach.
- Precedentes de simulação de peeking (todos estáticos, nenhum interativo):
  🔎 https://gopractice.io/data/peeking-problem/,
  🔎 https://ubc-stat.github.io/stat301book/ch02_abPeeking.html,
  🔎 https://www.gironi.it/blog/en/peeking-problem-ab-testing/.
- 🔬 Performance de Monte Carlo medida: 100k×10 looks vetorizado 0.02s (numpy),
  loop puro 0.83s (Python) → JS JIT dezenas de ms; SE de α̂ em 100k reps ≈
  ±0.0025 (2 SE) — suficiente pra 2 casas na tela.

## 5. Tool 4 — geo-holdout

- ✅ **Vaver & Koehler (2011)**, "Measuring Ad Effectiveness Using Geo
  Experiments" (PDF completo lido) —
  https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/38355.pdf —
  o paper fundador (GBR): modelo WLS com covariável de pré-período (≈ CUPED),
  var(β₂) com deflação (1−ρ²), atribuição estratificada por tamanho (~10% de
  ganho de CI). Nossa fórmula é este resultado sem a covariável.
- ✅ **GeoLift (Meta)** — https://github.com/facebookincubator/GeoLift +
  https://facebookincubator.github.io/GeoLift/docs/Methodology/ — ASCM + poder
  por simulação (`GeoLiftMarketSelection`, grid de efeito 0–25%); o "próximo
  passo sério" pro qual nosso julgamento aponta. Sem versão web.
- ✅ **Trimmed Match Design (Google)** — https://arxiv.org/abs/2105.07060 +
  https://github.com/google/trimmed_match — pares de geos,
  **MDE = RMSE·(q₁₋α+q_β)**, **piso ~10 pares** ("too few pairs may make the
  inference unreliable") — fonte do nosso aviso duro. Estimador: 🔎
  Chen & Au 2019, https://arxiv.org/pdf/1908.02922.
- ✅ **google/matched_markets** — https://github.com/google/matched_markets —
  TBR (Kerman/Wang/Vaver 2017 🔎 — https://research.google/pubs/estimating-ad-effectiveness-using-geo-experiments-in-a-time-based-regression-framework/) —
  para pouquíssimos geos; citar como alternativa quando N<10.
- ✅ **Hayes & Bennett (1999)** — fórmula CV para clusters, verificada via
  https://pmc.ncbi.nlm.nih.gov/articles/PMC4521133/ (original:
  https://academic.oup.com/ije/article-abstract/28/2/319/655247) — **o pedigree
  citável do nosso método** (t-test entre clusters guiado por CV).
- ✅ **Recast** — https://getrecast.com/geo-testing/ — a melhor lista pública de
  caveats: contaminação entre geos, **IP geolocation 55–80% de acurácia**,
  saturação, adstock, canais não-geo-divisíveis — alimenta a honesty box.
- ✅ **Towards Data Science, guia de planejamento** —
  https://towardsdatascience.com/why-are-marketers-turning-to-quasi-geo-lift-experiments-and-how-to-plan-them/ —
  regras de bolso pros defaults: ≥10 geos (ideal 20+), pré-período 4–5× o
  teste, ~52 semanas de histórico, teste ≥15 dias.
- 🔎 Contexto: Abadie synthetic control (2010 JASA); Doudchenko & Gilinson,
  "Designing Experiments with Synthetic Controls" —
  https://mackinstitute.wharton.upenn.edu/wp-content/uploads/2020/03/Wernerfelt-Nils-Doudchenko-Nick-Gilinson-David-and-Taylor-Sean_Designing-Experiments-with-Synthetic-Controls.pdf;
  vendors Haus (https://www.haus.io/blog/geo-experiments-the-fundamentals),
  Measured, Eppo geolift docs (https://docs.geteppo.com/geolift/methods/).
- 🔎 unofficial Google Data Science blog —
  https://www.unofficialgoogledatascience.com/2016/06/estimating-causal-effects-using-geo.html

## 6. Tool 5 — CUPED e delta method

### Papers canônicos

- ✅ **Deng, Xu, Kohavi, Walker (WSDM 2013)** — o paper do CUPED, PDF lido —
  https://exp-platform.com/Documents/2013-02-CUPED-ImprovingSensitivityOfControlledExperiments.pdf —
  Eq. 3–5: `Ŷcv = Ȳ − θX̄ + θE[X]`, `θ = cov(Y,X)/var(X)` (= OLS),
  `var = var(Ȳ)(1−ρ²)`. Fatos-âncora: queries/user Bing, pré-período de 2
  semanas → ~50% de redução; **revenue/user → <5%**; §5.3: covariável
  in-experiment inverteu o sinal de efeito conhecido (o warning central);
  θ pooled entre braços; usuários novos → indicador/estratificação.
- ✅ **Deng, Knoblich, Lu (KDD 2018)** — delta method — https://arxiv.org/abs/1803.06336 —
  `Var(Ȳ/X̄) ≈ (1/n)(1/μx²)[σy² − 2(μy/μx)σxy + (μy²/μx²)σx²]`; a jogada:
  reescrever métrica de evento como razão de médias por unidade de randomização.
- 🔎 **Kohavi, Tang, Xu**, *Trustworthy Online Controlled Experiments* — caps.
  14 (unidade de randomização), 17 (estatística, regra 355·s²), 18 (variância,
  CUPED, winsorização) — https://www.cambridge.org/core/books/trustworthy-online-controlled-experiments/D97B26382EB0EB2DB2DBB91E9AE7FC66
- 🔎 **Xie & Aurisset (KDD 2016)** — Netflix — https://dl.acm.org/doi/10.1145/2939672.2939733 —
  citação de adoção na indústria.
- 🔎 Avançados (footer): CUPED como decomposição https://arxiv.org/pdf/2312.02935;
  survey 2026 https://arxiv.org/html/2606.18750v1; variance reduction em ratio
  metrics https://arxiv.org/pdf/2401.04062.

### Explainers de praticante (linkar/aprender)

- ✅ **Microsoft ExP, "Deep Dive Into Variance Reduction"** —
  https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/deep-dive-into-variance-reduction/ —
  CUPED ≡ ANCOVA/Lin; **"effective traffic multiplier" 1/(1−R²)** — o framing
  de UI que vamos usar; honesto sobre ganhos variarem por produto.
- ✅ **Matteo Courthoud, "Understanding CUPED"** — https://matteocourthoud.github.io/post/cuped/ —
  melhor tratamento matemático em blog (CUPED vs DiD vs regressão).
- ✅ **Statsig** — https://www.statsig.com/blog/cuped +
  https://docs.statsig.com/experiments/statistical-methods/variance-reduction —
  intuição amigável; detalhe de produção (janela de 7 dias, winsorização).
- 🔎 **Booking.com (Simon Jackson)** — https://booking.ai/how-booking-com-increases-the-power-of-online-experiments-with-cuped-995d186fff1d —
  o clássico da indústria (Medium bloqueou fetch — conferir manualmente).
- 🔎 **Eppo CUPED++** — https://docs.geteppo.com/statistics/cuped/ ;
  **GrowthBook** — https://docs.growthbook.io/statistics/cuped (docs que nomeiam
  delta method explicitamente; `gbstats` ✅ código fetched:
  https://github.com/growthbook/growthbook/tree/main/packages/stats — referência
  de validação com `theta`, `mean_ra`/`ratio_ra`).
- 🔎 **spotify-confidence** — https://github.com/spotify/confidence — wrapper de
  statsmodels com GST e delta method; segunda referência de validação.
- 🔎 **Bytepawn (Trencseni)**, série CUPED com notebooks —
  https://bytepawn.com/reducing-variance-in-ab-testing-with-cuped.html — o mais
  próximo do nosso demo, em meio errado (Jupyter): portar a ideia.
- 🔎 Delta method focado: https://www.aleksjpages.com/blog/delta-method-in-AB-testing ;
  https://ianwhitestone.work/randomization-unit-analysis-unit/ ;
  Alex Deng, livro aberto, cap. 8 — https://alexdeng.github.io/causal/abstats.html
- 🔎 **rpsychologist** — https://rpsychologist.com/correlation/ e /cohend/ —
  padrão-ouro de explainer interativo; nosso modelo de design. **Nenhum
  explorable de CUPED/delta existe** — MetricGate tem calculadora seca
  (https://metricgate.com/docs/ratio-metric-delta-method/), não explainer.

## 7. Pipeline de validação (decisões práticas)

- 🔬 Ambiente verificado nesta máquina: Python 3.14.3, `statsmodels==0.14.6`,
  `scipy==1.17.1` — pin em `validation/README.md`. R **não** instalado e não
  necessário.
- 🔬 Sementes commitadas: `validation/verify_tool1.py` (EM vs statsmodels — a
  tabela da discrepância), `verify_tool3_mvn.py` (rota MVN Genz),
  `verify_tool3_recursion.py` (recursão + Monte Carlo). Duas rotas
  independentes + tabelas publicadas = critério de aceite do JS.
- PDF do paper CUPED salvo em cache local da sessão de pesquisa (link público
  acima é estável).
