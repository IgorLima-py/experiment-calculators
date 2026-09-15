---
description: Retoma o trabalho — pull, lê o estado do projeto e diz onde paramos
argument-hint: [observação opcional, ex. a fatia que eu quero abrir]
---

Estamos abrindo uma sessão de trabalho. Faça isto **antes** de me responder qualquer coisa,
e sem me perguntar nada:

0. **Confira o perfil da sessão ANTES de qualquer outra coisa.** É o passo mais barato que
   existe, porque ainda não há contexto para reprocessar se eu tiver de trocar de modelo.

   a. **Se a abertura já injetou um bloco `docs/PROXIMO.md pede:`**, use-o. Ele veio do hook
      `SessionStart` e não custou chamada de ferramenta nenhuma — não releia o arquivo. **Ele
      é o ponteiro de antes do `git pull`**: numa máquina atrasada, pode ser a fatia velha. O
      passo 1 confere isso.
   b. **Se não houver bloco**, leia você mesmo o `docs/PROXIMO.md`. Se ele não existir, este
      projeto não tem ponteiro: pule o passo 0 inteiro e não invente perfil.
   c. **Modelo.** O modelo desta sessão está no seu prompt de sistema. Compare com o `modelo:`
      do ponteiro. **Bater é igualdade exata.**
   d. **Esforço.** O hook tenta conferir sozinho, lendo `$env:CLAUDE_EFFORT`, e a linha vem pronta
      no bloco: `BATE`, `NAO BATE`, ou `NAO CONSEGUI CONFERIR`. Se veio `BATE` ou `NAO BATE`,
      repita. **Se veio `NAO CONSEGUI CONFERIR`, ou se o bloco não veio, meça você**: uma chamada
      só, na **ferramenta Bash**, `echo $CLAUDE_EFFORT`. Não meça pelo PowerShell: medido em
      10/09/2026 no app de desktop, a variável chega vazia no hook e na ferramenta PowerShell, e
      chega certa no Bash. **Bater é igualdade exata**, e **esforço maior também está errado** —
      é token a mais cobrado em todo turno, não margem de segurança.
   e. **Vazio, ausente ou ilegível nunca é «está certo».** É «não consegui conferir», e você diz
      isso com essas palavras. Vale para o modelo e para o esforço, e não é formalidade: até o
      C6 este comando afirmava que o esforço *não era conferível* — a variável existia o tempo
      todo, e 16 projetos receberam a afirmação errada.
   f. **Se o modelo NÃO bater: PARE TUDO.** Não rode mais nada, não leia mais nada, não comece a
      trabalhar. Responda só com o que está errado, o que deveria ser, e como trocar: `/model
      <modelo>` na interface, ou fechar e reabrir. Termine dizendo que é para me chamar de novo
      depois de trocar. Trocar de modelo custa proporcionalmente ao tamanho da conversa, e neste
      instante a conversa ainda não existe — é por isso que este passo é o zero.
   g. **Se o ponteiro pedir `plan-mode: sim`**, entre em plan mode você mesmo, com a ferramenta
      `EnterPlanMode` (medido em 11/09/2026: funciona). Só se ela não existir nesta sessão, diga
      em uma linha que é para eu entrar com Shift+Tab.
   h. **Se o ponteiro pedir uma `maquina:` que não é esta**, isso é a primeira coisa da resposta.

1. `git pull`. Se der conflito, ou se houver mudança local não commitada, **pare e me avise**
   antes de qualquer outra coisa. **Se o pull trouxe commit que mexe no `docs/PROXIMO.md`**, o
   bloco do passo 0.a era velho: releia o arquivo e refaça o passo 0 inteiro — inclusive o PARE
   TUDO do 0.f. Para saber, numa chamada só:

   ```bash
   antes=$(git rev-parse HEAD); git pull && git diff --stat "$antes" HEAD -- docs/PROXIMO.md
   ```

   Saída vazia depois do pull: o bloco valia.
2. Leia o `CLAUDE.md` da raiz do projeto. Se ele tiver uma seção **`## Ao abrir a sessão`**,
   execute os passos dela na ordem — é ali que mora o que é específico deste projeto.
3. Se o `CLAUDE.md` não tiver essa seção, faça o mínimo: leia o documento de estado que ele
   indicar (ou o `README.md`), e rode `git log --oneline -5` e `git status --short`. **Se a
   abertura já injetou o `git log` e o `git status`, não os rode de novo** — leia o que veio.

**Durante a sessão, até o `/tchau`, valem duas regras:**

- **Commit à vontade; push só no `/tchau`.** Quando uma parte do trabalho fica de pé, commit
  pequeno e com mensagem que diz o quê — é o ponto de volta se a próxima parte der errado. Mas
  **nunca `git push` fora do `/tchau`**: é ele que sobe tudo junto com o handoff, para a outra
  máquina nunca puxar código sem o `STATUS` que o explica. A exceção é tarefa explícita de
  propagação em **outro** repositório, que segue a receita dela.
- **Antes de sugerir `/tchau`, diga se fechou.** Uma linha, sem rodeio:
  `Fatia <C>: fechou — <a evidência do verificar:>` ou `Fatia <C>: não fechou — falta <o quê>`.
  Sem roadmap: `Trabalho de hoje: fechou/não fechou — <o quê>`. Sugerir `/tchau` sem essa linha
  deixa o Igor adivinhando se pode encerrar.

Se eu escrevi alguma observação depois do comando, ela diz o que eu quero abrir hoje — leve em
conta ao escolher o que reportar e ao propor o nome da sessão: $ARGUMENTS

Depois me responda em **no máximo 10 linhas**, nesta ordem:

- **Perfil**: a linha do passo 0 — qual fatia o ponteiro aponta, o modelo conferido, e o esforço
  (conferido pelo hook ou pelo Bash, ou «não consegui conferir»). Se o projeto não tem ponteiro,
  omita esta linha.
- **Onde paramos**: a última coisa feita e em que ponto do projeto ela deixou as coisas.
- **Próximo passo concreto**: o que o documento de estado aponta como próximo.
- **Pendências**: coisa não commitada, teste falhando, medição faltando, prazo vencendo.
- **Atenção**: o que eu preciso plugar, instalar ou conferir **nesta máquina** antes de
  começar. Se algo estiver faltando, diga qual e onde está documentado.

Por fim, **proponha um nome para esta sessão** e tente renomeá-la. O nome sai do trabalho, não
do comando: curto, específico, no formato `<assunto> — <o que se quer fechar>`, como
`F2 — aceite na rua` ou `corredor não aparece`. Se o projeto tem roadmap, o assunto é o código da
fatia: `C4 — parser BLE do sensor`. Nunca "oi", nunca um número solto, nunca o nome do projeto
sozinho (a barra lateral já agrupa por projeto).

Se você não conseguir renomear a si mesmo, apenas mostre o nome sugerido em uma linha, para eu
colar clicando no título da sessão. Não insista nem tente contornar.

Termine perguntando o que vamos fazer hoje. **Não comece a trabalhar antes de eu responder.**
