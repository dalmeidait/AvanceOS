export function calcularFinanceiroOs(os: any) {
  const itens = Array.isArray(os?.itens) ? os.itens : [];
  const totalServicos = itens
    .filter((item: any) => !item.produtoId)
    .reduce((acc: number, item: any) => acc + Number(item.subtotal ?? Number(item.quantidade || 0) * Number(item.valorUnitario || 0)), 0);
  const totalPecas = itens
    .filter((item: any) => item.produtoId)
    .reduce((acc: number, item: any) => acc + Number(item.subtotal ?? Number(item.quantidade || 0) * Number(item.valorUnitario || 0)), 0);
  const desconto = Number(os?.descontoAplicado || 0);
  const totalGeral = Math.max(totalServicos + totalPecas - desconto, 0);
  const transacoes = Array.isArray(os?.transacoes) ? os.transacoes : [];
  const transacoesPagas = transacoes.filter((transacao: any) =>
    transacao.tipo === 'RECEITA' && transacao.status === 'PAGO',
  );
  const pagamentosLegados = Array.isArray(os?.pagamentos) ? os.pagamentos : [];
  // TransacaoFinanceira e a fonte principal; Pagamento fica apenas como fallback legado.
  const pagamentos = transacoesPagas.length > 0
    ? transacoesPagas
    : pagamentosLegados.map((pagamento: any) => ({
        id: pagamento.id,
        tipo: 'RECEITA',
        valor: pagamento.valor,
        status: 'PAGO',
        metodoPagamento: pagamento.metodoPagamento || pagamento.forma_pagamento,
        dataPagamento: pagamento.dataPagamento || pagamento.data_pagamento,
        ordemServicoId: pagamento.ordemServicoId || pagamento.ordem_servico_id,
      }));
  const valorPago = pagamentos.reduce((acc: number, transacao: any) => acc + Number(transacao.valor || 0), 0);
  const saldoPendente = Math.max(totalGeral - valorPago, 0);
  const statusFinanceiro = os?.status === 'CANCELADA'
    ? 'CANCELADO'
    : valorPago <= 0
      ? 'PENDENTE'
      : saldoPendente > 0
        ? 'PARCIAL'
        : 'PAGO';

  return {
    totalServicos,
    totalPecas,
    desconto,
    totalGeral,
    totalOS: totalGeral,
    pagamentos,
    valorPago,
    totalPago: valorPago,
    saldoPendente,
    statusFinanceiro,
  };
}
