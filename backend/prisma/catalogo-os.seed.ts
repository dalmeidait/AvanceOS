import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Role, TipoMovimentacao } from '../src/domain/enums';
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

type ServicoSeed = {
  codigo: string;
  categoria: string;
  nome: string;
  valor: number;
  descricao?: string;
  tempoEstimadoMinutos?: number;
};

type ProdutoSeed = {
  sku: string;
  categoria: string;
  nome: string;
  precoVenda: number;
  tipo?: string;
  unidade?: string;
  estoqueInicial?: number;
  estoqueMinimo?: number;
  podeVenderPdv?: boolean;
  podeVincularOs?: boolean;
  descricao?: string;
};

const servicos: ServicoSeed[] = [
  { codigo: 'DIA-001', categoria: 'Diagnostico e inspecao', nome: 'Diagnostico inicial simples', valor: 80 },
  { codigo: 'DIA-002', categoria: 'Diagnostico e inspecao', nome: 'Diagnostico tecnico completo', valor: 180 },
  { codigo: 'DIA-003', categoria: 'Diagnostico e inspecao', nome: 'Scanner automotivo basico', valor: 120 },
  { codigo: 'DIA-004', categoria: 'Diagnostico e inspecao', nome: 'Scanner automotivo avancado', valor: 220 },
  { codigo: 'DIA-006', categoria: 'Diagnostico e inspecao', nome: 'Inspecao pre-compra', valor: 280 },
  { codigo: 'REV-001', categoria: 'Revisoes', nome: 'Revisao basica', valor: 180 },
  { codigo: 'REV-002', categoria: 'Revisoes', nome: 'Revisao intermediaria', valor: 320 },
  { codigo: 'REV-003', categoria: 'Revisoes', nome: 'Revisao completa', valor: 520 },
  { codigo: 'REV-004', categoria: 'Revisoes', nome: 'Revisao para viagem', valor: 250 },
  { codigo: 'LUB-001', categoria: 'Oleo, filtros e lubrificacao', nome: 'Troca de oleo do motor', valor: 70 },
  { codigo: 'LUB-002', categoria: 'Oleo, filtros e lubrificacao', nome: 'Troca de oleo e filtro de oleo', valor: 90 },
  { codigo: 'LUB-009', categoria: 'Oleo, filtros e lubrificacao', nome: 'Troca de fluido de freio', valor: 160 },
  { codigo: 'FRE-001', categoria: 'Freios', nome: 'Inspecao do sistema de freio', valor: 90 },
  { codigo: 'FRE-002', categoria: 'Freios', nome: 'Troca de pastilhas dianteiras', valor: 160 },
  { codigo: 'FRE-003', categoria: 'Freios', nome: 'Troca de pastilhas traseiras', valor: 180 },
  { codigo: 'FRE-012', categoria: 'Freios', nome: 'Revisao completa de freios', valor: 350 },
  { codigo: 'SUS-001', categoria: 'Suspensao', nome: 'Diagnostico de suspensao', valor: 120 },
  { codigo: 'SUS-002', categoria: 'Suspensao', nome: 'Troca de amortecedor dianteiro', valor: 320 },
  { codigo: 'SUS-003', categoria: 'Suspensao', nome: 'Troca de amortecedor traseiro', valor: 280 },
  { codigo: 'SUS-012', categoria: 'Suspensao', nome: 'Revisao completa da suspensao', valor: 280 },
  { codigo: 'DIR-001', categoria: 'Direcao, alinhamento e geometria', nome: 'Alinhamento dianteiro', valor: 120 },
  { codigo: 'DIR-004', categoria: 'Direcao, alinhamento e geometria', nome: 'Alinhamento e balanceamento', valor: 220 },
  { codigo: 'PNE-001', categoria: 'Pneus e rodas', nome: 'Rodizio de pneus', valor: 80 },
  { codigo: 'PNE-008', categoria: 'Pneus e rodas', nome: 'Montagem de jogo de pneus', valor: 180 },
  { codigo: 'MOT-001', categoria: 'Motor', nome: 'Diagnostico de motor', valor: 180 },
  { codigo: 'MOT-009', categoria: 'Motor', nome: 'Troca de correia dentada', valor: 550 },
  { codigo: 'MOT-020', categoria: 'Motor', nome: 'Servico completo de motor', valor: 4500 },
  { codigo: 'ARF-001', categoria: 'Arrefecimento', nome: 'Diagnostico de arrefecimento', valor: 120 },
  { codigo: 'ARF-007', categoria: 'Arrefecimento', nome: "Troca de bomba d'agua", valor: 450 },
  { codigo: 'CAM-003', categoria: 'Cambio, embreagem e transmissao', nome: 'Troca de kit embreagem', valor: 850 },
  { codigo: 'CAM-010', categoria: 'Cambio, embreagem e transmissao', nome: 'Remocao e instalacao de cambio', valor: 1200 },
  { codigo: 'ELE-001', categoria: 'Sistema eletrico', nome: 'Diagnostico eletrico basico', valor: 120 },
  { codigo: 'ELE-014', categoria: 'Sistema eletrico', nome: 'Instalacao de camera de re', valor: 280 },
  { codigo: 'ARC-001', categoria: 'Ar-condicionado', nome: 'Diagnostico de ar-condicionado', valor: 150 },
  { codigo: 'ARC-004', categoria: 'Ar-condicionado', nome: 'Carga de gas do ar-condicionado', valor: 280 },
  { codigo: 'ESC-001', categoria: 'Escapamento e emissoes', nome: 'Diagnostico de escapamento', valor: 90 },
  { codigo: 'INJ-001', categoria: 'Injecao eletronica', nome: 'Diagnostico de injecao eletronica', valor: 220 },
  { codigo: 'CAR-001', categoria: 'Carroceria e acabamento', nome: 'Troca de palheta do limpador', valor: 30 },
  { codigo: 'EST-003', categoria: 'Estetica leve', nome: 'Higienizacao interna', valor: 280 },
  { codigo: 'PAC-001', categoria: 'Pacotes', nome: 'Check-up Avance Basico', valor: 149.9 },
  { codigo: 'PAC-004', categoria: 'Pacotes', nome: 'Revisao Avance Completa', valor: 599.9 },
];

