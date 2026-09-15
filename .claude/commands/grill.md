---
description: Entrevista a fundo — pergunta só o que muda o plano, com a opção recomendada em cada pergunta, e registra as decisões
argument-hint: [assunto — a fatia, uma feature, ou vazio para o projeto inteiro]
model: opus
effort: high
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git status:*), Bash(git diff:*), Bash(git ls-tree:*)
disallowed-tools: Write, Edit, NotebookEdit
---

Você vai me entrevistar sobre **$ARGUMENTS** (vazio = o projeto inteiro) até a gente ter o mesmo
entendimento — e vai tirar de mim o que eu não teria dito sozinho. Não é para planejar a fila:
isso é o `/360`. É para **decidir**, com a opção recomendada na mesa, e deixar a decisão escrita.

A trava de escrita é do harness: enquanto a entrevista roda, `Write` e `Edit` não existem no seu
alcance. Ela cai na minha mensagem seguinte — que é o «grava», o momento em que eu aprovei.

## Quando NÃO me use

- **O pedido cabe numa frase** («renomeie X», «troque a cor») — faça, não entreviste.
- **A dúvida é um fato do repositório** — leia e responda; fato não se pergunta.
- **Projeto sem roadmap e sem direção** — é o `/360`, que já me chama por dentro.

## O que eu leio antes da primeira pergunta

1. O `CLAUDE.md`, o `docs/STATUS.md`, e o `docs/ROADMAP.md` se existir — **inclusive o bloco 5,
   «Decisões da entrevista»: o que está lá como `respondida` ou `fora` não se pergunta de novo**,
   a não ser que o contexto tenha mudado, e aí diga o que mudou.
2. O `docs/DESVIOS.md`, se existir.
3. `%USERPROFILE%\Desktop\Side-Projects\playbook\docs\ESTADO-DA-ARTE.md` — o **Catálogo** (o que
   já foi avaliado, para que tipo de projeto, com risco e receita) e o **Critério** para MCP,
   plugin e multiagente. É dali que sai o que eu sugiro instalar.

## Como eu entrevisto

1. **Destino e profundidade, primeiro, numa chamada só de `AskUserQuestion`.** Duas perguntas:
   - *«O destino que entendi é: <uma frase — o que existe quando isto estiver pronto>. Confere?»*
   - *«Quanto você quer ser espremido?»*, com a recomendação tirada do que eu li:
     - **Fundo** — rodadas até a árvore esvaziar, cada rodada com a saída «chega, segue com o
       que tem», e no fim a confirmação do entendimento comum;
     - **Médio** — uma rodada, as perguntas de maior impacto;
     - **Segue sozinho** — nenhuma pergunta: adoto a opção recomendada de cada decisão e a
       registro como `assumida`, para você revisar depois.
       **Exceção:** instalar algo com hook, script, MCP ou rede **sempre** vira pergunta, mesmo
       aqui — é a única que eu faço.
2. **Fato é meu, decisão é sua.** Antes de perguntar, procure: `Read`, `Grep`, ou um subagente
   `Explore` para o que for largo. Nunca me pergunte o que o repositório responde. Pergunta que
   depende de uma busca ainda em curso espera a busca.
3. **A árvore, em rodadas.** Cada decisão abre as que dependem dela. Cada rodada pergunta a
   **fronteira** — as decisões cujos pré-requisitos já estão resolvidos —, no máximo **4 por
   chamada** de `AskUserQuestion` (é o limite da ferramenta). A pergunta que depende de outra
   ainda aberta vai para a rodada seguinte. Recalcule a fronteira depois de cada resposta.
4. **Cada pergunta** é de múltipla escolha, com a opção recomendada **primeiro**, marcada
   `(Recomendado)`, e o porquê na descrição. Pergunte só o que, respondido de outro jeito, muda
   o plano — perguntar por perguntar é ruído.
5. **O que ninguém pediu.** Uma entrevista que só confirma o que eu já planejei não vale o
   `opus`. Três fontes:
   - **sinais do repositório:** arquivo de credencial ou `.env`, lock file, teste e lint (ou a
     falta deles), CPF/CNPJ no código, comando que se repete nos handoffs do `STATUS.md`. Cada
     sinal pode virar sugestão de hook, skill ou subagente — **no máximo 1 ou 2 por tipo**;
   - **o Catálogo e o Critério** do `ESTADO-DA-ARTE.md`: quando o projeto tem o sinal (UI,
     linguagem tipada, dado de cliente), sugira a peça certa. Item fora do catálogo: leia o que
     ele instala **antes** de sugerir — recomendar pelo nome é o erro do `kotlin-lsp`;
   - **os ângulos do 360:** quem usa e como, dado (onde mora, se é de cliente), falha e
     recuperação, segurança, custo (API, tokens), as duas máquinas, manutenção, portfólio.

   No **Fundo**, cada achado vira pergunta. No **Médio**, no máximo 2 deles entram na rodada.
