# Status

*Atualizado em 2026-08-26.*

## Onde estamos

Planejamento aprovado e **Fases 0 e 1 concluídas e validadas**.

Decisões travadas (não reabrir sem motivo):

- **Intuito: peça de portfólio**, não produto. Confirmado pelo Igor. A régua é
  provar competência, não ganhar usuário. (O GitHub confirma que a categoria não
  tem demanda: 170 repos de "ab test calculator", o mais estrelado tem 36
  estrelas.)
- **Escopo: as 5 ferramentas do BRIEF**, mantidas.
- **Método da Tool 3: híbrido** — recursão de Armitage–McPherson + Pocock como
  manchete + OBF/Lan-DeMets em aba avançada + simulação ao vivo. Ver PLAN §3.
- **Tool 1: fórmula pooled p̄** como primária; a convenção do Evan Miller entra
  na tabela comparativa com a explicação da diferença.

### Fase 0 — esqueleto e núcleo numérico ✅

`assets/stats.js` (Φ, Φ⁻¹, logGamma, beta incompleta, t, t não-central, RNG,
bissecção), `assets/ui.js` (estado na URL, copy link), `assets/style.css`
(mobile-first). Todas as 5 primitivas batem com o scipy dentro da tolerância —
tabela em `validation/RESULTS.md`.

Dois bugs reais que o harness pegou (e que valem como argumento para ele
existir): o `tCdf` perdia toda a precisão perto de t=0 com ν grande (a forma
`nu/(nu+t²)` arredonda para 1), e o `normalQuantile` cancelava a própria
correção de Halley para p perto de 1.

### Fase 1 — Tool 1, sample size & duration ✅

`assets/experiments.js` + `tools/sample-size.html`. Bate com o
`statsmodels.samplesize_proportions_2indep_onetail` em **7.9e-16** — precisão de
máquina. Testado no browser: URL nos dois sentidos, defaults omitidos da URL,
avisos de guarda, mobile sem overflow a 375px.

## Próximo passo imediato

**Fase 2 do `docs/PLAN.md` §5** — Tool 2 (MDE), item **2.1**: inverter a fórmula
da Fase 1 por bissecção. Reusa `Experiments.sampleSizePooled` e
`Stats.bisect`, ambos prontos e validados.

O PLAN §5 está dividido em fases com checkboxes e critério de "pronto quando".
Uma sessão nova: lê este arquivo, vai no PLAN §5, acha a primeira fase não
marcada, continua dali.

## Pendências

- Fases 2 a 6 em aberto.
- `index.html` e `README.md` ainda não existem — os links de navegação das
  páginas já apontam para as 5 ferramentas, então há 404 nos links das que
  ainda não foram construídas. Some sozinho conforme as fases avançam.

## Como rodar

```bash
# site
python -m http.server 8000        # depois abrir /tools/sample-size.html

# validação (node é só test runner; o site não tem dependência nenhuma)
cd validation
python reference_core.py  && node check_core.js
python reference_tool1.py && node check_tool1.js
```

## Restrições desta máquina

- **`node` foi instalado nesta sessão** via `winget install OpenJS.NodeJS.LTS`
  (v24.19.0). É **só test runner** — a stack travada do CLAUDE.md continua
  valendo: sem build, sem dependências, sem npm no que é publicado.
- **`gh` não instalado** → API pública do GitHub via `curl`.
- **R não instalado** e não necessário (o check triplo da Tool 3 substitui).
- Python 3.14.3 + `statsmodels==0.14.6` + `scipy==1.17.1` são o lado de
  referência de toda validação.
- Screenshot do browser precisa do painel visível; para checar layout, medir
  `scrollWidth` vs `clientWidth` via JS funciona sem isso.

## O que foi tentado e não funcionou

- `gh search repos` → comando não existe; resolvido com `curl` + API pública.
- Um dos 5 agentes de pesquisa (CUPED) morreu com erro de API antes de
  entregar; retomado com instrução de montar o relatório com o que já tinha.
- Tolerâncias iniciais da validação foram fixadas otimistas demais (1e-12 em
  tudo) e falharam por motivo errado. Agora cada rotina tem tolerância
  absoluta e relativa separadas, justificadas no `RESULTS.md`.