const produtos: ProdutoSeed[] = [
  { sku: 'OLE-001', categoria: 'Oleos', nome: 'Oleo motor 5W30 sintetico 1L', precoVenda: 49.9 },
  { sku: 'OLE-002', categoria: 'Oleos', nome: 'Oleo motor 5W40 sintetico 1L', precoVenda: 54.9 },
  { sku: 'OLE-008', categoria: 'Oleos', nome: 'Fluido ATF cambio automatico 1L', precoVenda: 79.9 },
  { sku: 'FIL-001', categoria: 'Filtros', nome: 'Filtro de oleo motor compacto', precoVenda: 34.9 },
  { sku: 'FIL-004', categoria: 'Filtros', nome: 'Filtro de ar motor compacto', precoVenda: 49.9 },
  { sku: 'FIL-010', categoria: 'Filtros', nome: 'Kit revisao oleo + ar + cabine', precoVenda: 149.9 },
  { sku: 'FRE-P001', categoria: 'Freios', nome: 'Pastilha de freio dianteira compacta', precoVenda: 149.9 },
  { sku: 'FRE-P004', categoria: 'Freios', nome: 'Disco de freio dianteiro compacto', precoVenda: 319.9 },
  { sku: 'FRE-P013', categoria: 'Freios', nome: 'Fluido de freio DOT 4 500ml', precoVenda: 44.9 },
  { sku: 'SUS-P001', categoria: 'Suspensao', nome: 'Amortecedor dianteiro compacto', precoVenda: 549.9 },
  { sku: 'SUS-P008', categoria: 'Suspensao', nome: 'Bieleta dianteira', precoVenda: 89.9 },
  { sku: 'SUS-P012', categoria: 'Suspensao', nome: 'Bandeja de suspensao', precoVenda: 319.9 },
  { sku: 'MOT-P001', categoria: 'Motor e injecao', nome: 'Vela de ignicao comum', precoVenda: 119.9 },
  { sku: 'MOT-P004', categoria: 'Motor e injecao', nome: 'Bobina de ignicao', precoVenda: 249.9 },
  { sku: 'MOT-P014', categoria: 'Motor e injecao', nome: 'Kit correia dentada', precoVenda: 499.9 },
  { sku: 'ARF-P001', categoria: 'Arrefecimento', nome: 'Aditivo radiador concentrado 1L', precoVenda: 49.9, tipo: 'INSUMO' },
  { sku: 'ARF-P008', categoria: 'Arrefecimento', nome: "Bomba d'agua", precoVenda: 319.9 },
  { sku: 'CAM-P001', categoria: 'Cambio e transmissao', nome: 'Kit embreagem compacto', precoVenda: 749.9 },
  { sku: 'CAM-P007', categoria: 'Cambio e transmissao', nome: 'Junta homocinetica', precoVenda: 249.9 },
  { sku: 'ELE-P001', categoria: 'Eletrica', nome: 'Bateria 45Ah', precoVenda: 449.9 },
  { sku: 'ELE-P017', categoria: 'Eletrica', nome: 'Lampada farol H4', precoVenda: 39.9 },
  { sku: 'ARC-P001', categoria: 'Ar-condicionado', nome: 'Filtro de cabine simples', precoVenda: 54.9 },
  { sku: 'ARC-P006', categoria: 'Ar-condicionado', nome: 'Compressor de ar-condicionado', precoVenda: 1399.9 },
  { sku: 'ESC-P001', categoria: 'Escapamento', nome: 'Coxim de escapamento', precoVenda: 19.9 },
  { sku: 'PNE-P001', categoria: 'Pneus e rodas', nome: 'Pneu aro 13 popular', precoVenda: 299.9 },
  { sku: 'PNE-P006', categoria: 'Pneus e rodas', nome: 'Valvula de pneu', precoVenda: 19.9 },
  { sku: 'QUI-003', categoria: 'Quimicos e estetica', nome: 'Limpa freio spray', precoVenda: 44.9, tipo: 'INSUMO' },
  { sku: 'QUI-007', categoria: 'Quimicos e estetica', nome: 'Graxa branca spray', precoVenda: 44.9, tipo: 'INSUMO' },
  { sku: 'MIU-001', categoria: 'Miudezas', nome: 'Parafuso sextavado sortido', precoVenda: 2, tipo: 'INSUMO', unidade: 'UN' },
  { sku: 'MIU-011', categoria: 'Miudezas', nome: 'Fita isolante automotiva', precoVenda: 14.9, tipo: 'INSUMO' },
  { sku: 'PDV-001', categoria: 'PDV', nome: 'Aditivo combustivel flex', precoVenda: 29.9, tipo: 'PRODUTO' },
  { sku: 'PDV-014', categoria: 'PDV', nome: 'Flanela microfibra', precoVenda: 12.9, tipo: 'PRODUTO' },
  { sku: 'INT-001', categoria: 'Consumo interno', nome: 'Luva nitrilica caixa', precoVenda: 0, tipo: 'CONSUMO_INTERNO', podeVenderPdv: false, podeVincularOs: false },
  { sku: 'INT-005', categoria: 'Consumo interno', nome: 'Pano de limpeza industrial', precoVenda: 0, tipo: 'CONSUMO_INTERNO', podeVenderPdv: false, podeVincularOs: false },
];

