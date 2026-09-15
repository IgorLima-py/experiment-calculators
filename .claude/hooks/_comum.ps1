# Peças comuns aos hooks de `PreToolUse`.
#
# ## De onde isto veio
#
# Colhido no C6 do `moto-companion/.claude/hooks/_comum.ps1`. **O mesmo arquivo, com o mesmo
# nome e a mesma função, foi inventado duas vezes** — o `entrevista-ai-local` tem um
# `_comum.ps1` independente, que não conhece nenhum dos dois consertos abaixo. É a regra do
# `CLAUDE.md` em ação: configuração que serve a mais de um projeto sobe pro playbook ou morre
# no repositório onde nasceu.
#
# A versão do `moto-companion` ganhou porque ela é a que **apanhou em campo**: as duas
# diferenças entre ela e a outra cópia são consertos de falha medida, não gosto.
#
# ## Doutrina de falha — e ela é o INVERSO da do hook de abertura
#
# Hook de `PreToolUse` consegue mesmo barrar (exit 2). Então:
#
# - erro ao **LER a entrada** deixa passar — um hook que trava tudo porque o JSON veio
#   estranho é pior que um hook ausente;
# - erro ao **VERIFICAR** barra — é para isso que ele existe.
#
# Não confunda com o `hook-sessao-abre.ps1`, que falha **aberto** sempre: no `SessionStart`,
# código de saída diferente de zero é erro NÃO bloqueante e a sessão sobe de qualquer jeito.

# Lê o payload do hook. O Claude Code manda um JSON no stdin com `tool_name` e `tool_input`; o
# que interessa aqui é o comando prestes a rodar.
#
# **Três respostas, e a diferença entre as duas primeiras é decisão do C6.** As duas cópias que
# existiam discordavam: as do `moto-companion` e do `entrevista-ai-local` devolvem vazio em
# qualquer erro (deixa passar), e o `barrar_git_destrutivo.py` do supplier **barra** quando não
# consegue ler, com o argumento de que «hook que falha aberto é hook que não existe». As duas
# têm razão sobre casos diferentes, e a resposta certa separa os casos:
#
#   `''`     não havia nada para conferir — stdin vazio, ou uma ferramenta sem comando.
#   `$null`  VEIO alguma coisa e não deu para entender. Quem chama decide, e a recomendação
#            é barrar: é o caso do supplier.
#   texto    o comando.
#
# Por que não barrar nos dois: este arquivo é canônico e viaja para todos os projetos. Se o
# formato do payload mudar um dia, «erro ao ler = barrar» tranca **toda** chamada de Bash em
# **todos** os repositórios de uma vez. Já «veio lixo que eu não entendi» é raro e suspeito, e
# aí o atrito é barato.
function Get-ComandoDoHook {
    try {
        $bruto = [Console]::In.ReadToEnd()
        if ([string]::IsNullOrWhiteSpace($bruto)) { return '' }
        $j = $bruto | ConvertFrom-Json
        $c = $j.tool_input.command
        if ($null -eq $c) { return '' }
        return [string]$c
    } catch { return $null }
}

# Mesma coisa, e o mesmo contrato de três respostas, para os hooks que miram edição de arquivo
# em vez de comando.
function Get-ArquivoDoHook {
    try {
        $bruto = [Console]::In.ReadToEnd()
        if ([string]::IsNullOrWhiteSpace($bruto)) { return '' }
        $j = $bruto | ConvertFrom-Json
        $f = $j.tool_input.file_path
        if ($null -eq $f) { return '' }
        return [string]$f
    } catch { return $null }
}

