BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[usuarios] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [senhaHash] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [cargo] NVARCHAR(1000) NOT NULL CONSTRAINT [usuarios_cargo_df] DEFAULT 'RECEPCIONISTA',
    [isActive] BIT NOT NULL CONSTRAINT [usuarios_isActive_df] DEFAULT 1,
    [mfaAtivo] BIT NOT NULL CONSTRAINT [usuarios_mfaAtivo_df] DEFAULT 0,
    [mfaSecret] NVARCHAR(1000),
    [versaoToken] INT NOT NULL CONSTRAINT [usuarios_versaoToken_df] DEFAULT 0,
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [usuarios_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizadoEm] DATETIME2 NOT NULL,
    CONSTRAINT [usuarios_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [usuarios_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[fornecedores] (
    [id] NVARCHAR(1000) NOT NULL,
    [cnpj] NVARCHAR(1000) NOT NULL,
    [razaoSocial] NVARCHAR(1000) NOT NULL,
    [nomeFantasia] NVARCHAR(1000) NOT NULL,
    [emailFinanceiro] NVARCHAR(1000),
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [fornecedores_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizadoEm] DATETIME2 NOT NULL,
    CONSTRAINT [fornecedores_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [fornecedores_cnpj_key] UNIQUE NONCLUSTERED ([cnpj])
);

-- CreateTable
CREATE TABLE [dbo].[representantes] (
    [id] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [whatsapp] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [representantes_isActive_df] DEFAULT 1,
    [fornecedorId] NVARCHAR(1000) NOT NULL,
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [representantes_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizadoEm] DATETIME2 NOT NULL,
    CONSTRAINT [representantes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[logs_auditoria] (
    [id] NVARCHAR(1000) NOT NULL,
    [usuarioId] NVARCHAR(1000) NOT NULL,
    [acao] NVARCHAR(1000) NOT NULL,
    [entidadeAfetada] NVARCHAR(1000) NOT NULL,
    [entidadeId] NVARCHAR(1000) NOT NULL,
    [valoresAntigos] NVARCHAR(1000),
    [valoresNovos] NVARCHAR(1000),
    [nivelVisibilidade] NVARCHAR(1000) NOT NULL CONSTRAINT [logs_auditoria_nivelVisibilidade_df] DEFAULT 'BASICO',
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [logs_auditoria_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [logs_auditoria_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Cliente] (
    [id] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [cpf_cnpj] NVARCHAR(1000) NOT NULL,
    [telefone] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [cep] NVARCHAR(1000),
    [bairro] NVARCHAR(1000),
    [rua] NVARCHAR(1000),
    [numero] NVARCHAR(1000),
    [complemento] NVARCHAR(1000),
    [cidade] NVARCHAR(1000),
    [estado] NVARCHAR(1000),
    [totalGasto] FLOAT(53) NOT NULL CONSTRAINT [Cliente_totalGasto_df] DEFAULT 0,
    [nivelDesconto] NVARCHAR(1000) NOT NULL CONSTRAINT [Cliente_nivelDesconto_df] DEFAULT 'Bronze',
    [percentualDesconto] FLOAT(53) NOT NULL CONSTRAINT [Cliente_percentualDesconto_df] DEFAULT 0,
    [aceitaMarketing] BIT NOT NULL CONSTRAINT [Cliente_aceitaMarketing_df] DEFAULT 1,
    [ultimaRevisao] DATETIME2,
    [criado_em] DATETIME2 NOT NULL CONSTRAINT [Cliente_criado_em_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Cliente_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Cliente_cpf_cnpj_key] UNIQUE NONCLUSTERED ([cpf_cnpj]),
    CONSTRAINT [Cliente_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Veiculo] (
    [id] NVARCHAR(1000) NOT NULL,
    [placa] NVARCHAR(1000) NOT NULL,
    [modelo] NVARCHAR(1000) NOT NULL,
    [marca] NVARCHAR(1000) NOT NULL,
    [ano] NVARCHAR(1000),
    [cor] NVARCHAR(1000),
    [quilometragem] INT,
    [avarias_previas] BIT CONSTRAINT [Veiculo_avarias_previas_df] DEFAULT 0,
    [avarias_previas_desc] NVARCHAR(1000),
    [pertences_valor] BIT CONSTRAINT [Veiculo_pertences_valor_df] DEFAULT 0,
    [pertences_valor_desc] NVARCHAR(1000),
    [luzes_painel] BIT CONSTRAINT [Veiculo_luzes_painel_df] DEFAULT 0,
    [luzes_painel_desc] NVARCHAR(1000),
    [cliente_id] NVARCHAR(1000) NOT NULL,
    [criado_em] DATETIME2 NOT NULL CONSTRAINT [Veiculo_criado_em_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Veiculo_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Veiculo_placa_key] UNIQUE NONCLUSTERED ([placa])
);

-- CreateTable
CREATE TABLE [dbo].[produtos] (
    [id] NVARCHAR(1000) NOT NULL,
    [sku] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [descricao] NVARCHAR(1000),
    [marca] NVARCHAR(1000) NOT NULL,
    [categoria] NVARCHAR(1000) NOT NULL CONSTRAINT [produtos_categoria_df] DEFAULT 'GERAL',
    [tipo] NVARCHAR(1000) NOT NULL CONSTRAINT [produtos_tipo_df] DEFAULT 'PECA',
    [unidade] NVARCHAR(1000) NOT NULL CONSTRAINT [produtos_unidade_df] DEFAULT 'UN',
    [veiculosCompativeis] NVARCHAR(1000) NOT NULL,
    [localizacaoFisica] NVARCHAR(1000) NOT NULL,
    [fornecedor] NVARCHAR(1000),
    [aplicacao] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [produtos_status_df] DEFAULT 'ATIVO',
    [controlaEstoque] BIT NOT NULL CONSTRAINT [produtos_controlaEstoque_df] DEFAULT 1,
    [podeVenderPdv] BIT NOT NULL CONSTRAINT [produtos_podeVenderPdv_df] DEFAULT 1,
    [podeVincularOs] BIT NOT NULL CONSTRAINT [produtos_podeVincularOs_df] DEFAULT 1,
    [estoqueMinimo] INT NOT NULL CONSTRAINT [produtos_estoqueMinimo_df] DEFAULT 5,
    [precoCusto] FLOAT(53) NOT NULL,
    [precoVenda] FLOAT(53) NOT NULL,
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [produtos_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizadoEm] DATETIME2 NOT NULL,
    CONSTRAINT [produtos_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [produtos_sku_key] UNIQUE NONCLUSTERED ([sku])
);

-- CreateTable
CREATE TABLE [dbo].[servicos] (
    [id] NVARCHAR(1000) NOT NULL,
    [codigo] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [descricao] NVARCHAR(1000),
    [categoria] NVARCHAR(1000) NOT NULL CONSTRAINT [servicos_categoria_df] DEFAULT 'GERAL',
    [valor] DECIMAL(12,2) NOT NULL,
    [tempoEstimadoMinutos] INT,
    [geraComissao] BIT NOT NULL CONSTRAINT [servicos_geraComissao_df] DEFAULT 0,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [servicos_status_df] DEFAULT 'ATIVO',
    [observacaoTecnica] NVARCHAR(1000),
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [servicos_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizadoEm] DATETIME2 NOT NULL,
    CONSTRAINT [servicos_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [servicos_codigo_key] UNIQUE NONCLUSTERED ([codigo])
);

-- CreateTable
CREATE TABLE [dbo].[movimentacoes_estoque] (
    [id] NVARCHAR(1000) NOT NULL,
    [tipo] NVARCHAR(1000) NOT NULL,
    [quantidade] INT NOT NULL,
    [justificativa] NVARCHAR(1000),
    [usuarioId] NVARCHAR(1000) NOT NULL,
    [notaFiscal] NVARCHAR(1000),
    [fornecedorId] NVARCHAR(1000),
    [custoUnitario] FLOAT(53),
    [produtoId] NVARCHAR(1000) NOT NULL,
    [ordemServicoId] NVARCHAR(1000),
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [movimentacoes_estoque_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [movimentacoes_estoque_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ordens_servico] (
    [id] NVARCHAR(1000) NOT NULL,
    [numeroOS] INT NOT NULL IDENTITY(1,1),
    [placaVeiculo] NVARCHAR(1000) NOT NULL,
    [modeloVeiculo] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [ordens_servico_status_df] DEFAULT 'ABERTA',
    [codigoUnicoAceite] NVARCHAR(1000) NOT NULL,
    [termoAssinadoUrl] NVARCHAR(1000),
    [descricao] NVARCHAR(1000),
    [relatoMecanico] NVARCHAR(1000),
    [diagnostico] NVARCHAR(1000),
    [valorMaoDeObra] FLOAT(53) NOT NULL CONSTRAINT [ordens_servico_valorMaoDeObra_df] DEFAULT 0,
    [descontoAplicado] FLOAT(53) NOT NULL CONSTRAINT [ordens_servico_descontoAplicado_df] DEFAULT 0,
    [valorFinal] FLOAT(53) NOT NULL CONSTRAINT [ordens_servico_valorFinal_df] DEFAULT 0,
    [cliente_id] NVARCHAR(1000) NOT NULL,
    [veiculo_id] NVARCHAR(1000) NOT NULL,
    [responsavel_id] NVARCHAR(1000),
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [ordens_servico_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizadoEm] DATETIME2 NOT NULL,
    CONSTRAINT [ordens_servico_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ordens_servico_numeroOS_key] UNIQUE NONCLUSTERED ([numeroOS]),
    CONSTRAINT [ordens_servico_codigoUnicoAceite_key] UNIQUE NONCLUSTERED ([codigoUnicoAceite])
);

-- CreateTable
CREATE TABLE [dbo].[itens_os] (
    [id] NVARCHAR(1000) NOT NULL,
    [tipoItem] NVARCHAR(1000) NOT NULL CONSTRAINT [itens_os_tipoItem_df] DEFAULT 'PRODUTO',
    [quantidade] INT NOT NULL,
    [valorUnitario] FLOAT(53) NOT NULL,
    [subtotal] FLOAT(53) NOT NULL CONSTRAINT [itens_os_subtotal_df] DEFAULT 0,
    [descricao] NVARCHAR(1000),
    [observacao] NVARCHAR(1000),
    [ordemServicoId] NVARCHAR(1000) NOT NULL,
    [servicoId] NVARCHAR(1000),
    [produtoId] NVARCHAR(1000),
    [servicoNome] NVARCHAR(1000),
    [mecanicoId] NVARCHAR(1000),
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [itens_os_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizadoEm] DATETIME2 NOT NULL,
    CONSTRAINT [itens_os_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[solicitacoes_estoque] (
    [id] NVARCHAR(1000) NOT NULL,
    [ordemServicoId] NVARCHAR(1000),
    [veiculoId] NVARCHAR(1000),
    [clienteId] NVARCHAR(1000),
    [mecanicoId] NVARCHAR(1000),
    [nomeProdutoSolicitado] NVARCHAR(1000) NOT NULL,
    [categoria] NVARCHAR(1000),
    [tipoItem] NVARCHAR(1000) NOT NULL CONSTRAINT [solicitacoes_estoque_tipoItem_df] DEFAULT 'PECA',
    [quantidadeSolicitada] FLOAT(53) NOT NULL,
    [unidade] NVARCHAR(1000) NOT NULL CONSTRAINT [solicitacoes_estoque_unidade_df] DEFAULT 'UN',
    [aplicacao] NVARCHAR(1000),
    [justificativaTecnica] NVARCHAR(1000) NOT NULL,
    [urgencia] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [solicitacoes_estoque_status_df] DEFAULT 'PENDENTE',
    [observacoes] NVARCHAR(1000),
    [produtoVinculadoId] NVARCHAR(1000),
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [solicitacoes_estoque_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    [atualizadoEm] DATETIME2 NOT NULL,
    CONSTRAINT [solicitacoes_estoque_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Pagamento] (
    [id] NVARCHAR(1000) NOT NULL,
    [ordem_servico_id] NVARCHAR(1000) NOT NULL,
    [forma_pagamento] NVARCHAR(1000) NOT NULL,
    [valor] FLOAT(53) NOT NULL,
    [data_pagamento] DATETIME2 NOT NULL CONSTRAINT [Pagamento_data_pagamento_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Pagamento_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[transacoes_financeiras] (
    [id] NVARCHAR(1000) NOT NULL,
    [tipo] NVARCHAR(1000) NOT NULL,
    [valor] FLOAT(53) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [transacoes_financeiras_status_df] DEFAULT 'PENDENTE',
    [metodoPagamento] NVARCHAR(1000) NOT NULL,
    [dataVencimento] DATETIME2 NOT NULL,
    [dataPagamento] DATETIME2,
    [ordemServicoId] NVARCHAR(1000),
    [vendaPdvId] NVARCHAR(1000),
    [categoriaId] NVARCHAR(1000),
    [mecanicoId] NVARCHAR(1000),
    CONSTRAINT [transacoes_financeiras_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[categorias_financeiras] (
    [id] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [codigoContabil] NVARCHAR(1000),
    CONSTRAINT [categorias_financeiras_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[comissoes_mecanicos] (
    [id] NVARCHAR(1000) NOT NULL,
    [mecanicoId] NVARCHAR(1000) NOT NULL,
    [ordemServicoId] NVARCHAR(1000) NOT NULL,
    [valor] FLOAT(53) NOT NULL,
    [dataLcto] DATETIME2 NOT NULL CONSTRAINT [comissoes_mecanicos_dataLcto_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [comissoes_mecanicos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[sessoes_caixa] (
    [id] NVARCHAR(1000) NOT NULL,
    [usuarioId] NVARCHAR(1000) NOT NULL,
    [dataAbertura] DATETIME2 NOT NULL CONSTRAINT [sessoes_caixa_dataAbertura_df] DEFAULT CURRENT_TIMESTAMP,
    [dataFechamento] DATETIME2,
    [saldoInicial] FLOAT(53) NOT NULL,
    [saldoFinalCalculado] FLOAT(53) NOT NULL CONSTRAINT [sessoes_caixa_saldoFinalCalculado_df] DEFAULT 0,
    [saldoFinalInformado] FLOAT(53),
    CONSTRAINT [sessoes_caixa_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[vendas_pdv] (
    [id] NVARCHAR(1000) NOT NULL,
    [clienteId] NVARCHAR(1000),
    [valorTotal] FLOAT(53) NOT NULL,
    [criadoEm] DATETIME2 NOT NULL CONSTRAINT [vendas_pdv_criadoEm_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [vendas_pdv_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[itens_venda_pdv] (
    [id] NVARCHAR(1000) NOT NULL,
    [vendaId] NVARCHAR(1000) NOT NULL,
    [produtoId] NVARCHAR(1000) NOT NULL,
    [quantidade] INT NOT NULL,
    [valorUn] FLOAT(53) NOT NULL,
    CONSTRAINT [itens_venda_pdv_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[recursos_fisicos] (
    [id] NVARCHAR(1000) NOT NULL,
    [nome] NVARCHAR(1000) NOT NULL,
    [tipo] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [recursos_fisicos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[agendamentos] (
    [id] NVARCHAR(1000) NOT NULL,
    [dataInicio] DATETIME2 NOT NULL,
    [dataFim] DATETIME2 NOT NULL,
    [clienteId] NVARCHAR(1000) NOT NULL,
    [veiculoDesc] NVARCHAR(1000) NOT NULL,
    [recursoId] NVARCHAR(1000) NOT NULL,
    [mecanicoId] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [agendamentos_status_df] DEFAULT 'PENDENTE',
    CONSTRAINT [agendamentos_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[pesquisas_nps] (
    [id] NVARCHAR(1000) NOT NULL,
    [nota] INT NOT NULL,
    [comentario] NVARCHAR(1000),
    [ordemServicoId] NVARCHAR(1000) NOT NULL,
    [dataResposta] DATETIME2 NOT NULL CONSTRAINT [pesquisas_nps_dataResposta_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [pesquisas_nps_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [pesquisas_nps_ordemServicoId_key] UNIQUE NONCLUSTERED ([ordemServicoId])
);

-- AddForeignKey
ALTER TABLE [dbo].[representantes] ADD CONSTRAINT [representantes_fornecedorId_fkey] FOREIGN KEY ([fornecedorId]) REFERENCES [dbo].[fornecedores]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[logs_auditoria] ADD CONSTRAINT [logs_auditoria_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[usuarios]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Veiculo] ADD CONSTRAINT [Veiculo_cliente_id_fkey] FOREIGN KEY ([cliente_id]) REFERENCES [dbo].[Cliente]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[movimentacoes_estoque] ADD CONSTRAINT [movimentacoes_estoque_fornecedorId_fkey] FOREIGN KEY ([fornecedorId]) REFERENCES [dbo].[fornecedores]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[movimentacoes_estoque] ADD CONSTRAINT [movimentacoes_estoque_produtoId_fkey] FOREIGN KEY ([produtoId]) REFERENCES [dbo].[produtos]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[movimentacoes_estoque] ADD CONSTRAINT [movimentacoes_estoque_usuarioId_fkey] FOREIGN KEY ([usuarioId]) REFERENCES [dbo].[usuarios]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico] ADD CONSTRAINT [ordens_servico_cliente_id_fkey] FOREIGN KEY ([cliente_id]) REFERENCES [dbo].[Cliente]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico] ADD CONSTRAINT [ordens_servico_responsavel_id_fkey] FOREIGN KEY ([responsavel_id]) REFERENCES [dbo].[usuarios]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ordens_servico] ADD CONSTRAINT [ordens_servico_veiculo_id_fkey] FOREIGN KEY ([veiculo_id]) REFERENCES [dbo].[Veiculo]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[itens_os] ADD CONSTRAINT [itens_os_ordemServicoId_fkey] FOREIGN KEY ([ordemServicoId]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[itens_os] ADD CONSTRAINT [itens_os_servicoId_fkey] FOREIGN KEY ([servicoId]) REFERENCES [dbo].[servicos]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[itens_os] ADD CONSTRAINT [itens_os_produtoId_fkey] FOREIGN KEY ([produtoId]) REFERENCES [dbo].[produtos]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[solicitacoes_estoque] ADD CONSTRAINT [solicitacoes_estoque_ordemServicoId_fkey] FOREIGN KEY ([ordemServicoId]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[solicitacoes_estoque] ADD CONSTRAINT [solicitacoes_estoque_produtoVinculadoId_fkey] FOREIGN KEY ([produtoVinculadoId]) REFERENCES [dbo].[produtos]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Pagamento] ADD CONSTRAINT [Pagamento_ordem_servico_id_fkey] FOREIGN KEY ([ordem_servico_id]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[transacoes_financeiras] ADD CONSTRAINT [transacoes_financeiras_categoriaId_fkey] FOREIGN KEY ([categoriaId]) REFERENCES [dbo].[categorias_financeiras]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[transacoes_financeiras] ADD CONSTRAINT [transacoes_financeiras_ordemServicoId_fkey] FOREIGN KEY ([ordemServicoId]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[transacoes_financeiras] ADD CONSTRAINT [transacoes_financeiras_vendaPdvId_fkey] FOREIGN KEY ([vendaPdvId]) REFERENCES [dbo].[vendas_pdv]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[itens_venda_pdv] ADD CONSTRAINT [itens_venda_pdv_vendaId_fkey] FOREIGN KEY ([vendaId]) REFERENCES [dbo].[vendas_pdv]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[agendamentos] ADD CONSTRAINT [agendamentos_recursoId_fkey] FOREIGN KEY ([recursoId]) REFERENCES [dbo].[recursos_fisicos]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[pesquisas_nps] ADD CONSTRAINT [pesquisas_nps_ordemServicoId_fkey] FOREIGN KEY ([ordemServicoId]) REFERENCES [dbo].[ordens_servico]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
