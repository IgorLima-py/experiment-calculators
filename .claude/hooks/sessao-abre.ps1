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
# ## O que da' para conferir de verdade
#
# - **`model` VEM na carga do stdin** -- e so' no `SessionStart`, e nem sempre. Quando vem, o
#   modelo e' conferivel de verdade. Isto contradiz o que os dois projetos originais concluiram
#   ("modelo e' dito, nunca conferido"), e a documentacao oficial e' a fonte.
# - **`effort` VEM, por `$env:CLAUDE_EFFORT`** -- valores `low|medium|high|xhigh|max`. A
#   documentacao a lista entre as variaveis garantidas para hook, `SessionStart` incluido.
#
#   **CORRECAO DO C6, e ela importa.** Ate 08/09/2026 este arquivo afirmava, aqui, que a
#   variavel estava "vazia no app de desktop" e que o esforco era "dito, nunca conferido". Isso
#   estava ERRADO: medido no C6, no mesmo app (`CLAUDE_CODE_ENTRYPOINT=claude-desktop`), ela
#   vale `xhigh` e bate com o ponteiro. Quem estava certo desde o comeco era o
#   `app-financas/.claude/commands/oi.md`, que lia `${CLAUDE_EFFORT}` e foi tratado como
#   contradicao a resolver. **Duas medicoes discordaram e a errada virou canon** -- e o custo
#   disso e' que 16 projetos receberam um `/oi` dizendo para nao conferir uma coisa conferivel.
#
#   Por isso a ausencia continua sendo tratada como "nao consegui conferir", nunca como "esta
#   certo": se a variavel sumir num outro entrypoint, o hook diz que nao mediu, em vez de
#   afirmar de novo o que nao sabe.
# - **O ponteiro contra a politica** (C6.12). O `/tchau` resolve `modelo:`/`esforco:` pela
#   tabela de perfis do `docs/ROADMAP.md`; se ele errar, ou se alguem editar o ponteiro na mao,
#   conferir a sessao contra o ponteiro so' confirma o erro. Entao o hook le a tabela e diz
#   `perfil x tabela: BATE`, `NAO BATE (a tabela diz X/Y)` ou `NAO CONSEGUI CONFERIR` -- e
#   quando a tabela nao parseia, diz isso, em vez de supor um perfil padrao. A ideia e' a
#   "falha ruidosa" dos quatro lancadores de terminal (C6.6), sem o lancador.
# - Nenhum campo de saida de hook troca modelo ou esforco. Quem abre a sessao no perfil certo e'
#   o `.claude/settings.json` (chaves `model` e `effortLevel`), que e' o **piso do projeto** e
#   se escreve a mao. O `/tchau` **nao** mexe nele -- decisao do C4, mantida pelo C6: escrever
#   ali a cada sessao dava diff toda sessao e conflito garantido entre as duas maquinas. A
#   excecao da fatia mora no `docs/PROXIMO.md`, e quem anuncia e' o `/oi`.

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

