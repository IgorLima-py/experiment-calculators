---
description: Encerra a sessão — confere a fatia, escreve o handoff, commita e faz push
argument-hint: [observação a incorporar ao handoff]
disable-model-invocation: true
---

Vou parar por aqui e possivelmente continuar em **outra máquina, num chat novo que não terá
nada deste histórico**. Prepare a saída:

1. Leia o `CLAUDE.md` da raiz. Se ele tiver uma seção **`## Ao encerrar a sessão`**, execute
   os passos dela na ordem — é ali que mora o que é específico deste projeto. **Menos o commit
   e o push**, se ela tiver: esses são o passo 6, depois da varredura do passo 3. **E menos o
   avanço do ponteiro de fatia** (`ETAPA_ATUAL`, `PASSO ATUAL`, «Etapa atual» e afins), se ela
   mandar avançar: isso é o passo 4, depois da segunda opinião.
2. Se não tiver essa seção, faça o mínimo:
   - escreva o handoff no documento de estado do projeto: o que foi feito e em quais arquivos,
     o que ficou pela metade e onde exatamente parou, **o que foi tentado e falhou e por quê**,
     o próximo passo concreto (específico o bastante para alguém sem contexto executar), e o
     que estiver preso a esta máquina ou a hardware;
   - registre decisões e medições onde o projeto as guarda.

3. **Varredura de segredo — mecânica, não a olho.** Repositório privado não é desculpa: ele é
   clonado, copiado, e segredo em commit feito não sai com `git rm`.

   ```bash
   git add -A
   base=$(git rev-parse -q --verify '@{u}' || git hash-object -t tree /dev/null)
   git diff "$base" -U0 | grep -nEi "sk-ant-|AIza[0-9A-Za-z_-]{10}|xox[baprs]-|BEGIN [A-Z ]*PRIVATE KEY|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}|\bsenhas?\b|\bpassphrase\b *=|\btoken\b *="
   ```

   **A base é o que já está no GitHub, não o que está no índice.** Durante a sessão se commita
   à vontade, então um segredo pode já estar num commit feito uma hora atrás — o
   `git diff --cached` antigo não o veria. Sem upstream (primeiro push), a base é a árvore
   vazia e a varredura cobre o repositório inteiro, que é o certo para um primeiro push.

   As fronteiras de palavra (`\b`) são de propósito: sem elas, `senha` casa dentro de
   `desenhar` e a varredura vira ruído — e varredura ruidosa é varredura desligada.
   **Qualquer resultado: pare e me avise.** Não commite "só para não perder".

   Um falso positivo é conhecido: no commit que instala ou muda este arquivo, as linhas dele que
   citam os padrões casam com **elas mesmas**. Se todos os resultados forem linhas de
   `.claude/commands/tchau.md`, siga.

4. **Se o projeto tem ponteiro de fatia, avance-o — ou não avance, e diga por quê.** Quem fez a
   fatia não é quem a julga. O ponteiro é o `docs/PROXIMO.md` com o `docs/ROADMAP.md`, ou o que
   o `CLAUDE.md` do projeto descreve no lugar deles (`ETAPA_ATUAL`, `PASSO ATUAL`, «Etapa
   atual»): este passo vale igual para os dois.
   - **Olhe o `sai:` e o `verificar:`** da fatia que está aberta no ponteiro (a seção dela no
     roadmap, ou onde o projeto guarda a fatia). Se a fatia não tem os dois, não há o que
     conferir: diga isso e só avance se eu confirmar.
   - **Rode o que o `verificar:` manda rodar** — mas só se o comando é local e só de leitura, e
     esta máquina é a `maquina:` da fatia. Senão, use a saída que já está nesta conversa. Sem
     nenhuma das duas, **não avance**, e diga o que falta para conferir.
   - **Segunda opinião, antes de avançar.** Dispare **um** subagente de contexto limpo. Ele
     recebe só três coisas: o `sai:` e o `verificar:` da fatia, a saída que você acabou de
     rodar (ou a do transcript), e o diff desde que o ponteiro chegou nesta fatia:

     ```bash
     base=$(git log -1 --format=%H -G '^chat:' -- docs/PROXIMO.md)
     [ -n "$base" ] || base=$(git rev-parse -q --verify '@{u}' || git hash-object -t tree /dev/null)
     git diff "$base" --stat
     git diff "$base"
     ```

     A base é o último commit que mudou a linha `chat:` — o que abriu esta fatia —, e o
     `git add -A` do passo 3 já pôs arquivo novo no diff. **Com ponteiro próprio**, troque o
     `-G` e o caminho pelos dele (por exemplo `-G 'ETAPA_ATUAL' -- CLAUDE.md`); se não achar
     commit, a segunda linha cai no que já está no GitHub. **Nunca rode `git diff` sem base**:
     sem ela ele compara o disco com o índice e, depois do `add`, não mostra nada.

     O pedido ao subagente, com estas palavras: *«Confira se este diff entrega o que o `sai:`
     promete e se a evidência mostra o `verificar:` passando. Reporte só lacuna que afete isso
     ou a correção do código. Estilo, nome e "poderia ser melhor" não são achado.»* Revisor
     mandado achar lacuna sempre acha alguma, e perseguir tudo é engordar o trabalho.
   - **Achado real: NÃO avance**, e diga o que faltou. Se você discorda do achado, escreva o
     porquê no handoff e deixe eu decidir — nunca passe por cima em silêncio.
   - **Sem achado:** escreva a próxima fatia no `docs/PROXIMO.md` e mude o `Estado` dela na
     fila do `docs/ROADMAP.md` — ou avance o ponteiro próprio do jeito que o `CLAUDE.md` do
     projeto manda. Ponteiro adiantado é pior que ponteiro parado: toda sessão
     seguinte abre no perfil errado com cara de certo, e ninguém percebe até a conta chegar.
   - Se eu disser explicitamente que a fatia não fechou, não avance mesmo que pareça pronta.
   - **`modelo:` e `esforco:` do ponteiro novo (quando ele tem esses campos) saem da tabela de
     perfis do `docs/ROADMAP.md`, resolvidos agora** — nunca copiados do ponteiro anterior. Se forem copiados, no dia em que
     a tabela mudar todo ponteiro fica mentindo e nada detecta.

