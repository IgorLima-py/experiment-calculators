# Status

*Atualizado em 2026-08-26.*

## Onde estamos

**Planejamento concluído e aprovado pelo Igor.** Pesquisa profunda feita (5
frentes, ~80 fontes) → `docs/PLAN.md` e `docs/REFERENCES.md` escritos.
3 scripts de validação já rodam e reproduzem as tabelas canônicas
(`validation/`).

Decisões travadas nesta sessão:

- **Intuito: peça de portfólio**, não produto. Confirmado pelo Igor. Isso define
  a régua: o que importa é provar competência, não ganhar usuário. (O GitHub
  confirma que a categoria não tem demanda: 170 repos de "ab test calculator",
  o mais estrelado tem 36 estrelas.)
- **Escopo: as 5 ferramentas do BRIEF**, mantidas.
- **Método da Tool 3 (era a pendência): híbrido** — recursão exata de
  Armitage–McPherson para os números + Pocock como manchete + O'Brien-Fleming
  e Lan-DeMets na aba avançada + simulação Monte Carlo ao vivo. Ver PLAN §3.
- **Tool 1: fórmula pooled p̄** como primária (bate com statsmodels); a
  convenção do Evan Miller entra na tabela comparativa com a explicação da
  diferença.

## Próximo passo imediato

**Fase 0 do `docs/PLAN.md` §5** — esqueleto e núcleo numérico. Começar por
**0.1** (`assets/stats.js`). Nada de código escrito ainda.

O PLAN §5 está dividido em fases com checkboxes e critério de "pronto quando".
Uma sessão nova: lê este arquivo, vai no PLAN §5, acha a primeira fase não
marcada, continua dali.

## Pendências

- Todas as fases 0–6 em aberto.
- Nada commitado desde o início da sessão de planejamento (PLAN.md,
  REFERENCES.md, validation/ estão como arquivos novos não commitados).

## Restrições desta máquina (já mordi)

- **`node` não instalado** → validar JS no browser (`python -m http.server` +
  página de validação), não por linha de comando.
- **`gh` não instalado** → API pública do GitHub via `curl`.
- **R não instalado** e não necessário.
- Python 3.14.3 + `statsmodels==0.14.6` + `scipy==1.17.1` funcionam e são o
  lado de referência.

## O que foi tentado e não funcionou

- `gh search repos` → comando não existe nesta máquina; resolvido com
  `curl https://api.github.com/search/repositories`.
- Um dos 5 agentes de pesquisa (CUPED) morreu com erro de API antes de
  entregar; foi retomado com instrução de montar o relatório com o que já tinha
  coletado, e entregou.
