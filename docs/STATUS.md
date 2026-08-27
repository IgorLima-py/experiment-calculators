# Status

*Atualizado em 2026-08-27, fim da sessão de auditoria.*

## Onde estamos

As 6 fases do `docs/PLAN.md` já estavam concluídas. Esta sessão fez uma
**auditoria end-to-end** do que existia, achou três defeitos que teriam ido ao
ar, e fechou todos os itens levantados. O plano de correções, com evidência
medida e critério de aceite por item, está em **`docs/FIXES.md`** — todos os
nove itens estão `FEITO`.

| Item | O que era | Estado |
|---|---|---|
| P0.1 | Frase de julgamento da Tool 1 chumbava "14%" para qualquer alpha | FEITO |
| P0.2 | Link da validação servia `text/markdown` e baixava arquivo | FEITO |
| P0.3 | Sem favicon, OG, canonical, robots, 404 | FEITO |
| P1.1 | Demo de ratio metrics travada em 3 sessões/usuário | FEITO |
| P1.2 | Tool 3 congelava a thread principal por segundos | FEITO |
| P1.3 | Links de nav com 22 px no mobile | FEITO |
| P1.4 | Campo `holdout` exibia número que a conta não usava | FEITO |
| P2.1 | `spendingBounds` validado e inalcançável pelo usuário | FEITO |
| P2.2 | Docs de sessão em português indo a público sem enquadramento | FEITO |

O defeito mais sério era o P0.1: a frase de julgamento — que pelo BRIEF é o
produto inteiro — afirmava 14% em qualquer nível de significância, quando o
valor real é 3,3% a 1% e 26,0% a 10%. A Tool 3 do próprio site desmentia a
Tool 1 a um clique de distância.

## Próximo passo imediato

**Continua sendo virar o repositório público no GitHub**
(`IgorLima-py/experiment-calculators`), o que liga o GitHub Pages na conta free.
Nada no código depende disso.

Antes de virar a chave, o item abaixo continua aberto.

## O que NÃO foi verificado (leia antes de publicar)

- **Ninguém olhou as páginas com os próprios olhos. Ainda.** O painel do
  browser continua oculto e **todo screenshot falhou de novo**, exatamente como
  na sessão de construção. O que foi verificado nesta sessão, por DOM e CSS
  computado: nenhuma página tem overflow horizontal a 375 px, nenhum controle
  interativo abaixo de 24 px, contraste entre 5,0 e 17,8:1 no claro e 6,7 e
  15,3:1 no escuro, console limpo, todos os links internos resolvem, uma `h1`
  por página. Isso pega estrutura e acessibilidade; **não** pega "está feio" ou
  "o gráfico ficou torto". Abrir as 7 páginas e olhar continua sendo o primeiro
  passo recomendado.
- **Um único motor de browser.** Tudo em Chromium. Sem Safari, sem Firefox.
- **O texto em inglês não foi revisado por humano.**

```bash
python serve.py 8000
# index.html, tools/{sample-size,mde,peeking,geo-holdout,cuped}.html,
# validation/index.html, 404.html
```

## O que mudou na estrutura

- **`validation/index.html`** — a validação agora é uma página do site, gerada
  de `RESULTS.md` por `validation/build_page.py`. O `.md` segue sendo a fonte
  da verdade; edite ele e regere. `--check` falha se a página estiver
  desatualizada.
- **`assets/og/*.png`** — imagens de link preview, geradas por
  `assets/build_og.py` (precisa de Pillow, só em desenvolvimento).
- **`assets/tasks.js` + `compute-worker.js` + `compute.js`** — trabalho pesado
  fora da thread principal, com fallback síncrono quando o worker não sobe
  (`file://`). As duas rotas rodam o mesmo código, de propósito.
- **`docs/HOW-THIS-WAS-BUILT.md`** — em inglês, linkado do README: método,
  decisões, o que a validação pegou, e o papel do agente dito de frente.
- **Sétima suíte de validação** — `reference_tool3_spending.py` +
  `check_tool3_spending.js`, para as fronteiras de alpha spending.

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
python validation/build_page.py
python assets/build_og.py
```

## Setup numa máquina nova

O **site** não precisa de nada. Só a validação e os geradores precisam:

- **Python 3** com `numpy`, `scipy==1.17.1`, `statsmodels==0.14.6`, e
  **`Pillow`** (só para `build_og.py`).
- **Node** — só test runner (v24.19.0 aqui). Não existe `package.json`, de
  propósito.
- **R não é necessário.**

## Armadilhas que já custaram tempo

- **Use `serve.py`, não `python -m http.server`.** Cache do browser servindo
  `.js` velho.
- **Screenshot exige o painel do browser visível.** Falhou nas duas sessões.
  Medir por JS funciona sem isso e foi o que se usou.
- **`innerText` retorna vazio dentro de um `<details>` fechado.** Custou uma
  falsa pista nesta sessão: os avisos de validação da Tool 3 pareciam não estar
  sendo escritos. Use `textContent` para inspecionar conteúdo não renderizado.
- **Worker tem custo de arranque.** A primeira medição pareceu um bug — o
  callback "não chegava" — mas era só o tempo de subir o worker e baixar os
  quatro scripts. Resolvido construindo o worker no load, não na primeira
  chamada.
- **Heredoc do bash quebra com apóstrofos** em prosa longa; para arquivos
  grandes use a ferramenta de escrita.
- **`print()` do Python no console desta máquina é cp1252** e explode com `α`,
  `×` etc. O arquivo grava em UTF-8 normalmente; é só o stdout.
- **`requestAnimationFrame` não dispara com o painel oculto** — por isso a
  simulação da Tool 3 cai para `setTimeout` quando `document.hidden`.
- **O buffer de console do browser persiste entre navegações.**
- **`gh` não está instalado** → API pública do GitHub via `curl`.
- **Usuário do GitHub é `IgorLima-py`.**

## Um erro que vale registrar

Ao revisar as fronteiras de alpha spending, eu afirmei de memória que os
valores publicados para O'Brien-Fleming a 3 looks eram 3,471 / 2,454 / 2,004 e
que o código discordava. O código estava certo: aqueles são os valores da
fronteira **O'Brien-Fleming original** (que o `reference_tool3.py` já valida),
não os da fronteira de **gasto Lan-DeMets**, que é outro objeto e dá 3,395 /
2,407 / 2,015. O scipy confirmou o código de forma independente. Está
documentado no `RESULTS.md` numa seção própria, porque os nomes colidem e os
números são próximos o bastante para parecerem uma discrepância.

A lição é a do projeto: memória não é referência. Só a implementação
independente decide.

## Melhorias possíveis (nenhuma bloqueia)

- Painel de skewness/winsorização na Tool 5 — cortado deliberadamente.
- Revisão humana do inglês.
- Um segundo motor de browser.