async function ensureSeedUser() {
  const senhaInicial = process.env.DEV_ADMIN_PASSWORD;
  if (!senhaInicial) {
    throw new Error('DEV_ADMIN_PASSWORD deve ser definido para criar admin em producao.');
  }
  const senhaHash = await bcrypt.hash(senhaInicial, 10);
  return prisma.usuario.upsert({
    where: { email: 'admin@oficinaavance.com.br' },
    update: {},
    create: {
      nome: 'Administrador do Sistema',
      email: 'admin@oficinaavance.com.br',
      senhaHash,
      cargo: Role.ADMINISTRADOR,
    },
  });
}

async function seedServicos() {
  for (const servico of servicos) {
    await prisma.servico.upsert({
      where: { codigo: servico.codigo },
      update: {
        nome: servico.nome,
        descricao: servico.descricao ?? `Servico de ${servico.categoria.toLowerCase()} da Oficina Avance.`,
        categoria: servico.categoria,
        valor: servico.valor,
        tempoEstimadoMinutos: servico.tempoEstimadoMinutos ?? null,
        status: 'ATIVO',
      },
      create: {
        codigo: servico.codigo,
        nome: servico.nome,
        descricao: servico.descricao ?? `Servico de ${servico.categoria.toLowerCase()} da Oficina Avance.`,
        categoria: servico.categoria,
        valor: servico.valor,
        tempoEstimadoMinutos: servico.tempoEstimadoMinutos ?? null,
        status: 'ATIVO',
      },
    });
  }
}

