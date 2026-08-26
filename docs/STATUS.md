# Status

*Atualizado em 2026-08-26.*

## Onde estamos

Planejamento aprovado. **Fases 0, 1, 2 e 3 concluídas, validadas e commitadas.**

Decisões travadas (não reabrir sem motivo):

- **Intuito: peça de portfólio**, não produto. Confirmado pelo Igor. A régua é
  provar competência, não ganhar usuário. (170 repos de "ab test calculator" no
  GitHub, o mais estrelado tem 36 estrelas — a categoria não tem demanda lá.)
- **Escopo: as 5 ferramentas do BRIEF**, mantidas.
- **Tool 1: fórmula pooled p̄** como primária; a convenção do Evan Miller entra
  na tabela comparativa com a explicação da diferença.
- **Tool 3: híbrido** — recursão exata + Pocock como manchete + OBF/spending na
  aba avançada + simulação ao vivo. Entregue exatamente assim.

### O que está pronto

| Fase | Entrega | Validação |
|---|---|---|
| 0 | `stats.js`, `ui.js`, `style.css` | 546 casos vs scipy, tolerâncias documentadas |
| 1 | `tools/sample-size.html` | vs statsmodels: **7.9e-16** |
| 2 | `tools/mde.html` | vs statsmodels invertido: **1.5e-13**; round-trip **2.2e-13** |
| 3 ⭐ | `tools/peeking.html`, `sequential.js` | **quatro rotas**: recursão vs scipy MVN (8.1e-6) vs tabelas publicadas vs Monte Carlo de 1M |

## Próximo passo imediato

**Fase 4 do `docs/PLAN.md` §5** — Tool 4 (geo-holdout), item **4.1**:
`geoMde()` e `geoPower()`, t de duas amostras com geos como unidades,
`CV_eff = CV·√(1−ρ²)`, poder por t não-central. `Stats.tQuantile` e
`Stats.noncentralTCdf` já estão prontos e validados contra o scipy.

O PLAN §5 tem todas as fases com checkboxes e critério de "pronto quando".
Uma sessão nova: lê este arquivo, vai no PLAN §5, acha a primeira fase não
marcada, continua dali.

## Pendências

- Fases 4, 5 e 6 em aberto.
- `index.html` e `README.md` ainda não existem — a navegação das páginas já
  aponta para as 5 ferramentas, então há 404 nos links de `geo-holdout.html`,
  `cuped.html` e `index.html`. Fecha na Fase 6.
- Nada foi feito `git push` ainda (só commits locais).

## Como rodar

```bash
# site (servidor sem cache — importante, ver abaixo)
python serve.py 8000

# validação completa
cd validation
python reference_core.py  && node check_core.js
python reference_tool1.py && node check_tool1.js
python reference_tool2.py && node check_tool2.js
python reference_tool3.py && node check_tool3.js   # ~7 min só o reference
```

## Restrições e armadilhas desta máquina

- **`node` instalado nesta sessão** (`winget install OpenJS.NodeJS.LTS`,
  v24.19.0). É **só test runner** — a stack travada do CLAUDE.md continua:
  sem build, sem dependências, sem npm no que é publicado.
- **Use `serve.py`, não `python -m http.server`.** O cache do browser servia
  `.js` antigo e me fez depurar código que não estava mais em disco.
- **Screenshot do browser exige o painel visível.** Para checar layout, medir
  `scrollWidth` vs `clientWidth` por JS funciona sem isso.
- **`requestAnimationFrame` não dispara com o painel oculto** — zero frames.
  Por isso a simulação da Tool 3 cai para `setTimeout` quando `document.hidden`.
- **`gh` não instalado** → API pública do GitHub via `curl`.
- **R não instalado** e não necessário.
- Python 3.14.3 + `statsmodels==0.14.6` + `scipy==1.17.1` são o lado de
  referência.

## O que foi tentado e não funcionou

- `gh search repos` → não existe aqui; resolvido com `curl` + API pública.
- Agente de pesquisa de CUPED morreu com erro de API; retomado pedindo o
  relatório com o que já tinha coletado.
- Tolerâncias de validação fixadas otimistas demais (1e-12 em tudo) falharam
  por motivo errado. Agora cada rotina tem tolerância absoluta e relativa
  separadas, justificadas no `RESULTS.md`.
- **Integração multivariada do scipy não escala.** A primeira versão do
  `reference_tool3.py` ia até 50 looks e rodou 20+ min sem retornar. Limitada a
  12 looks; acima disso valem tabela publicada + Monte Carlo. Documentado.
- `eval(src + ';Nome')` com `const Nome` colide com o `var Nome` do script.
  Os `check_*.js` usam eval indireto `(0,eval)(...)` + `global.Nome`.