5. **`docs/DESVIOS.md` — só se houve desvio.** Dois casos, uma linha cada, no fim do arquivo:
   - **a fatia foi planejada num perfil e rodou em outro:**

     ```
     AAAA-MM-DD | C4 | planejado: sonnet/medium | usado: opus/high | motivo em meia linha
     ```

   - **eu te corrigi nesta sessão, e a correção vale para as próximas** — «não, faça X», «isso
     está errado porque Y», «de novo você esqueceu Z». Releia a conversa atrás disso antes de
     escrever:

     ```
     AAAA-MM-DD | C4 | correção | o que eu corrigi | a regra que isso sugere, em uma frase
     ```

     Correção de gosto numa coisa só não entra; entra o que vai se repetir se ninguém escrever.

   - **eu corrigi o jeito de um texto que passou pela skill `humanize`** — mandei a versão que
     enviei, editei o rascunho, ou pedi a troca («tira o travessão», «não começa agradecendo»).
     Essa linha **não entra aqui**: ela vai para o log da skill, no playbook
     (`.claude/skills/humanize/correcoes.md`), que é o único lugar onde a revisão semanal
     enxerga as correções de **todos** os projetos, inclusive os de trabalho. Se a skill já
     gravou durante a sessão, não grave de novo; se não gravou, siga a seção «Aprender com a
     correção» do `SKILL.md` dela. Correção de **fato** não é linha de voz — é conteúdo. Se a
     skill não existir nesta máquina, escreva a correção no handoff e diga que ela não foi
     gravada.

   Silêncio é o caso comum e está certo. É deste arquivo que o método aprende: a revisão
   semanal do `/auto` junta linhas parecidas e propõe a regra nova como PR — e só o merge a
   aceita. **Não escreva linha quando não houve desvio** — arquivo cheio de "tudo certo" não se
   lê. Se o projeto não tem `docs/DESVIOS.md`, crie pelo modelo do playbook
   (`templates/DESVIOS.md`) só no dia da primeira linha.

6. **Commit do handoff e `git push`.** Os commits que a sessão já fez ficam como estão; este é
   o do handoff (mensagem descritiva, nunca "wip"), e o push sobe tudo junto — é o único push
   da sessão.

Se eu escrevi alguma observação depois do comando, incorpore ao handoff: $ARGUMENTS

No fim, me responda em **no máximo 6 linhas**, nesta ordem. Se o push falhar, diga isso antes
de tudo.

1. **Se fechou**, sem rodeio: `Fatia <C>: fechou — <a evidência>` ou
   `Fatia <C>: não fechou — falta <o quê>`. Sem roadmap: `Trabalho de hoje: fechou/não fechou —
   <o quê>`.
2. O que foi commitado, o hash curto, e se o ponteiro avançou (para qual fatia) ou por que não.
3. **Última linha, sempre:** `Próximo: <C> — <uma frase do que a próxima sessão vai fazer> ·
   <modelo>/<esforço>`. Sem roadmap, o próximo passo do documento de estado em uma frase, e o
   perfil pela tabela de escape do playbook
   (`%USERPROFILE%\Desktop\Side-Projects\playbook\templates\ROADMAP.md`, bloco 4), com o modelo
   e o esforço dele.