6. **Nunca pergunte em prosa encerrando o turno.** Toda pergunta vai por `AskUserQuestion`, que
   responde dentro do mesmo turno. Pergunta em prosa me faz responder numa mensagem nova — e a
   mensagem nova derruba a trava de escrita e o `opus` deste comando.
7. **O refutador, antes de apresentar as decisões.** Dispare **um** subagente de contexto limpo
   com as linhas de decisão, o `CLAUDE.md` e o **Critério** do `ESTADO-DA-ARTE.md`, e a ordem de
   derrubar. Ele reporta só:
   - duas respostas que se contradizem;
   - decisão que contradiz regra escrita, recusa registrada ou o Critério;
   - `assumida` arriscada, que merecia pergunta;
   - ramo da árvore deixado aberto **em silêncio** — nada pode ter sido assumido sem dizer;
   - instalação aceita que não passa no Critério.

   Estilo não é achado. Achado real volta como pergunta numa rodada extra. **Dentro do `/360`
   este passo não roda à parte:** o refutador do roadmap já recebe as decisões e cobre as duas
   coisas, num subagente só.

## O que sai

Uma linha por decisão, neste formato — é o que o bloco 5 do roadmap guarda:

```
AAAA-MM-DD | respondida | <a pergunta> | <a resposta> | <o que isso muda>
AAAA-MM-DD | assumida   | <a decisão>  | <a recomendação adotada> | <o que isso muda>
AAAA-MM-DD | fora       | <o item>     | <por que fica de fora> | —
AAAA-MM-DD | aberta     | <a pergunta> | <por que não deu para decidir agora> | <o que ela trava>
```

Apresente as linhas e o que muda, e **pare**. Minha próxima mensagem é o «grava».

- **Com `docs/ROADMAP.md`:** as linhas vão para o **bloco 5, «Decisões da entrevista»** — crie
  o bloco no fim do arquivo se ele não existir. Só acrescente, nunca reescreva linha antiga.
- **Sem roadmap:** não crie arquivo. As linhas ficam no fim da resposta, e o `/tchau` as
  registra no handoff.
- **Se alguma decisão muda a fila** (fatia nova, fatia que some, ordem), não mexa na fila: diga
  *«isto muda a fila — rode o `/360` para reavaliar»*. Ele lê o bloco 5 e não pergunta de novo.

## Depois do «grava»: instalar o que foi aceito

Instalação aceita na entrevista é feita **agora**, na mesma sessão, pela receita do Catálogo —
não vira fatia, a não ser que seja grande (binário no PATH, conta a criar, credencial que só eu
digito). Grande vira fatia comum na fila, pelo `/360`.

- **Skill:** copie a pasta para `.claude/skills/<nome>/`, com o `LICENSE` junto quando a
  licença pedir.
- **Plugin:** acrescente em `enabledPlugins` no `.claude/settings.json` — **mescla, nunca cópia
  por cima**: o `settings.json` é a lista de quem está contratado, e sobrescrever demite todo
  mundo em silêncio. Diga se a outra máquina precisa passar pelo **+ → Plugins** do app.
- **MCP:** declare no `.mcp.json` do projeto, nunca no nível de usuário.
- **Hook ou subagente sugerido pelos sinais:** o arquivo em `.claude/hooks/` ou `.claude/agents/`,
  com o `settings.json` mesclado se for hook.

Antes do commit, `git check-ignore -v <cada caminho>` — sem as exceções de `.claude/` no
`.gitignore`, a peça chega e some no primeiro commit sem erro nenhum. Commit **limitado aos
caminhos instalados**, nunca `add -A`.

---

Colhido e reescrito, com crédito: o `grilling` e o `wayfinder` de
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT), o `clarify` do
[github/spec-kit](https://github.com/github/spec-kit) (MIT), e a varredura de sinais do
`claude-code-setup` de [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
(Apache-2.0).
