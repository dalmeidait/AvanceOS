import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { auditStorage } from '../audit/audit.storage';
import * as crypto from 'crypto';

@Injectable()
export class ClientesService {
  constructor(private prisma: PrismaService) {}

  private limparTexto(value: any) {
    return typeof value === 'string' ? value.trim() : value;
  }

  private somenteDigitos(value: string) {
    return value.replace(/\D/g, '');
  }

  private pareceMascarado(value: string) {
    return value.includes('*');
  }

  private validarDocumentoCompleto(value: string) {
    const digits = this.somenteDigitos(value);
    if (![11, 14].includes(digits.length)) {
      throw new HttpException('CPF/CNPJ deve estar completo.', HttpStatus.BAD_REQUEST);
    }
  }

  private validarTelefoneCompleto(value: string) {
    const digits = this.somenteDigitos(value);
    if (digits.length < 10 || digits.length > 11) {
      throw new HttpException('Telefone deve estar completo.', HttpStatus.BAD_REQUEST);
    }
  }

  private documentoFromPayload(data: any) {
    return this.limparTexto(data.cpf || data.documento || data.cpf_cnpj);
  }

  async create(data: any) {
    const cpfCnpj = this.documentoFromPayload(data);
    if (!cpfCnpj) {
      throw new HttpException('CPF/CNPJ obrigatorio.', HttpStatus.BAD_REQUEST);
    }
    if (this.pareceMascarado(cpfCnpj)) {
      throw new HttpException('CPF/CNPJ deve estar completo.', HttpStatus.BAD_REQUEST);
    }
    this.validarDocumentoCompleto(cpfCnpj);

    const telefone = this.limparTexto(data.telefone || '');
    if (telefone) this.validarTelefoneCompleto(telefone);

    const orConditions: any[] = [{ cpf_cnpj: cpfCnpj }];
    if (data.email && data.email.trim() !== '') {
      orConditions.push({ email: data.email });
    }

    const existente = await this.prisma.cliente.findFirst({ where: { OR: orConditions } });
    if (existente) {
      throw new HttpException('Duplicidade', HttpStatus.CONFLICT);
    }

    try {
      const cliente = await this.prisma.cliente.create({
        data: {
          nome: data.nome,
          cpf_cnpj: cpfCnpj,
          telefone: telefone || null,
          email: data.email && data.email.trim() !== '' ? data.email : null,
          cep: data.cep || null,
          bairro: data.bairro || null,
          rua: data.rua || null,
          numero: data.numero || null,
          complemento: data.complemento || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
        },
      });
      return this.mapToFlutter(cliente);
    } catch (error) {
      console.error('Erro ao inserir cliente:', error);
      throw new HttpException('Erro interno do servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll() {
    const clientes = await this.prisma.cliente.findMany({
      include: { _count: { select: { veiculos: true } } },
    });
    return clientes.map((cliente) => this.mapToFlutter(cliente));
  }

  async findOne(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: { select: { veiculos: true } },
        veiculos: { orderBy: { criado_em: 'desc' } },
      },
    });
    return cliente ? this.mapToFlutter(cliente) : null;
  }

  async findOneLimpo(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        _count: { select: { veiculos: true } },
        veiculos: { orderBy: { criado_em: 'desc' } },
      },
    });

    const store = auditStorage.getStore();
    if (store?.userId && cliente) {
      await this.prisma.logAuditoria.create({
        data: {
          usuarioId: store.userId,
          acao: 'READ_SENSITIVE',
          entidadeAfetada: 'Cliente',
          entidadeId: id,
          valoresNovos: JSON.stringify(cliente).substring(0, 900),
          nivelVisibilidade: 'AVANCADO',
        },
      });
    }

    return cliente ? this.mapToFlutter(cliente) : null;
  }

  async findVeiculos(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: { _count: { select: { veiculos: true } } },
    });
    if (!cliente) {
      throw new HttpException('Cliente não encontrado.', HttpStatus.NOT_FOUND);
    }

    const veiculos = await this.prisma.veiculo.findMany({
      where: { cliente_id: id },
      include: {
        cliente: { include: { _count: { select: { veiculos: true } } } },
      },
      orderBy: { criado_em: 'desc' },
    });

    return veiculos.map((veiculo) => ({
      ...veiculo,
      cliente: this.mapToFlutter(veiculo.cliente),
      clienteId: veiculo.cliente_id,
      cliente_nome: veiculo.cliente?.nome || 'Desconhecido',
    }));
  }

  async findInteracoes(id: string) {
    return this.prisma.clienteInteracao.findMany({
      where: { clienteId: id },
      orderBy: { criadoEm: 'desc' },
      include: {
        responsavel: { select: { id: true, nome: true } },
        veiculo: { select: { id: true, placa: true, modelo: true } },
        ordemServico: { select: { id: true, numeroOS: true, status: true } },
        orcamento: { select: { id: true, status: true, total: true } },
      }
    });
  }

  async update(id: string, data: any) {
    const atual = await this.prisma.cliente.findUnique({ where: { id } });
    if (!atual) {
      throw new HttpException('Cliente não encontrado.', HttpStatus.NOT_FOUND);
    }

    const cpfCnpjRecebido = this.documentoFromPayload(data);
    const cpfCnpj =
      cpfCnpjRecebido && !this.pareceMascarado(cpfCnpjRecebido) ? cpfCnpjRecebido : undefined;
    if (cpfCnpj) this.validarDocumentoCompleto(cpfCnpj);

    const telefoneRecebido = Object.prototype.hasOwnProperty.call(data, 'telefone')
      ? this.limparTexto(data.telefone || '')
      : undefined;
    const telefone =
      typeof telefoneRecebido === 'string' && !this.pareceMascarado(telefoneRecebido)
        ? telefoneRecebido
        : undefined;
    if (telefone) this.validarTelefoneCompleto(telefone);

    const atualizado = await this.prisma.cliente.update({
      where: { id },
      data: {
        nome: data.nome ?? atual.nome,
        ...(cpfCnpj && { cpf_cnpj: cpfCnpj }),
        ...(telefone !== undefined && { telefone: telefone || null }),
        ...(Object.prototype.hasOwnProperty.call(data, 'email') && {
          email: data.email && data.email.trim() !== '' ? data.email : null,
        }),
        ...(Object.prototype.hasOwnProperty.call(data, 'cep') && { cep: data.cep || null }),
        ...(Object.prototype.hasOwnProperty.call(data, 'bairro') && { bairro: data.bairro || null }),
        ...(Object.prototype.hasOwnProperty.call(data, 'rua') && { rua: data.rua || null }),
        ...(Object.prototype.hasOwnProperty.call(data, 'numero') && { numero: data.numero || null }),
        ...(Object.prototype.hasOwnProperty.call(data, 'complemento') && { complemento: data.complemento || null }),
        ...(Object.prototype.hasOwnProperty.call(data, 'cidade') && { cidade: data.cidade || null }),
        ...(Object.prototype.hasOwnProperty.call(data, 'estado') && { estado: data.estado || null }),
      },
    });
    return this.mapToFlutter(atualizado);
  }

  async anonimizar(id: string) {
    return this.prisma.cliente.update({
      where: { id },
      data: {
        nome: `ANONIMO-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        cpf_cnpj: `000.000.000-${id.substring(0, 2)}`,
        telefone: null,
        email: null,
        cep: null,
        bairro: null,
        rua: null,
        numero: null,
        complemento: null,
        cidade: null,
        estado: null,
        aceitaMarketing: false,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.cliente.delete({ where: { id } });
  }

  private tipoCliente(cliente: any) {
    const digits = String(cliente?.cpf_cnpj || '').replace(/\D/g, '');
    if (digits.length === 14) return 'Pessoa Juridica';
    if (digits.length === 11) return 'Pessoa Fisica';
    return null;
  }

  private mapToFlutter(cliente: any) {
    const totalVeiculos = Number(cliente?._count?.veiculos ?? cliente?.veiculos?.length ?? cliente?.totalVeiculos ?? 0);
    const possuiGrupoVeiculos = totalVeiculos > 1;
    const { _count, ...clienteLimpo } = cliente;

    return {
      ...clienteLimpo,
      cpf: cliente.cpf_cnpj,
      documento: cliente.cpf_cnpj,
      tipo: this.tipoCliente(cliente),
      tipoCliente: this.tipoCliente(cliente),
      totalVeiculos,
      possuiGrupoVeiculos,
      possuiFrota: possuiGrupoVeiculos,
      veiculos: Array.isArray(cliente.veiculos)
        ? cliente.veiculos.map((veiculo: any) => ({
            ...veiculo,
            clienteId: veiculo.cliente_id,
          }))
        : undefined,
    };
  }
}
