# Status

*Atualizado em 2026-08-26.*

## Onde estamos

**As 6 fases do `docs/PLAN.md` estão concluídas.** As 5 ferramentas do BRIEF
estão no ar localmente, validadas e commitadas. O Definition of Done do BRIEF
fecha, com duas exceções que são decisão do Igor (licença e virar público).

| Fase | Entrega | Validação |
|---|---|---|
| 0 | `stats.js`, `ui.js`, `style.css` | 546 casos vs scipy |
| 1 | `tools/sample-size.html` | vs statsmodels: **7.9e-16** |
| 2 | `tools/mde.html` | vs statsmodels invertido: **1.5e-13** |
| 3 ⭐ | `tools/peeking.html` | **4 rotas**: recursão vs scipy MVN (8.1e-6) vs tabelas de 1969/77/79 vs Monte Carlo de 1M |
| 4 | `tools/geo-holdout.html` | vs `scipy.stats.nct` **e** `TTestIndPower`: **3.1e-14** |
| 5 | `tools/cuped.html` | numpy sobre dados idênticos: **1.9e-13**; teoria confirmada por Monte Carlo |
| 6 | `index.html`, `README.md` | 6 suítes passam; 14 URLs 200; varredura de segredos limpa |

## Próximo passo imediato

**Duas decisões do Igor, nesta ordem:**

1. **Escolher licença.** Não escolhi por você. Sem arquivo `LICENSE`, o padrão
   legal é "todos os direitos reservados" — ninguém pode reusar o código, o
   que para peça de portfólio normalmente não é o desejado. MIT é o default.
   A seção de licença foi removida do `README.md` para não afirmar o que não
   existe; se criar o `LICENSE`, reponha a seção.
2. **`git push` e virar o repo público.** O GitHub Pages liga junto (conta
   free só serve Pages de repo público). Nada no código depende disso.

Depois disso, melhorias possíveis (nenhuma bloqueia):

- Painel de skewness/winsorização na Tool 5 (cortado deliberadamente; o
  conteúdo virou texto na lista de equívocos).
- Aba de peeks desigualmente espaçados exposta na UI da Tool 3
  (`Sequential.overallAlphaUneven` e `spendingBounds` já existem e funcionam,
  mas nenhuma UI os expõe ainda).
- Uma página de validação em HTML, para quem não roda Python.

## Pendências

- Nada foi feito `git push` — todos os commits são locais.
- Sem `LICENSE` (ver acima).

## Como rodar

```bash
# site
python serve.py 8000     # servidor sem cache; ver armadilhas abaixo

# validação completa (as 6 suítes)
cd validation
python reference_core.py  && node check_core.js
python reference_tool1.py && node check_tool1.js
python reference_tool2.py && node check_tool2.js
python reference_tool3.py && node check_tool3.js   # ~7 min só o reference
python reference_tool4.py && node check_tool4.js
python reference_tool5.py && node check_tool5.js
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
- **O buffer de console do browser persiste entre navegações.** Erros antigos
  reaparecem e parecem atuais; confirme com `typeof` antes de sair caçando.
- **`gh` não instalado** → API pública do GitHub via `curl`.
- **R não instalado** e não necessário.
- Python 3.14.3 + `statsmodels==0.14.6` + `scipy==1.17.1` são o lado de
  referência.
- Usuário do GitHub é **`IgorLima-py`** (o remote), não o que se deduz do
  e-mail. Já corrigido nos rodapés.

## O que foi tentado e não funcionou

- `gh search repos` → não existe aqui; resolvido com `curl` + API pública.
- Agente de pesquisa de CUPED morreu com erro de API; retomado pedindo o
  relatório com o que já tinha coletado.
- Tolerâncias de validação fixadas otimistas demais (1e-12 em tudo) falharam
  por motivo errado. Agora cada rotina tem tolerância absoluta e relativa
  separadas, justificadas no `RESULTS.md`.
- **Integração multivariada do scipy não escala.** A primeira versão do
  `reference_tool3.py` ia até 50 looks e rodou 20+ min sem retornar. Limitada
  a 12 looks; acima disso valem tabela publicada + Monte Carlo.
- `eval(src + ';Nome')` com `const Nome` colide com o `var Nome` do script.
  Os `check_*.js` usam eval indireto `(0,eval)(...)` + `global.Nome`.
- Mensagem de commit com aspas duplas quebra o shell. Usar heredoc
  (`git commit -F -`).

## Defeitos que a validação pegou (o argumento para ela existir)

Nenhum destes foi achado por inspeção; todos por comparação com referência.

1. `tCdf` perdia toda a precisão perto de t=0 com ν grande — `nu/(nu+t²)`
   arredonda para exatamente 1. Travava o `tQuantile` em 2.4e-7.
2. `normalQuantile` cancelava o próprio refino de Halley para p perto de 1.
3. A fórmula fechada de MDE da literatura de cluster trials não entrega o
   poder que promete — erra até 0,65 ponto percentual, pior justamente onde
   geo testes vivem. Trocada por inversão exata.
4. O parser de dados colados lia o dígito de "Market 1" como receita — média
   13 onde a resposta era 53.806.
