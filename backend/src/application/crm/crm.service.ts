import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);
  constructor(private prisma: PrismaService) {}

  async receberNps(ordemServicoId: string, nota: number, comentario?: string) {
      const os = await this.prisma.ordemServico.findUnique({ 
          where: { id: ordemServicoId }, 
          include: { cliente: true } 
      });
      if (!os) throw new NotFoundException('OS não encontrada para avaliação NPS');

      const nps = await this.prisma.pesquisaNPS.create({
          data: { ordemServicoId, nota, comentario }
      });

      if (nota < 7) {
         // Requisito 12.2: Alerta para o Gerente
         this.logger.warn(`[CRISE NPS] O cliente ${os.cliente.nome} (Tel: ${os.cliente.telefone}) atribuiu nota ${nota}. Motivo: ${comentario || 'Não informado'}. AÇÃO GERENCIAL IMEDIATA REQUERIDA!`);
      }

      return nps;
  }

  // Requisito 12.2: Disparo de NPS 24h após faturamento
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async enviarPesquisaNPS() {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      
      const ossOntem = await this.prisma.ordemServico.findMany({
          where: {
              status: { in: ['CONCLUIDO', 'CONCLUIDA', 'PAGO'] },
              atualizadoEm: { gte: ontem },
              pesquisaNps: null,
              cliente: { aceitaMarketing: true }
          },
          include: { cliente: true }
      });

      for (const os of ossOntem) {
          this.logger.log(`[WHATSAPP AUTOMÁTICO - NPS] "Olá ${os.cliente.nome}! Satisfeito com o nosso serviço de ontem? Avalie-nos de 0 a 10 acessando: https://avanceos.app/nps/${os.id}"`);
      }
  }

  // Requisito 17.1 / 12.1: Rotina CRON para vida útil de peças (10.000km ou 6 meses)
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async alertarManutencaoPreventiva() {
      // Simulação: Procurando O.S confirmadas há mais de 6 meses
      const dataCorte = new Date();
      dataCorte.setMonth(dataCorte.getMonth() - 6); 

      // Busca na DB OS concluídas, cujo cliente aceita marketing e não faz revisão há mais de 6 meses
      const clientesAvoos = await this.prisma.cliente.findMany({
          where: {
              aceitaMarketing: true,
              OR: [
                  { ultimaRevisao: null },
                  { ultimaRevisao: { lt: dataCorte } }
              ],
              ordens_servico: { some: { status: { in: ['CONCLUIDO', 'CONCLUIDA'] }, atualizadoEm: { lt: dataCorte } } }
          }
      });

      for (const cliente of clientesAvoos) {
          // Push to BullMQ or Simulate WhatsApp API Gateway integration
          this.logger.log(`[WHATSAPP DISPATCH] Mensagem disparada para ${cliente.nome} (${cliente.telefone}): "Olá, notámos que o seu veículo está a aproximar-se da margem de 10.000km ou o prazo médio de vida útil expirou. Vamos agendar uma revisão preventiva na Oficina Avance?"`);
      }
  }

  // --- CRM / Relacionamento ---

  async criarInteracao(data: any, usuarioId?: string) {
    return this.prisma.clienteInteracao.create({
      data: {
        ...data,
        responsavelId: usuarioId,
      },
    });
  }

  async getInteracoes(filtros?: any) {
    const { status, tipo, clienteId, responsavelId } = filtros || {};
    
    const where: any = {};
    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (clienteId) where.clienteId = clienteId;
    if (responsavelId) where.responsavelId = responsavelId;

    return this.prisma.clienteInteracao.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        veiculo: { select: { id: true, placa: true, modelo: true } },
        responsavel: { select: { id: true, nome: true } },
        ordemServico: { select: { id: true, numeroOS: true, status: true } },
      },
      orderBy: [
        { prioridade: 'desc' },
        { dataPrevista: 'asc' },
        { criadoEm: 'desc' },
      ],
    });
  }

  async getInteracaoById(id: string) {
    const interacao = await this.prisma.clienteInteracao.findUnique({
      where: { id },
      include: {
        cliente: true,
        veiculo: true,
        ordemServico: true,
        orcamento: true,
        responsavel: { select: { id: true, nome: true } },
      },
    });
    if (!interacao) throw new NotFoundException('Interação não encontrada');
    return interacao;
  }

  async atualizarInteracao(id: string, data: any) {
    return this.prisma.clienteInteracao.update({
      where: { id },
      data,
    });
  }

  async registrarContato(id: string, data: any) {
    const interacao = await this.getInteracaoById(id);

    let novoStatus = 'CONCLUIDO';
    if (data.resultado === 'SEM_RESPOSTA') novoStatus = 'PENDENTE';
    if (data.resultado === 'AGUARDANDO_RETORNO') novoStatus = 'AGUARDANDO_RETORNO';
    if (data.agendarRetorno) novoStatus = 'PENDENTE'; // Se reagendou, fica pendente

    const novaDescricao = interacao.descricao 
      ? `${interacao.descricao}\n\n[Contato: ${data.resultado}]: ${data.detalhes || ''}` 
      : `[Contato: ${data.resultado}]: ${data.detalhes || ''}`;

    return this.prisma.clienteInteracao.update({
      where: { id },
      data: {
        ...(data.canalUtilizado && { canal: data.canalUtilizado }),
        dataRealizada: new Date(),
        resultado: data.resultado,
        descricao: novaDescricao,
        ...(data.agendarRetorno && data.dataRetorno && { dataPrevista: new Date(data.dataRetorno) }),
        status: novoStatus,
      },
    });
  }

  async getDashboardMetrics() {
    const pendentes = await this.prisma.clienteInteracao.count({
      where: { status: 'PENDENTE' },
    });
    
    const posVendas = await this.prisma.clienteInteracao.count({
      where: { status: 'PENDENTE', tipo: 'POS_VENDA' },
    });
    
    const orcamentos = await this.prisma.clienteInteracao.count({
      where: { status: 'PENDENTE', tipo: 'ORCAMENTO_PENDENTE' },
    });
    
    const reclamacoes = await this.prisma.clienteInteracao.count({
      where: { status: 'PENDENTE', tipo: 'RECLAMACAO' },
    });

    return {
      pendentes,
      posVendas,
      orcamentos,
      reclamacoes,
    };
  }

  async getOrcamentosPendentes() {
    return this.prisma.orcamento.findMany({
      where: {
        status: { in: ['EMITIDO', 'ENVIADO', 'AGUARDANDO_APROVACAO'] },
      },
      include: {
        ordemServico: {
          include: {
            cliente: { select: { id: true, nome: true, telefone: true } },
            veiculo: { select: { id: true, placa: true, modelo: true } },
          }
        }
      },
      orderBy: { criadoEm: 'desc' },
    });
  }
}