# O comando só está LENDO sobre o assunto, em vez de fazer? `grep`, `cat`, `git diff` — nada
# disso escreve nada.
#
# **Regra de ouro: hook que barra coisa legítima vira hook desligado, e hook desligado não
# protege nada.** Sem esta função, um `grep` procurando a palavra "git clean" na documentação
# seria bloqueado como se fosse a invocação. Aconteceu na primeira vez que estes hooks rodaram,
# no `moto-companion`.
#
# **Leitura é propriedade do comando INTEIRO, não de um pedaço dele.** A primeira tentativa de
# conserto, em 02/09/2026, aceitou qualquer segmento e abriu um buraco imediato:
# `./gradlew connectedAndroidTest && grep x` passava, porque o `&& grep` casava. O que vale:
#
#   1. um prefixo `cd pasta &&` é descartado — comando composto é a forma normal de trabalhar;
#   2. depois disso, o comando tem de COMEÇAR com leitura;
#   3. e não pode escrever arquivo (`>`) nem encadear outro comando, porque o que vem depois
#      do `&&` pode ser qualquer coisa.
function EhLeitura([string]$cmd) {
    $c = [regex]::Replace($cmd, '^\s*cd\s+[^&;|]+?\s*(&&|;)\s*', '')
    if ($c -match '>') { return $false }
    if ($c -match '(&&|;)') { return $false }
    return $c -match '^\s*(sudo\s+)?(grep|rg|ack|cat|bat|sed|awk|head|tail|less|more|find|ls|dir|type|findstr|Select-String|Get-Content|Get-ChildItem|git\s+(grep|log|diff|show|status))\b'
}

# Tira o CORPO dos here-documents antes de procurar invocação.
#
# O que está dentro de um `<<'EOF' ... EOF` é **texto** — mensagem de commit, conteúdo de
# arquivo —, nunca comando. Em 02/09/2026 um hook do `moto-companion` bloqueou o `git commit`
# do handoff porque a mensagem dizia, em prosa, para rodar um script na outra máquina. Nenhum
# comando ia rodar ali: era uma frase.
#
# É a mesma lição de `EhLeitura` — casar em menção em vez de invocação — e por isso o conserto
# mora aqui, no comum, e não num `if` dentro de um hook só.
function SemHeredoc([string]$cmd) {
    if ([string]::IsNullOrWhiteSpace($cmd)) { return $cmd }
    # <<EOF, <<'EOF', <<-"EOF" ... até a linha que fecha com o mesmo rótulo.
    return [regex]::Replace(
        $cmd,
        "<<-?\s*[""']?(\w+)[""']?\r?\n[\s\S]*?\r?\n\s*\1\s*(\r?\n|$)",
        " <<CORPO-DE-HEREDOC-REMOVIDO> ",
        [System.Text.RegularExpressions.RegexOptions]::Multiline
    )
}

# Tira o VALOR de `-m` / `--message` antes de procurar invocação.
#
# Mesma lição do `SemHeredoc`, e ela apareceu pela terceira vez — desta vez em campo, no
# primeiro commit que este hook viu: a mensagem de commit do C6 explicava, em prosa, que o
# `permissions.deny` não pega `git push origin main --force`. O guarda leu aquilo como invocação
# e **barrou o próprio commit que o instalava**.
#
# Mensagem de commit é **conteúdo**, nunca comando — e é o lugar onde a gente mais escreve o
# nome de comando perigoso, porque é ali que se explica por que ele é perigoso. Um hook que
# impede de documentar o próprio motivo dele é hook que vai ser desligado no mesmo dia.
#
# Cobre `-m x`, `-m "x"`, `-m 'x'` e `--message=x`, com a mensagem podendo ter várias linhas.
# Não cobre `-F arquivo` nem `-F-`: ali a mensagem não está na linha de comando.
function SemMensagem([string]$cmd) {
    if ([string]::IsNullOrWhiteSpace($cmd)) { return $cmd }
    return [regex]::Replace(
        $cmd,
        '(?s)(-m|--message)(=|\s+)("[^"]*"|''[^'']*''|\S+)',
        ' <MENSAGEM-REMOVIDA> '
    )
}

# Bloqueia a ação. Exit 2 com a mensagem no stderr é o contrato que o Claude Code lê.
#
# O `OutputEncoding` não é enfeite, e a lição é emprestada do
# `automacao-supplier-pagamentos/.claude/hooks/barrar_git_destrutivo.py`, que apanhou disto em
# 02/09/2026 do lado do Python: no Windows, sem forçar UTF-8, o stderr sai em cp1252 — e o
# recado deste hook tem acento em quase toda linha. Recado ilegível vira comando barrado sem
# explicação, que é o jeito mais rápido de o humano tentar de novo por outro caminho.
function Bloquear([string]$motivo) {
    try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
    [Console]::Error.WriteLine($motivo)
    exit 2
}