# ---------------------------------------------------------------- docs/ROADMAP.md, a tabela de perfis
#
# Devolve @{ Erro = <texto> } quando a tabela nao parseia, e NUNCA um perfil padrao no lugar.
# Ideia colhida na C6.6 do `automacao-contratos/ferramentas/perfil_da_etapa.py`: o modo de falha
# desta leitura e' silencioso -- tabela reformatada, parser nao acha nada, tudo cai num padrao, e
# a fatia que pedia `high` roda mais fraca sem ninguem perceber. Por isso quem nao entende a
# tabela diz que nao entendeu.
#
# So' a secao cujo titulo tem "Tabela de perfis" e' lida: a tabela da fila tambem tem coluna
# "Perfil", e ler aquela seria conferir o ponteiro contra ele mesmo. As colunas saem do
# CABECALHO, nao da posicao.
function Ler-TabelaDePerfis {
    param([string]$Caminho)

    $bloco = New-Object System.Collections.Generic.List[string]
    $dentro = $false
    foreach ($l in @(Get-Content $Caminho -Encoding UTF8)) {
        if ($l -match '^##\s') {
            if ($dentro) { break }
            if ($l -match '(?i)tabela de perfis') { $dentro = $true }
            continue
        }
        if ($dentro) { $bloco.Add($l) }
    }
    if (-not $dentro) { return @{ Erro = 'nao achei a secao "## ... Tabela de perfis"' } }

    $iPerfil = -1; $iModelo = -1; $iEsforco = -1
    $cabecalhoVisto = $false
    $perfis = @{}
    $ordem = New-Object System.Collections.Generic.List[string]
    foreach ($l in $bloco) {
        $t = $l.Trim()
        if (-not $t.StartsWith('|')) {
            # A tabela acaba na primeira linha sem pipe depois do cabecalho.
            if ($cabecalhoVisto) { break }
            continue
        }
        $celulas = @($t.Trim('|').Split('|') | ForEach-Object { $_.Trim().Trim('`').Trim() })
        if (-not $cabecalhoVisto) {
            for ($i = 0; $i -lt $celulas.Count; $i++) {
                $c = $celulas[$i].ToLower()
                if ($c -eq 'perfil') { $iPerfil = $i }
                elseif ($c -eq 'modelo') { $iModelo = $i }
                elseif ($c -match '^esfor') { $iEsforco = $i }
            }
            $cabecalhoVisto = $true
            if ($iPerfil -lt 0 -or $iModelo -lt 0 -or $iEsforco -lt 0) {
                return @{ Erro = 'o cabecalho da tabela nao tem as tres colunas Perfil, Modelo e Esforco' }
            }
            continue
        }
        if ($t -match '^\|[\s\-:|]+$') { continue }
        if ($iPerfil -ge $celulas.Count) { continue }
        $nome = $celulas[$iPerfil].ToLower()
        if (-not $nome) { continue }
        $modelo  = $(if ($iModelo -lt $celulas.Count) { $celulas[$iModelo].ToLower() } else { '' })
        $esforco = $(if ($iEsforco -lt $celulas.Count) { $celulas[$iEsforco].ToLower() } else { '' })
        if (-not $perfis.ContainsKey($nome)) {
            $perfis[$nome] = New-Object System.Collections.Generic.List[object]
            $ordem.Add($nome)
        }
        $perfis[$nome].Add(@{
            Modelo  = $modelo
            Esforco = $esforco
            Valida  = (($modelo -match '^[a-z0-9.\-]+$') -and ($esforco -match '^(low|medium|high|xhigh|max)$'))
        })
    }
    if (-not $cabecalhoVisto) { return @{ Erro = 'a secao existe, mas nao tem tabela' } }
    if ($perfis.Count -eq 0)  { return @{ Erro = 'a tabela tem cabecalho, mas nenhuma linha de perfil' } }
    return @{ Erro = $null; Perfis = $perfis; Ordem = $ordem }
}

# ---------------------------------------------------------------- monta o texto

$partes = New-Object System.Collections.Generic.List[string]

