# SessionStart: mede o terreno antes de a sessao comecar a achar coisas.
#
# Existe porque isto foi inventado duas vezes, sem combinar, em dois projetos do Igor
# (`app-financas/.claude/hooks/sessao-abre.py` e `automacao-contratos/.claude/hooks/abertura.py`).
# O que ele injeta e' medicao, nunca suposicao -- uma sessao ja abriu acreditando que uma pasta
# tinha 79 arquivos quando tinha 0, e planejou em cima disso.
#
# Por que ele existe, em uma linha: o `/oi` gastava tres chamadas de ferramenta em `git log`,
# `git status` e a leitura do ponteiro. Aqui os tres viram contexto de graca, antes de a conversa
# comecar. E' dai que vem a economia do ritual -- da INJECAO, nao de trocar o modelo do turno.
#
# ## Doutrina de falha
#
# Este hook **falha aberto, e nunca em silencio**. Nao e' escolha de gosto: a documentacao do
# Claude Code diz que, no `SessionStart`, codigo de saida diferente de zero e' erro NAO
# bloqueante -- a sessao sobe de qualquer jeito. Entao um hook de abertura que "barra" nao
# existe; o que existe e' um que avisa. Toda medicao que falhar vira uma linha dizendo que
# falhou, porque "nao consegui medir" e' informacao e silencio e' mentira.
#
# A assimetria oposta (falhar fechado) vale para hook de `PreToolUse`, que consegue mesmo
# barrar: erro ao **ler a entrada** deixa passar, erro ao **verificar** barra. Nao confunda as
# duas -- e nunca faca deste hook a unica trava de nada.
#
# ## O que da' para conferir de verdade, medido em 08/09/2026
#
# - **`model` VEM na carga do stdin** -- e so' no `SessionStart`, e nem sempre. Quando vem, o
#   modelo e' conferivel de verdade. Isto contradiz o que os dois projetos originais concluiram
#   ("modelo e' dito, nunca conferido"), e a documentacao oficial e' a fonte.
# - **`effort` NAO vem**, e `$env:CLAUDE_EFFORT` esta **vazio no app de desktop** (medido nesta
#   maquina em 08/09/2026, `CLAUDE_CODE_ENTRYPOINT=claude-desktop`). O `SessionStart` roda antes
#   do laco agentico. Entao o esforco e' **dito, nunca conferido** -- o inverso do que se supunha.
# - Nenhum campo de saida de hook troca modelo ou esforco. Quem abre a sessao no perfil certo e'
#   o `.claude/settings.json` (chaves `model` e `effortLevel`), escrito pelo `/tchau`.

$ErrorActionPreference = 'Continue'

$RAIZ = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($RAIZ)) { $RAIZ = (Get-Location).Path }

# Silencio de comando nativo e' com `cmd /c`, nunca com `2>$null` dentro do PowerShell:
# com ErrorActionPreference alto, redirecionar stderr de nativo aborta o script mesmo quando
# o comando terminou bem.
function Invoke-Git {
    param([string]$Argumentos)
    try {
        Push-Location $RAIZ
        $saida = cmd /c "git $Argumentos 2>nul"
        Pop-Location
        if ($LASTEXITCODE -ne 0) { return $null }
        return (($saida | Out-String).TrimEnd())
    } catch {
        try { Pop-Location } catch { }
        return $null
    }
}

# ---------------------------------------------------------------- a carga do hook

$modeloDaSessao = $null
try {
    $bruto = [Console]::In.ReadToEnd()
    if (-not [string]::IsNullOrWhiteSpace($bruto)) {
        $dados = $bruto | ConvertFrom-Json
        if ($dados.PSObject.Properties.Name -contains 'model') {
            $m = $dados.model
            # Ja' veio como texto e como objeto, dependendo da versao. Aceite os dois.
            if ($m -is [string]) { $modeloDaSessao = $m }
            elseif ($null -ne $m) {
                foreach ($campo in @('id', 'name', 'display_name')) {
                    if ($m.PSObject.Properties.Name -contains $campo -and $m.$campo) {
                        $modeloDaSessao = [string]$m.$campo
                        break
                    }
                }
            }
        }
    }
} catch {
    # Erro ao LER a entrada deixa passar: um hook que trava a abertura por causa de JSON
    # estranho e' pior que um hook ausente.
    $modeloDaSessao = $null
}

# ---------------------------------------------------------------- docs/PROXIMO.md

$ponteiro = @{}
$caminhoPonteiro = Join-Path $RAIZ 'docs\PROXIMO.md'
$ponteiroExiste = Test-Path $caminhoPonteiro
if ($ponteiroExiste) {
    try {
        foreach ($linha in (Get-Content $caminhoPonteiro -Encoding UTF8)) {
            if ($linha -match '^\s*([a-zA-Z\-]+)\s*:\s*(.+?)\s*(?:#.*)?$') {
                $ponteiro[$matches[1].ToLower()] = $matches[2].Trim()
            }
        }
    } catch {
        $ponteiro = @{}
    }
}

function Campo {
    param([string]$Nome)
    if ($ponteiro.ContainsKey($Nome)) { return $ponteiro[$Nome] }
    return $null
}

