import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

const MAQUINAS_PADRAO = [
  'Elevador 01',
  'Elevador 02',
  'Elevador 03',
  'Elevador 04',
  'Box Rápido 01',
  'Box Rápido 02',
  'Box Diagnóstico 01',
  'Box Diagnóstico 02',
  'Scanner/Diagnóstico',
  'Alinhamento',
  'Balanceamento',
  'Elétrica/Eletrônica',
  'Ar-condicionado',
  'Revisão Geral',
  'Entrega Técnica',
  'Pátio/Aguardando Serviço',
];

const STATUS_AGENDA = [
  'AGENDADO',
  'EM_ANDAMENTO',
  'AGUARDANDO_PECA',
  'AGUARDANDO_CLIENTE',
  'CONCLUIDO',
  'CANCELADO',
];

type AgendaFilters = {
  data?: string;
  maquina?: string;
  status?: string;
  responsavelId?: string;
  ordemServicoId?: string;
};

@Injectable()
export class AgendamentoService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateTime(value: any, field: string) {
    if (!value) throw new BadRequestException(`${field} e obrigatorio.`);
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${field} inválido.`);
    return date;
  }

  private parseOptionalDateTime(value: any, field: string) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${field} inválido.`);
    return date;
  }

  private normalizeStatus(value?: string | null) {
    const status = String(value || 'AGENDADO').trim().toUpperCase();
    if (!STATUS_AGENDA.includes(status)) throw new BadRequestException('Status da agenda inválido.');
    return status;
  }

  private normalizeMachine(value?: string | null) {
    const machine = String(value || '').trim();
    if (!machine) throw new BadRequestException('Máquina obrigatória.');
    const found = MAQUINAS_PADRAO.find((item) => item.toLowerCase() === machine.toLowerCase());
    if (!found) throw new BadRequestException('Máquina inválida.');
    return found;
  }

  private async ensureMachineResource(maquina: string) {
    const nome = this.normalizeMachine(maquina);
    const existing = await this.prisma.recursoFisico.findFirst({ where: { nome } });
    if (existing) return existing;
    return this.prisma.recursoFisico.create({ data: { nome, tipo: 'MAQUINA' } });
  }

  private endForConflict(agenda: any) {
    if (agenda.dataFim) return new Date(agenda.dataFim);
    if (agenda.horaSaida) return new Date(agenda.horaSaida);
    if (agenda.status === 'EM_ANDAMENTO') return new Date('9999-12-31T23:59:59.000Z');
    return new Date(new Date(agenda.dataInicio).getTime() + 60 * 60 * 1000);
  }

  private intervalsConflict(startA: Date, endA: Date, startB: Date, endB: Date) {
    return startA < endB && endA > startB;
  }

  private buildDayFilter(data?: string) {
    if (!data) return {};
    const start = new Date(`${data}T00:00:00.000`);
    const end = new Date(`${data}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Data inválida. Use YYYY-MM-DD.');
    }
    return { dataInicio: { gte: start, lte: end } };
  }

  private validateExpediente(inicio: Date, fim?: Date | null) {
    const day = inicio.getDay();
    if (day === 0 || day === 6) {
      throw new BadRequestException('A oficina funciona de segunda a sexta.');
    }
    const startHour = inicio.getHours() + inicio.getMinutes() / 60;
    if (startHour < 8 || startHour > 18) {
      throw new BadRequestException('A oficina funciona das 08:00 as 18:00.');
    }

    if (fim) {
      const endDay = fim.getDay();
      if (endDay === 0 || endDay === 6) {
        throw new BadRequestException('A oficina funciona de segunda a sexta.');
      }
      const endHour = fim.getHours() + fim.getMinutes() / 60;
      if (endHour < 8 || endHour > 18) {
        throw new BadRequestException('A oficina funciona das 08:00 as 18:00.');
      }
    }
  }

  private async validateConflict(params: {
    id?: string;
    recursoId: string;
    inicio: Date;
    fim?: Date | null;
  }) {
    const fim = params.fim || new Date(params.inicio.getTime() + 60 * 60 * 1000);
    if (fim <= params.inicio) {
      throw new BadRequestException('Horario previsto de saida deve ser maior que a entrada.');
    }

    this.validateExpediente(params.inicio, fim);

    const sameDayStart = new Date(params.inicio);
    sameDayStart.setHours(0, 0, 0, 0);
    const sameDayEnd = new Date(params.inicio);
    sameDayEnd.setHours(23, 59, 59, 999);

    const candidates = await this.prisma.agendamento.findMany({
      where: {
        recursoId: params.recursoId,
        status: { not: 'CANCELADO' },
        id: params.id ? { not: params.id } : undefined,
        dataInicio: { gte: sameDayStart, lte: sameDayEnd },
      },
      include: { recurso: true },
    });

    const conflict = candidates.find((item) =>
      this.intervalsConflict(params.inicio, fim, new Date(item.dataInicio), this.endForConflict(item)),
    );

    if (conflict) {
      throw new ConflictException(`A máquina '${conflict.recurso?.nome || 'selecionada'}' já possui agendamento conflitante neste horário.`);
    }
  }

  private async resolveFromOs(data: any) {
    if (!data.ordemServicoId) return data;
    const os = await this.prisma.ordemServico.findUnique({
      where: { id: data.ordemServicoId },
      include: { cliente: true, veiculo: true },
    });
    if (!os) throw new NotFoundException('Ordem de Serviço não encontrada.');
    return {
      ...data,
      clienteId: data.clienteId || os.cliente_id,
      veiculoId: data.veiculoId || os.veiculo_id,
      veiculoDesc: data.veiculoDesc || [os.veiculo?.marca, os.veiculo?.modelo, os.veiculo?.placa].filter(Boolean).join(' ') || os.modeloVeiculo,
    };
  }

  private async mapAgenda(item: any) {
    const [cliente, veiculo, responsavel, ordemServico] = await Promise.all([
      item.clienteId ? this.prisma.cliente.findUnique({ where: { id: item.clienteId } }) : null,
      item.veiculoId ? this.prisma.veiculo.findUnique({ where: { id: item.veiculoId } }) : null,
      (item.responsavelId || item.mecanicoId)
        ? this.prisma.usuario.findUnique({ where: { id: item.responsavelId || item.mecanicoId } })
        : null,
      item.ordemServicoId ? this.prisma.ordemServico.findUnique({ where: { id: item.ordemServicoId } }) : null,
    ]);

    return {
      id: item.id,
      maquina: item.recurso?.nome || item.maquina,
      recursoId: item.recursoId,
      status: item.status,
      data: item.dataInicio,
      horaEntrada: item.dataInicio,
      horaPrevistaSaida: item.dataFim,
      horaSaida: item.horaSaida,
      observacoes: item.observacoes,
      ordemServicoId: item.ordemServicoId,
      clienteId: item.clienteId,
      veiculoId: item.veiculoId,
      responsavelId: item.responsavelId || item.mecanicoId,
      veiculoDesc: item.veiculoDesc,
      ordemServico: ordemServico
        ? { id: ordemServico.id, numero: ordemServico.numeroOS, numeroOS: ordemServico.numeroOS, status: ordemServico.status }
        : null,
      cliente: cliente ? { id: cliente.id, nome: cliente.nome, documento: cliente.cpf_cnpj } : null,
      veiculo: veiculo
        ? { id: veiculo.id, placa: veiculo.placa, marca: veiculo.marca, modelo: veiculo.modelo, ano: veiculo.ano }
        : null,
      responsavel: responsavel ? { id: responsavel.id, nome: responsavel.nome, cargo: responsavel.cargo } : null,
      criadoEm: item.criadoEm,
      atualizadoEm: item.atualizadoEm,
    };
  }

  async criar(data: any) {
    const resolved = await this.resolveFromOs(data);
    const maquina = this.normalizeMachine(resolved.maquina || resolved.recursoNome);
    const recurso = await this.ensureMachineResource(maquina);
    const inicio = this.parseDateTime(resolved.horaEntrada || resolved.dataInicio, 'Horario de entrada');
    const fim = this.parseOptionalDateTime(resolved.horaPrevistaSaida || resolved.dataFim, 'Horario previsto de saida');
    const status = this.normalizeStatus(resolved.status);

    if (!resolved.clienteId) throw new BadRequestException('Cliente obrigatorio.');
    if (!resolved.veiculoDesc && !resolved.veiculoId) throw new BadRequestException('Veículo obrigatório.');

    await this.validateConflict({ recursoId: recurso.id, inicio, fim });

    const agenda = await this.prisma.agendamento.create({
      data: {
        dataInicio: inicio,
        dataFim: fim,
        clienteId: resolved.clienteId,
        veiculoDesc: resolved.veiculoDesc || '',
        recursoId: recurso.id,
        mecanicoId: resolved.responsavelId || resolved.mecanicoId || null,
        responsavelId: resolved.responsavelId || resolved.mecanicoId || null,
        ordemServicoId: resolved.ordemServicoId || null,
        veiculoId: resolved.veiculoId || null,
        horaSaida: this.parseOptionalDateTime(resolved.horaSaida, 'Horario real de saida'),
        status,
        observacoes: resolved.observacoes || null,
      },
      include: { recurso: true },
    });

    if (resolved.ordemServicoId) {
      await this.prisma.ordemServicoEvento.create({
        data: {
          ordemServicoId: resolved.ordemServicoId,
          tipo: 'AGENDA_CRIADA',
          titulo: 'Agenda criada para a OS',
          descricao: `OS agendada para ${maquina} com entrada prevista em ${inicio.toLocaleString('pt-BR')}.`,
          origem: 'AGENDA',
          severidade: 'INFO',
          entidade: 'Agendamento',
          entidadeId: agenda.id
        }
      });
    }

    return this.mapAgenda(agenda);
  }

  async findAll(filters: AgendaFilters = {}) {
    const where: any = {
      ...this.buildDayFilter(filters.data),
      status: filters.status ? this.normalizeStatus(filters.status) : undefined,
      ordemServicoId: filters.ordemServicoId || undefined,
      OR: filters.responsavelId
        ? [{ responsavelId: filters.responsavelId }, { mecanicoId: filters.responsavelId }]
        : undefined,
    };

    if (filters.maquina) {
      const recurso = await this.ensureMachineResource(filters.maquina);
      where.recursoId = recurso.id;
    }

    const agendas = await this.prisma.agendamento.findMany({
      where,
      include: { recurso: true },
      orderBy: { dataInicio: 'asc' },
    });

    return Promise.all(agendas.map((item) => this.mapAgenda(item)));
  }

  async findOne(id: string) {
    const agenda = await this.prisma.agendamento.findUnique({ where: { id }, include: { recurso: true } });
    if (!agenda) throw new NotFoundException('Agendamento não encontrado.');
    return this.mapAgenda(agenda);
  }

  async update(id: string, data: any) {
    const atual = await this.prisma.agendamento.findUnique({ where: { id }, include: { recurso: true } });
    if (!atual) throw new NotFoundException('Agendamento não encontrado.');
    const resolved = await this.resolveFromOs(data);
    const recurso = resolved.maquina || resolved.recursoNome
      ? await this.ensureMachineResource(resolved.maquina || resolved.recursoNome)
      : atual.recurso;
    const inicio = resolved.horaEntrada || resolved.dataInicio
      ? this.parseDateTime(resolved.horaEntrada || resolved.dataInicio, 'Horario de entrada')
      : atual.dataInicio;
    const fim = Object.prototype.hasOwnProperty.call(resolved, 'horaPrevistaSaida') || Object.prototype.hasOwnProperty.call(resolved, 'dataFim')
      ? this.parseOptionalDateTime(resolved.horaPrevistaSaida || resolved.dataFim, 'Horario previsto de saida')
      : atual.dataFim;

    await this.validateConflict({ id, recursoId: recurso.id, inicio, fim });

    const agenda = await this.prisma.agendamento.update({
      where: { id },
      data: {
        dataInicio: inicio,
        dataFim: fim,
        recursoId: recurso.id,
        clienteId: resolved.clienteId ?? atual.clienteId,
        veiculoDesc: resolved.veiculoDesc ?? atual.veiculoDesc,
        mecanicoId: resolved.responsavelId ?? resolved.mecanicoId ?? atual.mecanicoId,
        responsavelId: resolved.responsavelId ?? resolved.mecanicoId ?? atual.responsavelId,
        ordemServicoId: resolved.ordemServicoId !== undefined ? resolved.ordemServicoId || null : atual.ordemServicoId,
        veiculoId: resolved.veiculoId !== undefined ? resolved.veiculoId || null : atual.veiculoId,
        horaSaida: Object.prototype.hasOwnProperty.call(resolved, 'horaSaida')
          ? this.parseOptionalDateTime(resolved.horaSaida, 'Horario real de saida')
          : atual.horaSaida,
        status: resolved.status ? this.normalizeStatus(resolved.status) : atual.status,
        observacoes: resolved.observacoes !== undefined ? resolved.observacoes || null : atual.observacoes,
      },
      include: { recurso: true },
    });

    return this.mapAgenda(agenda);
  }

  async alterarStatus(id: string, statusValue: string) {
    const status = this.normalizeStatus(statusValue);
    const atual = await this.prisma.agendamento.findUnique({ where: { id } });
    if (!atual) throw new NotFoundException('Agendamento não encontrado.');
    const agenda = await this.prisma.agendamento.update({
      where: { id },
      data: {
        status,
        horaSaida: status === 'CONCLUIDO' && !atual.horaSaida ? new Date() : atual.horaSaida,
      },
      include: { recurso: true },
    });

    if (agenda.ordemServicoId && atual.status !== status) {
      let tipo, titulo, descricao;
      if (status === 'EM_ANDAMENTO') {
        tipo = 'AGENDA_INICIADA';
        titulo = 'Execução iniciada na agenda';
        descricao = 'Agenda da OS marcada como em andamento.';
      } else if (status === 'CONCLUIDO') {
        tipo = 'AGENDA_CONCLUIDA';
        titulo = 'Agenda concluída';
        descricao = 'Execução agendada da OS foi concluída.';
      } else if (status === 'CANCELADO') {
        tipo = 'AGENDA_CANCELADA';
        titulo = 'Agenda cancelada';
        descricao = 'Agendamento vinculado à OS foi cancelado.';
      }
      
      if (tipo) {
        await this.prisma.ordemServicoEvento.create({
          data: {
            ordemServicoId: agenda.ordemServicoId,
            tipo,
            titulo,
            descricao,
            origem: 'AGENDA',
            severidade: 'INFO',
            entidade: 'Agendamento',
            entidadeId: agenda.id
          }
        });
      }
    }

    return this.mapAgenda(agenda);
  }

  async registrarSaida(id: string, horaSaida?: string) {
    const agenda = await this.prisma.agendamento.update({
      where: { id },
      data: { horaSaida: horaSaida ? this.parseDateTime(horaSaida, 'Horario real de saida') : new Date() },
      include: { recurso: true },
    });
    return this.mapAgenda(agenda);
  }

  async remove(id: string) {
    await this.findOne(id);
    const agenda = await this.prisma.agendamento.update({
      where: { id },
      data: { status: 'CANCELADO' },
      include: { recurso: true },
    });

    if (agenda.ordemServicoId) {
      await this.prisma.ordemServicoEvento.create({
        data: {
          ordemServicoId: agenda.ordemServicoId,
          tipo: 'AGENDA_CANCELADA',
          titulo: 'Agenda cancelada',
          descricao: 'Agendamento vinculado à OS foi cancelado.',
          origem: 'AGENDA',
          severidade: 'INFO',
          entidade: 'Agendamento',
          entidadeId: agenda.id
        }
      });
    }

    return this.mapAgenda(agenda);
  }

  async criarRecurso(nome: string, tipo: string) {
    return this.prisma.recursoFisico.create({ data: { nome, tipo } });
  }

  async opcoes() {
    await Promise.all(MAQUINAS_PADRAO.map((maquina) => this.ensureMachineResource(maquina)));
    const [clientes, veiculos, ordensServico, usuarios] = await Promise.all([
      this.prisma.cliente.findMany({ orderBy: { nome: 'asc' } }),
      this.prisma.veiculo.findMany({ include: { cliente: true }, orderBy: { placa: 'asc' } }),
      this.prisma.ordemServico.findMany({
        where: { status: { in: ['CONCLUIDO', 'CONCLUIDA', 'EM_EXECUCAO', 'ABERTA', 'APROVADA'] } },
        include: { cliente: true, veiculo: true },
        orderBy: { criadoEm: 'desc' },
        take: 100,
      }),
      this.prisma.usuario.findMany({
        where: {
          isActive: true,
          cargo: {
            in: ['ADMIN', 'ADMINISTRADOR', 'DIRETOR', 'MECANICO', 'TECNICO', 'MECÂNICO', 'TÉCNICO']
          }
        },
        select: { id: true, nome: true, cargo: true, email: true },
        orderBy: { nome: 'asc' },
      }),
    ]);

    return {
      maquinas: MAQUINAS_PADRAO,
      status: STATUS_AGENDA,
      clientes: clientes.map((cliente) => ({ id: cliente.id, nome: cliente.nome, documento: cliente.cpf_cnpj })),
      veiculos: veiculos.map((veiculo) => ({
        id: veiculo.id,
        clienteId: veiculo.cliente_id,
        placa: veiculo.placa,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        clienteNome: veiculo.cliente?.nome,
      })),
      ordensServico: ordensServico.map((os) => ({
        id: os.id,
        numero: os.numeroOS,
        numeroOS: os.numeroOS,
        clienteId: os.cliente_id,
        veiculoId: os.veiculo_id,
        clienteNome: os.cliente?.nome,
        veiculoDescricao: [os.veiculo?.marca, os.veiculo?.modelo, os.veiculo?.placa].filter(Boolean).join(' ') || os.modeloVeiculo,
        status: os.status,
      })),
      usuarios: usuarios.map((usuario) => ({
        id: usuario.id,
        nome: usuario.nome,
        cargo: usuario.cargo,
        email: usuario.email,
      })),
    };
  }
}
