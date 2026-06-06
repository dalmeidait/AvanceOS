$words = @(
  @("AvanceOS Operacao v1.1", "AvanceOS Operação v1.1"),
  @("Visao Geral", "Visão Geral"),
  @("Ordens de Servico", "Ordens de Serviço"),
  @("Ordem de Servico", "Ordem de Serviço"),
  @("Produtos e Servicos", "Produtos e Serviços"),
  @("Analises e Relatorios", "Análises e Relatórios"),
  @("Alterar Senha Obrigatoria", "Alterar Senha Obrigatória"),
  @("Historico de Movimentacoes", "Histórico de Movimentações"),
  @("Solicitacoes de Estoque", "Solicitações de Estoque"),
  @("Situacao Financeira", "Situação Financeira"),
  @("Descricao do Servico", "Descrição do Serviço"),
  @("Observacoes Internas", "Observações Internas"),
  @("Usuarios do Sistema", "Usuários do Sistema"),
  @("Relatorio Tecnico", "Relatório Técnico"),
  @("Ordem de Servico vinculada", "Ordem de Serviço vinculada"),
  @("Descricao do diagnostico", "Descrição do diagnóstico"),
  @("Resumo tecnico", "Resumo técnico"),
  @("Servicos sugeridos", "Serviços sugeridos"),
  @("Pecas sugeridas", "Peças sugeridas"),
  @("Comprovante da Ordem de Servico", "Comprovante da Ordem de Serviço"),
  @("Situacao de pagamento", "Situação de pagamento"),
  @("Dados do Veiculo", "Dados do Veículo"),
  @("Relato e Diagnostico", "Relato e Diagnóstico"),
  @("Diagnostico tecnico", "Diagnóstico técnico"),
  @("Observacoes internas", "Observações internas"),
  @("Nenhum servico registrado.", "Nenhum serviço registrado."),
  @("Nenhuma peca ou produto registrado.", "Nenhuma peça ou produto registrado."),
  @("Pecas/produtos", "Peças/produtos"),
  @("informacoes operacionais", "informações operacionais"),
  @("nao substitui", "não substitui"),
  @("Descricao", "Descrição"),
  @("Compra de pecas", "Compra de peças"),
  @("Servicos terceirizados", "Serviços terceirizados"),
  @("Manutencao interna", "Manutenção interna"),
  @("Carregando movimentacoes...", "Carregando movimentações..."),
  @("Carregando veiculos...", "Carregando veículos..."),
  @("Carregando usuarios...", "Carregando usuários..."),
  @("Sem descricao cadastrada.", "Sem descrição cadastrada."),
  @("Diagnostico inicial", "Diagnóstico inicial"),
  @("Sem observacoes.", "Sem observações."),
  @("Adicionar observacoes", "Adicionar observações"),
  @("Operacao", "Operação"),
  @("Visao", "Visão"),
  @("Servicos", "Serviços"),
  @("Servico", "Serviço"),
  @("Veiculos", "Veículos"),
  @("Veiculo", "Veículo"),
  @("Diagnostico", "Diagnóstico"),
  @("Pecas", "Peças"),
  @("Historico", "Histórico"),
  @("Movimentacoes", "Movimentações"),
  @("Solicitacoes", "Solicitações"),
  @("Situacao", "Situação"),
  @("Observacoes", "Observações"),
  @("Analises", "Análises"),
  @("Relatorios", "Relatórios"),
  @("Usuarios", "Usuários"),
  @("Administracao", "Administração"),
  @("Periodo", "Período"),
  @("Disponivel", "Disponível"),
  @("Indisponivel", "Indisponível"),
  @("Critico", "Crítico"),
  @("Pendencias", "Pendências"),
  @("Acoes", "Ações"),
  @("Concluidas", "Concluídas"),
  @("Em execucao", "Em execução"),
  @("Execucao", "Execução"),
  @("Conclusao", "Conclusão"),
  @("Manutencao", "Manutenção"),
  @("Tecnico", "Técnico"),
  @("Mecanico", "Mecânico"),
  @("Obrigatoria", "Obrigatória")
)

$files = Get-ChildItem -Path "c:\AvanceOS\EXPORT\avanceos\frontend\src" -Recurse -Include *.tsx,*.ts
$changedFilesCount = 0

foreach ($f in $files) {
  $lines = [System.IO.File]::ReadAllLines($f.FullName)
  $changedFile = $false

  for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]

    # Skip lines that are purely type declarations or imports to avoid renaming variables
    if ($line -match "^\s*import " -or $line -match "^\s*export type " -or $line -match "^\s*type " -or $line -match "^\s*interface ") {
      continue
    }

    $newLine = $line
    foreach ($pair in $words) {
        $key = $pair[0]
        $val = $pair[1]
        
        if ($newLine -match "\b$key\b") {
            # Use Regex to replace ONLY inside quotes or tag contents
            
            # 1. Replace inside single quotes
            $newLine = [regex]::Replace($newLine, "(')([^']*?\b$key\b[^']*?)(')", {
                param($m)
                return $m.Groups[1].Value + $m.Groups[2].Value.Replace($key, $val) + $m.Groups[3].Value
            })
            
            # 2. Replace inside double quotes
            $newLine = [regex]::Replace($newLine, '(")([^"]*?\b$key\b[^"]*?)(")', {
                param($m)
                return $m.Groups[1].Value + $m.Groups[2].Value.Replace($key, $val) + $m.Groups[3].Value
            })
            
            # 3. Replace inside backticks
            $newLine = [regex]::Replace($newLine, "(`)([^`]*?\b$key\b[^`]*?)(`)", {
                param($m)
                return $m.Groups[1].Value + $m.Groups[2].Value.Replace($key, $val) + $m.Groups[3].Value
            })

            # 4. Replace inside > < (JSX text nodes)
            $newLine = [regex]::Replace($newLine, "(>)([^<]*?\b$key\b[^<]*?)(<)", {
                param($m)
                return $m.Groups[1].Value + $m.Groups[2].Value.Replace($key, $val) + $m.Groups[3].Value
            })
        }
    }

    if ($line -cne $newLine) {
      $lines[$i] = $newLine
      $changedFile = $true
      Write-Host "Changed in $($f.Name): $line -> $newLine"
    }
  }

  if ($changedFile) {
    [System.IO.File]::WriteAllLines($f.FullName, $lines, [System.Text.Encoding]::UTF8)
    $changedFilesCount++
  }
}

Write-Host "Total files changed: $changedFilesCount"