# ---------------------------------------------------------------- monta o texto

$partes = New-Object System.Collections.Generic.List[string]

# O perfil vem PRIMEIRO, antes do estado do repositorio: e' a unica coisa aqui que pode fazer
# o Igor querer fechar e reabrir a sessao, e trocar de modelo custa proporcionalmente ao
# tamanho da conversa -- que neste instante ainda nao existe.
if (-not $ponteiroExiste) {
    $partes.Add('docs/PROXIMO.md: NAO EXISTE neste projeto. Sem ponteiro nao ha perfil a conferir -- se este projeto tem roadmap, isso e um buraco; se nao tem, ignore.')
} else {
    $pedido = Campo 'modelo'
    $esforcoPedido = Campo 'esforco'
    $perfil = Campo 'perfil'

    $cabecalho = 'docs/PROXIMO.md pede: perfil ' + $(if ($perfil) { $perfil } else { '(nao declarado)' }) +
                 ' -- modelo ' + $(if ($pedido) { $pedido } else { '(nao declarado)' }) +
                 ' / esforco ' + $(if ($esforcoPedido) { $esforcoPedido } else { '(nao declarado)' })
    $partes.Add($cabecalho)

    if ($modeloDaSessao) {
        $partes.Add('modelo desta sessao, lido da carga do hook: ' + $modeloDaSessao)
        if ($pedido) {
            # Comparacao frouxa de proposito: a carga traz `claude-sonnet-5`, o ponteiro traz
            # `sonnet`. Igualdade exata aqui daria alarme falso em toda sessao, e alarme falso
            # e' o que desliga hook.
            if ($modeloDaSessao.ToLower().Contains($pedido.ToLower())) {
                $partes.Add('modelo: BATE.')
            } else {
                $partes.Add('modelo: NAO BATE. A sessao esta em ' + $modeloDaSessao + ' e o ponteiro pede ' + $pedido + '.')
                $partes.Add('IMPORTANTE: diga isto ao Igor em UMA LINHA, como a PRIMEIRA coisa da resposta e ANTES de chamar qualquer ferramenta. Trocar de modelo custa proporcionalmente ao tamanho da conversa, e a conversa ainda nao existe. Se ele preferir reabrir no perfil certo, tudo o que for feito antes disso e trabalho jogado fora.')
            }
        }
    } else {
        $partes.Add('modelo desta sessao: NAO VEIO na carga do hook. Confira voce mesmo: o modelo esta no seu prompt de sistema. Ausente nunca e "esta certo".')
    }

    $partes.Add('esforco desta sessao: NAO E CONFERIVEL na abertura -- o SessionStart roda antes do laco agentico e o app de desktop nao exporta CLAUDE_EFFORT. Anuncie o que o ponteiro pede e siga; nao invente que conferiu.')

    foreach ($par in @(@('chat', 'chat'), @('titulo', 'titulo'), @('forma', 'forma'), @('maquina', 'maquina'), @('plan-mode', 'plan mode'), @('persona', 'persona'), @('objetivo', 'objetivo'))) {
        $valor = Campo $par[0]
        if ($valor) { $partes.Add($par[1] + ': ' + $valor) }
    }
}

$partes.Add('')
$partes.Add('Estado do repositorio, levantado na abertura (equivale aos passos de git de "Ao abrir a sessao"):')
$partes.Add('')

$log = Invoke-Git 'log --oneline -5'
$partes.Add('git log --oneline -5:')
$partes.Add($(if ($null -ne $log -and $log -ne '') { $log } else { '(nao consegui rodar o git aqui)' }))
$partes.Add('')

$status = Invoke-Git 'status --short'
$partes.Add('git status --short:')
$partes.Add($(if ($null -ne $status -and $status -ne '') { $status } else { '(limpo)' }))

# `git status` nao ve commit parado na OUTRA maquina: la o pull nao traz nada e parece que
# esta tudo certo. Por isso a contagem contra o remoto entra separada.
$atraso = Invoke-Git 'rev-list --count --left-right "@{u}...HEAD"'
if ($null -ne $atraso -and $atraso -match '^\s*(\d+)\s+(\d+)\s*$') {
    $atras = [int]$matches[1]
    $frente = [int]$matches[2]
    if ($atras -gt 0 -or $frente -gt 0) {
        $partes.Add('')
        $partes.Add(('contra o remoto (sem fetch agora, pode estar velho): ' + $atras + ' atras, ' + $frente + ' a frente. Commit a frente e /tchau esquecido.'))
    }
}

# ---------------------------------------------------------------- saida

$texto = ($partes -join "`n")

$saidaHook = @{
    hookSpecificOutput = @{
        hookEventName     = 'SessionStart'
        additionalContext = $texto
    }
}

# `additionalContext` vai para o modelo. `systemMessage` e' a tentativa de chegar a' tela do
# Igor -- quem precisa saber que o perfil esta errado e' ele, e o modelo so' repassaria depois
# de ja' ter comecado a trabalhar.
if ($texto -match 'NAO BATE') {
    $saidaHook['systemMessage'] = 'Perfil desta sessao NAO bate com o docs/PROXIMO.md.'
}

$saidaHook | ConvertTo-Json -Depth 5 -Compress
exit 0