# O que vai para a tela do Igor, e nao so' para o modelo. Bandeira, e nao busca de texto: o
# "NAO CONSEGUI CONFERIR" do esforco aparece em TODA sessao do app, e alarme que toca sempre
# ensina a ignorar alarme.
$perfilNaoBate = $false
$tabelaIlegivel = $false
$sessaoNaoBate = $false

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

    # O ponteiro contra a politica (C6.12). Vem ANTES da sessao: se o ponteiro esta errado,
    # conferir a sessao contra ele e' confirmar o erro. Tres saidas, como no resto do hook:
    # BATE, NAO BATE, NAO CONSEGUI CONFERIR. Tabela ilegivel nunca vira "esta certo".
    $linhaPerfil = $null
    $instrucaoPerfil = $null
    try {
        $caminhoRoadmap = Join-Path $RAIZ 'docs\ROADMAP.md'
        if (-not $perfil) {
            $linhaPerfil = 'NAO CONSEGUI CONFERIR -- o ponteiro nao declara perfil.'
        } elseif (-not (Test-Path $caminhoRoadmap)) {
            $linhaPerfil = 'NAO CONSEGUI CONFERIR -- docs/ROADMAP.md nao existe.'
        } else {
            $leitura = Ler-TabelaDePerfis -Caminho $caminhoRoadmap
            $nomePedido = $perfil.Trim('`').Trim().ToLower()
            if ($leitura.Erro) {
                $linhaPerfil = 'NAO CONSEGUI CONFERIR -- a tabela de perfis nao parseou (' + $leitura.Erro + ').'
                $tabelaIlegivel = $true
            } elseif (-not $leitura.Perfis.ContainsKey($nomePedido)) {
                $linhaPerfil = 'NAO BATE -- o perfil ' + $nomePedido + ' nao existe na tabela (tem: ' + ($leitura.Ordem -join ', ') + ').'
                $perfilNaoBate = $true
                $instrucaoPerfil = 'IMPORTANTE: o ponteiro aponta um perfil que a politica nao tem. Diga isto ao Igor como a PRIMEIRA coisa da resposta, antes de qualquer ferramenta.'
            } else {
                # `.ToArray()`, e nao `@(...)`: no PowerShell 5.1, `@()` em volta de uma
                # List[object] tirada de hashtable levanta "Os tipos de argumento nao
                # correspondem" (medido na C6.12, e pego pela falha aberta logo abaixo).
                $registros = $leitura.Perfis[$nomePedido].ToArray()
                $distintos = @($registros | ForEach-Object { $_.Modelo + '/' + $_.Esforco } | Select-Object -Unique)
                if (@($registros | Where-Object { -not $_.Valida }).Count -gt 0) {
                    $linhaPerfil = 'NAO CONSEGUI CONFERIR -- a linha de ' + $nomePedido + ' na tabela esta ilegivel (' + ($distintos -join ' , ') + ').'
                    $tabelaIlegivel = $true
                } elseif ($distintos.Count -gt 1) {
                    $linhaPerfil = 'NAO CONSEGUI CONFERIR -- ' + $nomePedido + ' aparece mais de uma vez na tabela, com valores diferentes (' + ($distintos -join ' , ') + ').'
                    $tabelaIlegivel = $true
                } else {
                    $modeloTabela = $registros[0].Modelo
                    $esforcoTabela = $registros[0].Esforco
                    $pm = $(if ($pedido) { $pedido.Trim().ToLower() } else { '(nao declarado)' })
                    $pe = $(if ($esforcoPedido) { $esforcoPedido.Trim().ToLower() } else { '(nao declarado)' })
                    if ($pm -eq $modeloTabela -and $pe -eq $esforcoTabela) {
                        $linhaPerfil = 'BATE (' + $nomePedido + ' = ' + $modeloTabela + '/' + $esforcoTabela + ').'
                    } else {
                        $linhaPerfil = 'NAO BATE (a tabela diz ' + $modeloTabela + '/' + $esforcoTabela + ') -- o ponteiro diz ' + $pm + '/' + $pe + '.'
                        $perfilNaoBate = $true
                        $instrucaoPerfil = 'IMPORTANTE: o ponteiro esta errado e a tabela ganha. Diga isto ao Igor como a PRIMEIRA coisa da resposta, antes de qualquer ferramenta. A conferencia da sessao abaixo ja usa a tabela (' + $modeloTabela + '/' + $esforcoTabela + '), nao o ponteiro.'
                        $pedido = $modeloTabela
                        $esforcoPedido = $esforcoTabela
                    }
                }
            }
        }
    } catch {
        # Erro ao ler falha aberto, mas nunca calado.
        $linhaPerfil = 'NAO CONSEGUI CONFERIR -- erro ao ler a tabela: ' + $_.Exception.Message
        $tabelaIlegivel = $true
    }
    $partes.Add('perfil x tabela (docs/ROADMAP.md): ' + $linhaPerfil)
    if ($instrucaoPerfil) { $partes.Add($instrucaoPerfil) }

    if ($modeloDaSessao) {
        $partes.Add('modelo desta sessao, lido da carga do hook: ' + $modeloDaSessao)
        if ($pedido) {
            # Comparacao frouxa de proposito: a carga traz `claude-sonnet-5`, o ponteiro traz
            # `sonnet`. Igualdade exata aqui daria alarme falso em toda sessao, e alarme falso
            # e' o que desliga hook.
            if ($modeloDaSessao.ToLower().Contains($pedido.ToLower())) {
                $partes.Add('modelo: BATE.')
            } else {
                $sessaoNaoBate = $true
                $partes.Add('modelo: NAO BATE. A sessao esta em ' + $modeloDaSessao + ' e o ponteiro pede ' + $pedido + '.')
                $partes.Add('IMPORTANTE: diga isto ao Igor em UMA LINHA, como a PRIMEIRA coisa da resposta e ANTES de chamar qualquer ferramenta. Trocar de modelo custa proporcionalmente ao tamanho da conversa, e a conversa ainda nao existe. Se ele preferir reabrir no perfil certo, tudo o que for feito antes disso e trabalho jogado fora.')
            }
        }
    } else {
        $partes.Add('modelo desta sessao: NAO VEIO na carga do hook. Confira voce mesmo: o modelo esta no seu prompt de sistema. Ausente nunca e "esta certo".')
    }

    # Esforco, pelo mesmo contrato do modelo: so' existe "BATE", "NAO BATE" e "nao consegui
    # conferir". Vazio nunca e' "esta certo".
    $esforcoDaSessao = $env:CLAUDE_EFFORT
    if ([string]::IsNullOrWhiteSpace($esforcoDaSessao)) {
        $partes.Add('esforco desta sessao: NAO CONSEGUI CONFERIR -- $env:CLAUDE_EFFORT veio vazia neste processo. Anuncie o que o ponteiro pede e siga, e diga com essas palavras que nao deu para conferir. Nunca escreva que conferiu.')
    } else {
        $partes.Add('esforco desta sessao, lido de $env:CLAUDE_EFFORT: ' + $esforcoDaSessao)
        if ($esforcoPedido) {
            # Igualdade exata, ao contrario do modelo. Aqui os dois lados falam o mesmo
            # vocabulario (`low|medium|high|xhigh|max`), entao comparacao frouxa so' esconderia
            # erro -- e `high` casando dentro de `xhigh` seria justamente o alarme que nao toca.
            if ($esforcoDaSessao.Trim().ToLower() -eq $esforcoPedido.Trim().ToLower()) {
                $partes.Add('esforco: BATE.')
            } else {
                $sessaoNaoBate = $true
                $partes.Add('esforco: NAO BATE. A sessao esta em ' + $esforcoDaSessao + ' e o ponteiro pede ' + $esforcoPedido + '.')
                $partes.Add('Esforco MAIOR tambem esta errado: e token a mais cobrado em todo turno, nao margem de seguranca.')
            }
        }
    }

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
$avisos = New-Object System.Collections.Generic.List[string]
if ($perfilNaoBate)  { $avisos.Add('docs/PROXIMO.md NAO bate com a tabela de perfis do docs/ROADMAP.md.') }
if ($tabelaIlegivel) { $avisos.Add('A tabela de perfis do docs/ROADMAP.md nao parseou: o perfil do ponteiro nao foi conferido.') }
if ($sessaoNaoBate)  { $avisos.Add('Perfil desta sessao NAO bate com o docs/PROXIMO.md.') }
if ($avisos.Count -gt 0) {
    $saidaHook['systemMessage'] = ($avisos -join ' ')
}

$saidaHook | ConvertTo-Json -Depth 5 -Compress
exit 0
