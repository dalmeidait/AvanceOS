import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Injectable()
export class FornecedoresService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    if (data.cnpj) {
      const existente = await this.prisma.fornecedor.findUnique({
        where: { cnpj: data.cnpj },
      });
      if (existente) {
        throw new HttpException('Fornecedor com este CNPJ/CPF já existe', HttpStatus.CONFLICT);
      }
    }

    try {
      const fornecedor = await this.prisma.fornecedor.create({
        data: {
          cnpj: data.cnpj || `SEM-CNPJ-${Date.now()}`, // Temporary fallback if empty since it's unique
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia,
          tipoPessoa: data.tipoPessoa || 'PJ',
          inscricaoEstadual: data.inscricaoEstadual || null,
          inscricaoMunicipal: data.inscricaoMunicipal || null,
          categoriaFornecedor: data.categoriaFornecedor || null,
          tipoFornecimento: data.tipoFornecimento || null,
          nomeContatoPrincipal: data.nomeContatoPrincipal || null,
          telefone: data.telefone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          emailFinanceiro: data.emailFinanceiro || null,
          site: data.site || null,
          cep: data.cep || null,
          logradouro: data.logradouro || null,
          numero: data.numero || null,
          complemento: data.complemento || null,
          bairro: data.bairro || null,
          cidade: data.cidade || null,
          estado: data.estado || null,
          pais: data.pais || 'Brasil',
          prazoEntregaMedioDias: data.prazoEntregaMedioDias ? parseInt(data.prazoEntregaMedioDias, 10) : null,
          condicaoPagamento: data.condicaoPagamento || null,
          limiteCredito: data.limiteCredito ? parseFloat(data.limiteCredito) : null,
          fornecePecas: Boolean(data.fornecePecas),
          forneceServicos: Boolean(data.forneceServicos),
          forneceFerramentas: Boolean(data.forneceFerramentas),
          forneceInsumos: Boolean(data.forneceInsumos),
          forneceTecnologia: Boolean(data.forneceTecnologia),
          aceitaPedidoUrgente: Boolean(data.aceitaPedidoUrgente),
          avaliacao: data.avaliacao ? parseInt(data.avaliacao, 10) : null,
          observacoesComerciais: data.observacoesComerciais || null,
          observacoesInternas: data.observacoesInternas || null,
          status: data.status || 'ATIVO',
          ativo: data.ativo !== undefined ? data.ativo : true,
        },
      });
      return fornecedor;
    } catch (error) {
      console.error('Erro ao inserir fornecedor:', error);
      throw new HttpException('Erro interno do servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findAll() {
    return this.prisma.fornecedor.findMany({
      orderBy: { nomeFantasia: 'asc' },
    });
  }

  async findOne(id: string) {
    const fornecedor = await this.prisma.fornecedor.findUnique({
      where: { id },
    });
    if (!fornecedor) {
      throw new HttpException('Fornecedor não encontrado', HttpStatus.NOT_FOUND);
    }
    return fornecedor;
  }

  async update(id: string, data: any) {
    const atual = await this.prisma.fornecedor.findUnique({ where: { id } });
    if (!atual) {
      throw new HttpException('Fornecedor não encontrado', HttpStatus.NOT_FOUND);
    }

    if (data.cnpj && data.cnpj !== atual.cnpj) {
      const existente = await this.prisma.fornecedor.findUnique({
        where: { cnpj: data.cnpj },
      });
      if (existente) {
        throw new HttpException('Outro fornecedor com este CNPJ/CPF já existe', HttpStatus.CONFLICT);
      }
    }

    try {
      const atualizado = await this.prisma.fornecedor.update({
        where: { id },
        data: {
          cnpj: data.cnpj !== undefined ? data.cnpj : atual.cnpj,
          razaoSocial: data.razaoSocial !== undefined ? data.razaoSocial : atual.razaoSocial,
          nomeFantasia: data.nomeFantasia !== undefined ? data.nomeFantasia : atual.nomeFantasia,
          tipoPessoa: data.tipoPessoa !== undefined ? data.tipoPessoa : atual.tipoPessoa,
          inscricaoEstadual: data.inscricaoEstadual !== undefined ? data.inscricaoEstadual : atual.inscricaoEstadual,
          inscricaoMunicipal: data.inscricaoMunicipal !== undefined ? data.inscricaoMunicipal : atual.inscricaoMunicipal,
          categoriaFornecedor: data.categoriaFornecedor !== undefined ? data.categoriaFornecedor : atual.categoriaFornecedor,
          tipoFornecimento: data.tipoFornecimento !== undefined ? data.tipoFornecimento : atual.tipoFornecimento,
          nomeContatoPrincipal: data.nomeContatoPrincipal !== undefined ? data.nomeContatoPrincipal : atual.nomeContatoPrincipal,
          telefone: data.telefone !== undefined ? data.telefone : atual.telefone,
          whatsapp: data.whatsapp !== undefined ? data.whatsapp : atual.whatsapp,
          email: data.email !== undefined ? data.email : atual.email,
          emailFinanceiro: data.emailFinanceiro !== undefined ? data.emailFinanceiro : atual.emailFinanceiro,
          site: data.site !== undefined ? data.site : atual.site,
          cep: data.cep !== undefined ? data.cep : atual.cep,
          logradouro: data.logradouro !== undefined ? data.logradouro : atual.logradouro,
          numero: data.numero !== undefined ? data.numero : atual.numero,
          complemento: data.complemento !== undefined ? data.complemento : atual.complemento,
          bairro: data.bairro !== undefined ? data.bairro : atual.bairro,
          cidade: data.cidade !== undefined ? data.cidade : atual.cidade,
          estado: data.estado !== undefined ? data.estado : atual.estado,
          pais: data.pais !== undefined ? data.pais : atual.pais,
          prazoEntregaMedioDias: data.prazoEntregaMedioDias !== undefined ? (data.prazoEntregaMedioDias ? parseInt(data.prazoEntregaMedioDias, 10) : null) : atual.prazoEntregaMedioDias,
          condicaoPagamento: data.condicaoPagamento !== undefined ? data.condicaoPagamento : atual.condicaoPagamento,
          limiteCredito: data.limiteCredito !== undefined ? (data.limiteCredito ? parseFloat(data.limiteCredito) : null) : atual.limiteCredito,
          fornecePecas: data.fornecePecas !== undefined ? Boolean(data.fornecePecas) : atual.fornecePecas,
          forneceServicos: data.forneceServicos !== undefined ? Boolean(data.forneceServicos) : atual.forneceServicos,
          forneceFerramentas: data.forneceFerramentas !== undefined ? Boolean(data.forneceFerramentas) : atual.forneceFerramentas,
          forneceInsumos: data.forneceInsumos !== undefined ? Boolean(data.forneceInsumos) : atual.forneceInsumos,
          forneceTecnologia: data.forneceTecnologia !== undefined ? Boolean(data.forneceTecnologia) : atual.forneceTecnologia,
          aceitaPedidoUrgente: data.aceitaPedidoUrgente !== undefined ? Boolean(data.aceitaPedidoUrgente) : atual.aceitaPedidoUrgente,
          avaliacao: data.avaliacao !== undefined ? (data.avaliacao ? parseInt(data.avaliacao, 10) : null) : atual.avaliacao,
          observacoesComerciais: data.observacoesComerciais !== undefined ? data.observacoesComerciais : atual.observacoesComerciais,
          observacoesInternas: data.observacoesInternas !== undefined ? data.observacoesInternas : atual.observacoesInternas,
          status: data.status !== undefined ? data.status : atual.status,
          ativo: data.ativo !== undefined ? data.ativo : atual.ativo,
        },
      });
      return atualizado;
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      throw new HttpException('Erro interno do servidor', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateStatus(id: string, data: { status: string; ativo: boolean }) {
    return this.prisma.fornecedor.update({
      where: { id },
      data: {
        status: data.status,
        ativo: data.ativo,
      },
    });
  }

  async remove(id: string) {
    // Implement soft delete or throw error if not allowed
    // Here we will use soft delete
    return this.prisma.fornecedor.update({
      where: { id },
      data: {
        status: 'INATIVO',
        ativo: false,
      },
    });
  }
}
