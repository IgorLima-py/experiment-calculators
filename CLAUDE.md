# experiment-calculators — instruções permanentes

Suíte de calculadoras de experimentação (A/B, MDE, peeking, geo-holdout, CUPED) —
estática, mobile-first, publicada no GitHub Pages. Cada resultado sai com uma frase
de julgamento sobre o que o número significa e o que o invalidaria.

## Regras que valem sempre

- **Este repositório nasceu privado mas VAI ser público — com o histórico inteiro.**
  Todo commit, desde o primeiro, precisa passar no teste: *"isto pode ser lido por
  qualquer pessoa, para sempre?"* Se não pode, não entra.
- **Só dado público.** Nenhum dado, número ou método de qualquer empregador — atual ou
  anterior — nem anonimizado.
- **Nenhuma credencial no repo.** Segredos moram em `C:\chaves` / `~/chaves`.
- **Matemática validada é inegociável.** Nenhuma calculadora vai ao ar sem o
  cross-check contra implementação de referência (statsmodels, Evan Miller),
  com a comparação publicada no repo. Calculadora sutilmente errada é pior que
  nenhuma calculadora.
- **Stack travada:** HTML + JS vanilla, sem framework, sem build step, sem backend.
  Se uma sessão propuser React "pra facilitar", a resposta é não.
- **Padrão de honestidade:** toda ferramenta documenta suas premissas estatísticas
  (ex.: aproximação normal) e o que ela NÃO cobre.
- **Idioma:** artefatos do repo (código, comentários, UI, README) em **inglês**.
  Conversa com o Igor e docs de sessão (`docs/STATUS.md`, `docs/PLAN.md`) em português.
- O planejamento mais amplo do portfólio mora em repositório privado separado.
  **Nada de lá é citado ou copiado para cá.**
- **Texto formal que outra pessoa vai ler** (e-mail, proposta, README, descrição de PR) passa pela skill `humanize` antes de sair, e sai como rascunho: quem envia é o Igor.

A linha de contrato da bateria, sozinha e na coluna zero (quem lê é o hook de push do
plugin `playbook`, o subagente `bateria` e o `/tchau`):

bateria: node validation\check_core.js && node validation\check_tool1.js && node validation\check_tool2.js && node validation\check_tool3.js && node validation\check_tool3_spending.js && node validation\check_tool4.js && node validation\check_tool5.js

## O que roda onde

Qualquer máquina — é site estático (testar local com `python -m http.server` serve).
Sessão na nuvem funciona bem. GitHub Pages só liga quando o repo virar público
(conta free) — desenvolve privado, o Igor vira a chave quando estiver pronto.

## A primeira sessão — planejamento (antes de qualquer código)

Esta pasta ainda não tem plano. A primeira sessão de trabalho:

1. Lê `BRIEF.md` inteiro — ele é o escopo de partida, não o plano.
2. **Pesquisa na internet, a fundo** — a seção "Open questions for the planning
   session" do brief é o roteiro: censo das calculadoras existentes e suas lacunas,
   implementações de referência para validação, método sequencial do Tool 3,
   referências canônicas de CUPED/delta method, padrões de UX de URL compartilhável.
3. Escreve `docs/PLAN.md` (plano completo, ferramenta por ferramenta, com ordem e
   estimativas) e `docs/REFERENCES.md` (tudo que achou, com links e o que cada
   fonte vale).
4. Mostra o plano ao Igor e **só começa a executar depois do OK dele.**

## Ao abrir a sessão

Executado pelo comando `/oi`.

1. `git pull` e `git log --oneline -5`.
2. Leia `docs/STATUS.md` por inteiro; na primeira vez, leia também `BRIEF.md`.
3. `git status --short`.
4. Diga onde paramos e qual é o próximo passo concreto.

## Ao encerrar a sessão

Executado pelo comando `/tchau`.

1. Escreva o handoff em `docs/STATUS.md`: o que foi feito, o que ficou pela metade,
   o que falhou e por quê, o próximo passo concreto.
2. Confira `git status --porcelain`: nenhum segredo, nenhum arquivo acima de 50 MB.
3. Reaplique o teste do público a tudo que está entrando.
4. `git add -A`, commit descritivo em inglês, `git push`.
