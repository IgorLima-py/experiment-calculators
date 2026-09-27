# Desvios

Uma linha por desvio, acrescentada no fim. **Só quando houve desvio** — silêncio é o caso comum
e está certo. Arquivo cheio de "tudo certo" não se lê, e a partir daí nada aqui é lido.

É daqui que o método aprende. Sem este arquivo a tabela de perfis do `docs/ROADMAP.md` e as
regras do `CLAUDE.md` são opinião congelada: nada registra quando elas erraram, e elas nunca
melhoram.

- **Quem escreve:** o `/tchau`.
- **Quem lê:**
  - o `/360`, **antes** de atribuir perfis a novas fatias;
  - a revisão semanal do `/auto`, que junta linhas parecidas e propõe a mudança de regra como
    PR — e só o merge do Igor a aceita.

Dois tipos de linha:

```
AAAA-MM-DD | <fatia> | planejado: <modelo>/<esforço> | usado: <modelo>/<esforço> | por quê
AAAA-MM-DD | <fatia> | correção | <o que o Igor corrigiu> | <a regra que isso sugere>
```

- **Perfil** — a fatia foi planejada num perfil e rodou em outro. O motivo é a parte que
  importa: `"precisou de mais"` não ensina nada; `"3 formatos de payload não documentados"`
  ensina que fatia de parser sobre formato de terceiro merece um nível acima.
- **Correção de texto não entra aqui.** Quando o Igor corrige o **jeito** de um texto que a skill
  `humanize` escreveu, a linha `voz` vai para o log dela, no playbook
  (`.claude/skills/humanize/correcoes.md`).
- **Correção** — o Igor corrigiu a sessão, e a correção vale para as próximas: «não, faça X»,
  «isso está errado porque Y», «de novo você esqueceu Z». A última coluna diz a regra em uma
  frase, como ela entraria no `CLAUDE.md`. **Correção de gosto numa coisa só não entra** — só o
  que, se ninguém escrever, vai se repetir.

---

<!-- As linhas entram abaixo desta marca, em ordem cronológica. -->
