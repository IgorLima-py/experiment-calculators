# Status

*Atualizado em 2026-08-26, fim da sessão de construção.*

## Onde estamos

**As 6 fases do `docs/PLAN.md` estão concluídas.** As 5 ferramentas do BRIEF
estão construídas, validadas e commitadas. Licença MIT escolhida pelo Igor e
adicionada. O Definition of Done do BRIEF fecha, faltando só virar o repo
público — que é ação manual do Igor.

| Fase | Entrega | Validação |
|---|---|---|
| 0 | `assets/stats.js`, `ui.js`, `style.css` | 546 casos vs scipy |
| 1 | `tools/sample-size.html` | vs statsmodels: **7.9e-16** |
| 2 | `tools/mde.html` | vs statsmodels invertido: **1.5e-13** |
| 3 ⭐ | `tools/peeking.html`, `assets/sequential.js` | **4 rotas**: recursão vs scipy MVN (8.1e-6) vs tabelas de 1969/77/79 vs Monte Carlo de 1M |
| 4 | `tools/geo-holdout.html`, `assets/geo.js` | vs `scipy.stats.nct` **e** `TTestIndPower`: **3.1e-14** |
| 5 | `tools/cuped.html`, `assets/cuped.js` | numpy sobre dados idênticos: **1.9e-13**; teoria confirmada por Monte Carlo |
| 6 | `index.html`, `README.md`, `LICENSE` | 6 suítes passam; 14 URLs 200; varredura de segredos limpa |

## Próximo passo imediato

**Virar o repositório público no GitHub** (`IgorLima-py/experiment-calculators`),
o que liga o GitHub Pages na conta free. Nada no código depende disso; o site
é estático e roda em qualquer lugar. Não há mais nada a desenvolver para
cumprir o BRIEF.

## O que NÃO foi verificado (leia antes de publicar)

Isto não são bugs conhecidos — são lacunas honestas de verificação:

- **Ninguém olhou as páginas com os próprios olhos.** O painel do browser ficou
  oculto a sessão inteira e todo screenshot falhou. O layout foi conferido
  medindo `scrollWidth` vs `clientWidth` e lendo o DOM, o que pega overflow
  horizontal mas **não** pega "está feio", "o contraste está ruim" ou "o
  gráfico ficou torto". Abrir as 6 páginas e olhar é o primeiro passo
  recomendado antes de publicar.
- **Um único motor de browser.** Tudo testado no Chromium do painel. Sem
  Safari, sem Firefox.
- **O texto em inglês não foi revisado por humano.**

No fim da sessão as 6 páginas foram abertas em abas do painel do Browser para
o Igor revisar visualmente. Se ele passou os olhos e não reclamou, a primeira
lacuna acima está fechada na prática — mas **não há registro disso aqui**, e
a próxima sessão não tem como saber. Na dúvida, abra e olhe:

```bash
python serve.py 8000
# index.html, tools/sample-size.html, tools/mde.html,
# tools/peeking.html, tools/geo-holdout.html, tools/cuped.html
```

## Melhorias possíveis (nenhuma bloqueia)

- Painel de skewness/winsorização na Tool 5 — cortado deliberadamente; o
  conteúdo virou texto na lista de equívocos.
- UI para peeks desigualmente espaçados na Tool 3. O código já existe e
  funciona (`Sequential.overallAlphaUneven` e `Sequential.spendingBounds`),
  só não há interface que os exponha.
- Uma página de validação em HTML, para quem não roda Python.

## Como rodar

O site não precisa de nada além de um servidor de arquivos estáticos.

```bash
python serve.py 8000     # servidor sem cache; ver armadilhas abaixo
```

Validação completa (as 6 suítes):

```bash
cd validation
python reference_core.py  && node check_core.js
python reference_tool1.py && node check_tool1.js
python reference_tool2.py && node check_tool2.js
python reference_tool3.py && node check_tool3.js   # ~7 min só o reference
python reference_tool4.py && node check_tool4.js
python reference_tool5.py && node check_tool5.js
```

## Setup numa máquina nova

O **site** não precisa de nada. Só a **validação** precisa:

- **Python 3** com `numpy`, `scipy==1.17.1`, `statsmodels==0.14.6`.
- **Node** — nesta máquina foi instalado com
  `winget install OpenJS.NodeJS.LTS` (v24.19.0). É **só test runner**: a stack
  travada do CLAUDE.md continua valendo, e nada do que é publicado usa npm.
  Não existe `package.json`, de propósito.
- **R não é necessário** — o check quádruplo da Tool 3 substitui
  `gsDesign`/`ldbounds`, que ficam apenas citados.

## Armadilhas que já custaram tempo

Presas a esta máquina ou ao ambiente de browser do Claude Code:

- **Use `serve.py`, não `python -m http.server`.** O cache do browser servia
  `.js` antigo e me fez depurar código que não estava mais em disco.
- **Screenshot exige o painel do browser visível**, senão dá timeout. Medir
  `scrollWidth` vs `clientWidth` por JS funciona sem isso.
- **`requestAnimationFrame` não dispara com o painel oculto** — zero frames em
  3 segundos. Por isso a simulação da Tool 3 cai para `setTimeout` quando
  `document.hidden`; isso também é melhor para o usuário real, que perderia a
  simulação ao trocar de aba.
- **O buffer de console do browser persiste entre navegações.** Erros antigos
  reaparecem e parecem atuais; confirme com `typeof` antes de sair caçando.
- **`gh` não está instalado** → API pública do GitHub via `curl`.
- **Usuário do GitHub é `IgorLima-py`** (o do remote), não o que se deduz do
  e-mail do commit. Já corrigido em todos os rodapés.

## O que foi tentado e não funcionou

- `gh search repos` → comando não existe aqui; resolvido com `curl` +
  `https://api.github.com/search/repositories`.
- Um dos 5 agentes de pesquisa (CUPED) morreu com erro de API antes de
  entregar; retomado pedindo o relatório com o que já tinha coletado.
- Tolerâncias de validação fixadas otimistas demais (1e-12 em tudo) falharam
  por motivo errado. Agora cada rotina tem tolerância absoluta **e** relativa
  separadas, justificadas no `RESULTS.md`.
- **A integração multivariada do scipy não escala.** A primeira versão do
  `reference_tool3.py` ia até 50 looks e rodou 20+ min sem retornar valor
  usável — o algoritmo de Genz é quasi-Monte Carlo e em dimensão alta fica
  lento *e* impreciso. Limitada a 12 looks; acima disso valem tabela publicada
  + Monte Carlo, e isso está documentado no `RESULTS.md`.
- `eval(src + ';Nome')` com `const Nome` colide com o `var Nome` do script.
  Os `check_*.js` usam eval indireto `(0,eval)(...)` + `global.Nome`.
- Mensagem de commit com aspas duplas quebra o shell. Usar heredoc
  (`git commit -F -`).

## Defeitos que a validação pegou (o argumento para ela existir)

Nenhum foi achado por inspeção; todos por comparação com implementação de
referência. Estão detalhados no `validation/RESULTS.md`.

1. `tCdf` perdia toda a precisão perto de t=0 com ν grande — a forma
   `nu/(nu+t²)` arredonda para exatamente 1 e a CDF voltava achatada em 0.5
   numa vizinhança inteira da origem. Travava o `tQuantile` em 2.4e-7; agora
   2.5e-12.
2. `normalQuantile` cancelava o próprio refino de Halley para p perto de 1.
   Resolvido resolvendo sempre na cauda inferior e espelhando.
3. **A fórmula fechada de MDE da literatura de cluster trials não entrega o
   poder que promete** — `(t_α + t_β)·SE` erra até 0,65 ponto percentual, e o
   erro cresce conforme os graus de liberdade caem, exatamente o regime dos
   geo testes. Trocada por inversão numérica exata da função de poder; a forma
   fechada segue publicada ao lado, com a diferença medida.
4. O parser de dados colados lia o dígito de "Market 1" como receita daquele
   mercado — média 13 onde a resposta era 53.806. Agora lê do fim da linha e
   usa a razão mediana entre os dois últimos números para distinguir coluna de
   pré-período de índice solto.
