# Barra comando git destrutivo ANTES de ele rodar. Hook `PreToolUse` em `Bash`.
#
# Colhido no C6 do `automacao-supplier-pagamentos/.claude/hooks/barrar_git_destrutivo.py`,
# portado para PowerShell e apoiado no `_comum.ps1` do `moto-companion`.
#
# ## Por que ele existe, e por que o `permissions.deny` NÃO basta
#
# O `deny` do `settings.json` casa o comando por **prefixo literal**. A documentação é
# explícita: tudo que vem antes do primeiro `*` é comparado como está escrito. Então
# `Bash(git push --force*)` pega `git push --force origin main`, mas **não** pega:
#
#   · `git push origin main --force`    — a flag veio depois do destino
#   · `git status && git clean -xdf`    — o destrutivo é o segundo comando
#   · `git -C ../outro clean -xdf`      — o `-C` entra antes do subcomando
#
# As três formas apagam a mesma coisa, e são justamente as que a gente digita.
#
# **E a lista não tem conserto.** O único padrão que cobriria a reordenação seria
# `Bash(git push*)`, que barraria todo push. Medido no C6: é por isso que este hook existe em
# vez de mais linhas de `deny`. O bloco continua no `settings.json` como primeira linha — ele
# pega a forma canônica sem custo nenhum —, mas quem realmente fecha o buraco é este arquivo,
# que quebra a linha nos separadores e olha CADA pedaço.
#
# É a mesma regra do `CLAUDE.md`: `allowed-tools` concede e não restringe, e trava que só
# parece trava vale menos que trava nenhuma.
#
# ## Erra para o lado de barrar
#
# Falso positivo custa reescrever o comando. Falso negativo custa trabalho que não volta. O
# casamento é largo de propósito — mas `EhLeitura` existe para que procurar a palavra num
# arquivo continue passando, senão o hook vira hook desligado.
#
# Para fazer de propósito uma das coisas abaixo: rode na sua própria janela de terminal, fora
# do Claude Code. **O atrito É a trava.**

. "$PSScriptRoot\_comum.ps1"

$cmd = Get-ComandoDoHook

# Veio alguma coisa e não deu para entender — ver o contrato de três respostas no `_comum.ps1`.
if ($null -eq $cmd) {
    Bloquear @"
BLOQUEADO: não consegui ler o comando para conferir se era destrutivo.

Barrando por precaução. Se isto virar rotina, o formato do payload do hook mudou e quem
precisa de conserto é o .claude/hooks/_comum.ps1 — não o seu comando.
"@
}

if ([string]::IsNullOrWhiteSpace($cmd)) { exit 0 }
if (EhLeitura $cmd) { exit 0 }

# Texto é conteúdo, nunca comando: uma mensagem de commit que cita `git reset --hard` em prosa
# não é um `git reset --hard`. Vale para o corpo de here-document e para o valor de `-m` — o
# segundo foi achado em campo, no primeiro commit que este hook viu, barrando justamente o
# commit que o instalava.
$cmd = SemHeredoc $cmd
$cmd = SemMensagem $cmd

# (padrão do pedaço, o que se perde). O `.*?` entre o `git` e o subcomando cobre as opções
# globais (`-C caminho`, `-c chave=valor`) sem passar por cima de um separador — a quebra já
# foi feita antes.
$PROIBIDOS = @(
    @{
        Padrao = '\bgit\b.*\bclean\b'
        Dano   = 'git clean apaga TUDO que o git ignora, e é o mais perigoso da lista justamente porque ninguém lembra dele. O que mora em pasta ignorada é o que não tem de onde recuperar: dado real, perfil logado, banco local, .env. Não tem desfazer.'
    },
    @{
        Padrao = '\bgit\b.*\bpush\b.*(--force\b|--force-with-lease\b|(?<=\s)-f(?=\s|$))'
        Dano   = 'push forçado reescreve o histórico remoto. Se a outra máquina já puxou, ela fica com uma história que não existe mais — e este método usa duas máquinas.'
    },
    @{
        Padrao = '\bgit\b.*\bpush\b.*\s\+[^\s]'
        Dano   = 'push com refspec + é force push disfarçado — mesmo dano.'
    },
    @{
        Padrao = '\bgit\b.*\breset\b.*--hard\b'
        Dano   = 'reset --hard apaga trabalho não commitado sem recuperação.'
    },
    @{
        Padrao = '\bgit\b.*\brebase\b'
        Dano   = 'rebase reescreve histórico que já pode ter sido empurrado.'
    },
    @{
        Padrao = '\bgit\b.*\bcommit\b.*--amend\b'
        Dano   = 'commit --amend reescreve um commit que já pode estar no remoto.'
    }
)

# Quebrar aqui é o que faz o hook enxergar o segundo comando de `git status && git clean -xdf`
# — exatamente o caso que o `deny` não vê.
foreach ($pedaco in ($cmd -split '&&|\|\||[;\n|]')) {
    foreach ($regra in $PROIBIDOS) {
        if ($pedaco -match $regra.Padrao) {
            Bloquear @"
BLOQUEADO pelo hook do projeto: ``$($pedaco.Trim())``

$($regra.Dano)

Se for mesmo isso que você quer, rode na sua própria janela de terminal, fora do Claude Code —
o atrito é a trava.
"@
        }
    }
}

exit 0
