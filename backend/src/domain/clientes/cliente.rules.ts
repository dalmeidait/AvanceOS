export function calcularNivelEDesconto(totalGasto: number): { nivel: string; percentualDesconto: number } {
  if (totalGasto <= 2000.00) {
    return { nivel: 'Bronze', percentualDesconto: 0 };
  } else if (totalGasto <= 5000.00) {
    return { nivel: 'Prata', percentualDesconto: 5 };
  } else if (totalGasto <= 10000.00) {
    return { nivel: 'Ouro', percentualDesconto: 10 };
  } else if (totalGasto <= 20000.00) {
    return { nivel: 'Platina', percentualDesconto: 15 };
  } else {
    return { nivel: 'Diamante', percentualDesconto: 20 };
  }
}