async function seedProdutos(usuarioId: string) {
  for (const produto of produtos) {
    const estoqueInicial = produto.estoqueInicial ?? 12;
    const precoCusto = Number((produto.precoVenda * 0.62).toFixed(2));
    const saved = await prisma.produto.upsert({
      where: { sku: produto.sku },
      update: {
        nome: produto.nome,
        descricao: produto.descricao ?? `${produto.nome} para uso operacional da Oficina Avance.`,
        marca: 'Avance',
        categoria: produto.categoria,
        tipo: produto.tipo ?? 'PECA',
        unidade: produto.unidade ?? 'UN',
        veiculosCompativeis: 'Universal',
        localizacaoFisica: 'A definir',
        fornecedor: 'Fornecedor padrao',
        aplicacao: 'Aplicacao geral',
        status: 'ATIVO',
        controlaEstoque: true,
        podeVenderPdv: produto.podeVenderPdv ?? produto.tipo !== 'CONSUMO_INTERNO',
        podeVincularOs: produto.podeVincularOs ?? produto.tipo !== 'CONSUMO_INTERNO',
        estoqueMinimo: produto.estoqueMinimo ?? 5,
        precoCusto,
        precoVenda: produto.precoVenda,
      },
      create: {
        sku: produto.sku,
        nome: produto.nome,
        descricao: produto.descricao ?? `${produto.nome} para uso operacional da Oficina Avance.`,
        marca: 'Avance',
        categoria: produto.categoria,
        tipo: produto.tipo ?? 'PECA',
        unidade: produto.unidade ?? 'UN',
        veiculosCompativeis: 'Universal',
        localizacaoFisica: 'A definir',
        fornecedor: 'Fornecedor padrao',
        aplicacao: 'Aplicacao geral',
        status: 'ATIVO',
        controlaEstoque: true,
        podeVenderPdv: produto.podeVenderPdv ?? produto.tipo !== 'CONSUMO_INTERNO',
        podeVincularOs: produto.podeVincularOs ?? produto.tipo !== 'CONSUMO_INTERNO',
        estoqueMinimo: produto.estoqueMinimo ?? 5,
        precoCusto,
        precoVenda: produto.precoVenda,
      },
    });

    const entradaSeed = await prisma.movimentacaoEstoque.findFirst({
      where: {
        produtoId: saved.id,
        tipo: TipoMovimentacao.ENTRADA,
        justificativa: 'Estoque inicial do catalogo operacional',
      },
    });

    if (!entradaSeed && estoqueInicial > 0) {
      await prisma.movimentacaoEstoque.create({
        data: {
          produtoId: saved.id,
          tipo: TipoMovimentacao.ENTRADA,
          quantidade: estoqueInicial,
          justificativa: 'Estoque inicial do catalogo operacional',
          usuarioId,
          custoUnitario: precoCusto,
        },
      });
    }
  }
}

async function main() {
  const usuario = await ensureSeedUser();
  await seedServicos();
  await seedProdutos(usuario.id);
  console.log(`Catalogo operacional atualizado: ${servicos.length} servicos e ${produtos.length} produtos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
