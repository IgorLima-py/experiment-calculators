---
description: Encerra a sessão — escreve o handoff, commita e faz push
argument-hint: [observação a incorporar ao handoff]
---

Vou parar por aqui e possivelmente continuar em **outra máquina, num chat novo que não terá
nada deste histórico**. Prepare a saída:

1. Leia o `CLAUDE.md` da raiz. Se ele tiver uma seção **`## Ao encerrar a sessão`**, execute
   os passos dela na ordem — é ali que mora o que é específico deste projeto.
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
   git diff --cached -U0 | grep -nEi "sk-ant-|AIza[0-9A-Za-z_-]{10}|xox[baprs]-|BEGIN [A-Z ]*PRIVATE KEY|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}|\bsenhas?\b|\bpassphrase\b *=|\btoken\b *="
   ```

   As fronteiras de palavra (`\b`) são de propósito: sem elas, `senha` casa dentro de
   `desenhar` e a varredura vira ruído — e varredura ruidosa é varredura desligada.
   **Qualquer resultado: pare e me avise.** Não commite "só para não perder".

   Um falso positivo é conhecido e só acontece uma vez: no commit que instala este arquivo, a
   linha acima casa com **ela mesma**. Se o único resultado for `.claude/commands/tchau.md`,
   siga.

4. **Se o projeto tem `docs/ROADMAP.md` e `docs/PROXIMO.md`, avance o ponteiro — ou não avance,
   e diga por quê.**
   - Olhe o `verificar:` da fatia que está aberta no `docs/PROXIMO.md`.
   - **Se tudo o que ele promete existe**, escreva a próxima fatia no `docs/PROXIMO.md` e mude o
     `Estado` dela na fila do `docs/ROADMAP.md`.
   - **Se falta qualquer item, NÃO avance**, e diga o que faltou. Ponteiro adiantado é pior que
     ponteiro parado: toda sessão seguinte abre no perfil errado com cara de certo, e ninguém
     percebe até a conta chegar.
   - Se eu disser explicitamente que a fatia não fechou, não avance mesmo que pareça pronta.
   - **`modelo:` e `esforco:` do ponteiro novo saem da tabela de perfis do `docs/ROADMAP.md`,
     resolvidos agora** — nunca copiados do ponteiro anterior. Se forem copiados, no dia em que
     a tabela mudar todo ponteiro fica mentindo e nada detecta.

5. **`docs/DESVIOS.md` — só se houve desvio.** Se a fatia foi planejada num perfil e rodou em
   outro, acrescente **uma linha** no fim do arquivo:

   ```
   AAAA-MM-DD | C4 | planejado: sonnet/medium | usado: opus/high | motivo em meia linha
   ```

   Silêncio é o caso comum e está certo. Sem este arquivo a tabela de perfis é opinião
   congelada: nada registra quando ela errou, e ela nunca aprende. **Não escreva linha quando
   não houve desvio** — arquivo cheio de "tudo certo" não se lê.

6. `git add -A`, commit com mensagem descritiva (nunca "wip"), e `git push`.

Se eu escrevi alguma observação depois do comando, incorpore ao handoff: $ARGUMENTS

No fim, me responda em **no máximo 6 linhas**: o que foi commitado, o hash curto, se o ponteiro
avançou (e para qual fatia e perfil) ou por que não avançou, e a primeira frase que a próxima
sessão vai ler como próximo passo. Se o push falhar, diga isso primeiro.
