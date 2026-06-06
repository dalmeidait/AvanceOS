export type AgendaStatus =
  | 'AGENDADO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_PECA'
  | 'AGUARDANDO_CLIENTE'
  | 'CONCLUIDO'
  | 'CANCELADO'

export type AgendaMaquina = {
  id: string
  maquina: string
  recursoId?: string
  status: AgendaStatus | string
  data?: string
  horaEntrada: string
  horaPrevistaSaida?: string | null
  horaSaida?: string | null
  observacoes?: string | null
  ordemServicoId?: string | null
  clienteId?: string | null
  veiculoId?: string | null
  responsavelId?: string | null
  veiculoDesc?: string | null
  ordemServico?: {
    id: string
    numero?: number | string | null
    numeroOS?: number | string | null
    status?: string | null
  } | null
  cliente?: {
    id: string
    nome: string
    documento?: string | null
  } | null
  veiculo?: {
    id: string
    placa: string
    marca?: string | null
    modelo?: string | null
    ano?: string | null
  } | null
  responsavel?: {
    id: string
    nome: string
    cargo?: string | null
  } | null
}

export type AgendaPayload = {
  maquina: string
  ordemServicoId?: string
  clienteId: string
  veiculoId?: string
  veiculoDesc?: string
  responsavelId?: string
  horaEntrada: string
  horaPrevistaSaida?: string
  horaSaida?: string
  status: AgendaStatus
  observacoes?: string
}

export type AgendaOpcoes = {
  maquinas: string[]
  status: AgendaStatus[]
  clientes: Array<{ id: string; nome: string; documento?: string | null }>
  veiculos: Array<{
    id: string
    clienteId: string
    placa: string
    marca?: string | null
    modelo?: string | null
    ano?: string | null
    clienteNome?: string | null
  }>
  ordensServico: Array<{
    id: string
    numero?: number | string | null
    numeroOS?: number | string | null
    clienteId: string
    veiculoId: string
    clienteNome?: string | null
    veiculoDescricao?: string | null
    status?: string | null
  }>
  usuarios: Array<{ id: string; nome: string; cargo?: string | null; email?: string | null }>
}
