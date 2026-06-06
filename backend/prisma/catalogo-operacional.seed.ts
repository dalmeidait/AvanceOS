import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ProdutoSeed = {
  sku: string;
  nome: string;
  categoria: string;
  marca: string;
  unidade: string;
  quantityInStock: number;
  estoqueMinimo: number;
  precoCusto: number;
  precoVenda: number;
  descricao: string;
  notes: string;
};

type ServicoSeed = {
  codigo: string;
  nome: string;
  categoria: string;
  valor: number;
  tempoEstimadoMinutos: number;
  descricao: string;
  notes: string;
};

const produtos: ProdutoSeed[] = [
  {
    sku: 'PROD-VELA-NGK-001',
    nome: 'Vela de ignicao NGK',
    categoria: 'Ignicao',
    marca: 'NGK',
    unidade: 'unidade',
    quantityInStock: 12,
    estoqueMinimo: 4,
    precoCusto: 25,
    precoVenda: 45,
    descricao: 'Vela de ignicao para manutencao preventiva e correcoes de falha de combustao.',
    notes: 'Item comum em revisoes de ignicao. Conferir aplicacao por veiculo antes da instalacao.',
  },
  {
    sku: 'PROD-BOBINA-BOSCH-001',
    nome: 'Bobina de ignicao Bosch',
    categoria: 'Ignicao',
    marca: 'Bosch',
    unidade: 'unidade',
    quantityInStock: 4,
    estoqueMinimo: 2,
    precoCusto: 180,
    precoVenda: 280,
    descricao: 'Bobina de ignicao para reparos em falhas de centelha e perda de desempenho.',
    notes: 'Validar codigo da peca e compatibilidade eletrica antes da aplicacao.',
  },
  {
    sku: 'PROD-CABO-VELA-001',
    nome: 'Cabo de vela',
    categoria: 'Ignicao',
    marca: 'Aplic',
    unidade: 'jogo',
    quantityInStock: 5,
    estoqueMinimo: 2,
    precoCusto: 70,
    precoVenda: 120,
    descricao: 'Jogo de cabos de vela para manutencao do sistema de ignicao.',
    notes: 'Recomendado substituir em conjunto com velas quando houver desgaste aparente.',
  },
  {
    sku: 'PROD-BATERIA-MOURA-60AH',
    nome: 'Bateria Moura 60Ah',
    categoria: 'Eletrica',
    marca: 'Moura',
    unidade: 'unidade',
    quantityInStock: 3,
    estoqueMinimo: 1,
    precoCusto: 380,
    precoVenda: 550,
    descricao: 'Bateria automotiva 60Ah para reposicao em veiculos leves.',
    notes: 'Conferir polaridade, dimensoes e teste do sistema de carga antes da venda.',
  },
  {
    sku: 'PROD-TERMINAL-BATERIA-001',
    nome: 'Terminal de bateria',
    categoria: 'Eletrica',
    marca: 'Universal',
    unidade: 'par',
    quantityInStock: 10,
    estoqueMinimo: 4,
    precoCusto: 15,
    precoVenda: 35,
    descricao: 'Par de terminais para conexao de bateria automotiva.',
    notes: 'Usar em substituicoes por oxidacao, folga ou mau contato nos bornes.',
  },
  {
    sku: 'PROD-OLEO-5W30-001',
    nome: 'Oleo motor 5W30',
    categoria: 'Lubrificacao',
    marca: 'Lubrax',
    unidade: 'litro',
    quantityInStock: 24,
    estoqueMinimo: 8,
    precoCusto: 28,
    precoVenda: 45,
    descricao: 'Oleo 5W30 para troca de lubrificante em veiculos compativeis.',
    notes: 'Conferir especificacao do fabricante e volume aplicado por motor.',
  },
  {
    sku: 'PROD-FILTRO-OLEO-TECFIL-001',
    nome: 'Filtro de oleo Tecfil',
    categoria: 'Filtros',
    marca: 'Tecfil',
    unidade: 'unidade',
    quantityInStock: 15,
    estoqueMinimo: 5,
    precoCusto: 18,
    precoVenda: 35,
    descricao: 'Filtro de oleo para manutencao periodica do motor.',
    notes: 'Recomendar troca junto com o oleo do motor.',
  },
  {
    sku: 'PROD-FILTRO-AR-TECFIL-001',
    nome: 'Filtro de ar Tecfil',
    categoria: 'Filtros',
    marca: 'Tecfil',
    unidade: 'unidade',
    quantityInStock: 10,
    estoqueMinimo: 4,
    precoCusto: 25,
    precoVenda: 50,
    descricao: 'Filtro de ar do motor para manutencao preventiva.',
    notes: 'Inspecionar saturacao em revisoes e substituir quando necessario.',
  },
  {
    sku: 'PROD-FILTRO-CABINE-TECFIL-001',
    nome: 'Filtro de cabine Tecfil',
    categoria: 'Filtros',
    marca: 'Tecfil',
    unidade: 'unidade',
    quantityInStock: 8,
    estoqueMinimo: 3,
    precoCusto: 22,
    precoVenda: 45,
    descricao: 'Filtro de cabine para sistema de ventilacao e ar-condicionado.',
    notes: 'Recomendado em revisoes de conforto e higienizacao do ar-condicionado.',
  },
  {
    sku: 'PROD-PASTILHA-FREIO-DIANT-001',
    nome: 'Pastilha de freio dianteira',
    categoria: 'Freios',
    marca: 'Fras-le',
    unidade: 'jogo',
    quantityInStock: 6,
    estoqueMinimo: 2,
    precoCusto: 95,
    precoVenda: 180,
    descricao: 'Jogo de pastilhas dianteiras para reparo do sistema de freio.',
    notes: 'Conferir espessura de discos, ruido e assentamento apos instalacao.',
  },
  {
    sku: 'PROD-FLUIDO-FREIO-DOT4-001',
    nome: 'Fluido de freio DOT 4',
    categoria: 'Freios',
    marca: 'Varga',
    unidade: 'frasco',
    quantityInStock: 10,
    estoqueMinimo: 4,
    precoCusto: 18,
    precoVenda: 38,
    descricao: 'Fluido DOT 4 para manutencao e sangria do sistema de freio.',
    notes: 'Manter embalagem fechada e observar recomendacao do fabricante.',
  },
  {
    sku: 'PROD-PALHETA-PARABRISA-001',
    nome: 'Palheta limpador de para-brisa',
    categoria: 'Acessorios',
    marca: 'Bosch',
    unidade: 'par',
    quantityInStock: 7,
    estoqueMinimo: 3,
    precoCusto: 35,
    precoVenda: 75,
    descricao: 'Par de palhetas para substituicao do limpador de para-brisa.',
    notes: 'Conferir medida e encaixe do veiculo antes da instalacao.',
  },
  {
    sku: 'PROD-ADITIVO-RADIADOR-001',
    nome: 'Aditivo de radiador',
    categoria: 'Arrefecimento',
    marca: 'Radnaq',
    unidade: 'litro',
    quantityInStock: 12,
    estoqueMinimo: 4,
    precoCusto: 16,
    precoVenda: 32,
    descricao: 'Aditivo para manutencao do sistema de arrefecimento.',
    notes: 'Usar conforme proporcao recomendada e tipo do sistema.',
  },
  {
    sku: 'PROD-LAMPADA-H7-001',
    nome: 'Lampada automotiva H7',
    categoria: 'Iluminacao',
    marca: 'Osram',
    unidade: 'unidade',
    quantityInStock: 10,
    estoqueMinimo: 4,
    precoCusto: 22,
    precoVenda: 45,
    descricao: 'Lampada H7 para reposicao no sistema de iluminacao automotiva.',
    notes: 'Evitar contato direto no vidro da lampada durante a instalacao.',
  },
  {
    sku: 'PROD-BICO-INJETOR-001',
    nome: 'Bico injetor',
    categoria: 'Injecao',
    marca: 'Bosch',
    unidade: 'unidade',
    quantityInStock: 4,
    estoqueMinimo: 1,
    precoCusto: 210,
    precoVenda: 340,
    descricao: 'Bico injetor para reparos no sistema de injecao eletronica.',
    notes: 'Confirmar vazao e aplicacao antes da substituicao.',
  },
];

const servicos: ServicoSeed[] = [
  {
    codigo: 'SERV-DIAG-ELETRONICO-001',
    nome: 'Diagnostico eletronico',
    categoria: 'Diagnostico',
    valor: 120,
    tempoEstimadoMinutos: 60,
    descricao: 'Leitura e interpretacao de falhas eletronicas com scanner automotivo.',
    notes: 'Registrar codigos encontrados e recomendacoes tecnicas no atendimento.',
  },
  {
    codigo: 'SERV-IGNICAO-INSPECAO-001',
    nome: 'Inspecao do sistema de ignicao',
    categoria: 'Ignicao',
    valor: 90,
    tempoEstimadoMinutos: 45,
    descricao: 'Verificacao de velas, cabos, bobinas e condicoes gerais da ignicao.',
    notes: 'Indicado para falhas de partida, perda de potencia e funcionamento irregular.',
  },
  {
    codigo: 'SERV-TESTE-BATERIA-001',
    nome: 'Teste de bateria',
    categoria: 'Eletrica',
    valor: 50,
    tempoEstimadoMinutos: 20,
    descricao: 'Teste de tensao, carga e capacidade da bateria automotiva.',
    notes: 'Complementar com avaliacao do alternador quando houver baixa recorrente.',
  },
  {
    codigo: 'SERV-DIAG-ELETRICO-001',
    nome: 'Diagnostico eletrico',
    categoria: 'Eletrica',
    valor: 150,
    tempoEstimadoMinutos: 90,
    descricao: 'Analise de circuitos, alimentacao, aterramentos e componentes eletricos.',
    notes: 'Servico recomendado para panes intermitentes e falhas eletricas diversas.',
  },
  {
    codigo: 'SERV-TROCA-OLEO-FILTRO-001',
    nome: 'Troca de oleo e filtro',
    categoria: 'Lubrificacao',
    valor: 80,
    tempoEstimadoMinutos: 40,
    descricao: 'Substituicao do oleo do motor e filtro de oleo.',
    notes: 'Conferir especificacao do oleo, quantidade aplicada e reset de aviso quando houver.',
  },
  {
    codigo: 'SERV-TROCA-FILTRO-AR-001',
    nome: 'Substituicao do filtro de ar',
    categoria: 'Filtros',
    valor: 40,
    tempoEstimadoMinutos: 20,
    descricao: 'Remocao e instalacao do filtro de ar do motor.',
    notes: 'Inspecionar caixa do filtro e vedacoes durante a substituicao.',
  },
  {
    codigo: 'SERV-TROCA-FILTRO-CABINE-001',
    nome: 'Substituicao do filtro de cabine',
    categoria: 'Filtros',
    valor: 45,
    tempoEstimadoMinutos: 25,
    descricao: 'Substituicao do filtro de cabine do sistema de ventilacao.',
    notes: 'Recomendado junto da higienizacao do ar-condicionado.',
  },
  {
    codigo: 'SERV-TROCA-PASTILHAS-DIANT-001',
    nome: 'Troca de pastilhas dianteiras',
    categoria: 'Freios',
    valor: 180,
    tempoEstimadoMinutos: 90,
    descricao: 'Substituicao das pastilhas de freio dianteiras.',
    notes: 'Avaliar discos, pinças e realizar teste de frenagem apos o servico.',
  },
  {
    codigo: 'SERV-TROCA-FLUIDO-FREIO-001',
    nome: 'Troca de fluido de freio',
    categoria: 'Freios',
    valor: 120,
    tempoEstimadoMinutos: 60,
    descricao: 'Substituicao e sangria do fluido de freio.',
    notes: 'Usar fluido especificado e verificar ausencia de ar no sistema.',
  },
  {
    codigo: 'SERV-ALINHAMENTO-BALANCEAMENTO-001',
    nome: 'Alinhamento e balanceamento',
    categoria: 'Suspensao e Rodas',
    valor: 140,
    tempoEstimadoMinutos: 60,
    descricao: 'Ajuste de geometria e balanceamento das rodas.',
    notes: 'Verificar folgas em suspensao e calibragem antes do procedimento.',
  },
  {
    codigo: 'SERV-REVISAO-PREVENTIVA-001',
    nome: 'Revisao preventiva',
    categoria: 'Revisao',
    valor: 250,
    tempoEstimadoMinutos: 120,
    descricao: 'Checklist preventivo dos principais sistemas do veiculo.',
    notes: 'Registrar itens aprovados, itens de atencao e prioridades de reparo.',
  },
  {
    codigo: 'SERV-HIGIENIZACAO-AR-001',
    nome: 'Higienizacao do ar-condicionado',
    categoria: 'Ar-condicionado',
    valor: 120,
    tempoEstimadoMinutos: 60,
    descricao: 'Higienizacao do sistema de ventilacao e ar-condicionado.',
    notes: 'Recomendado substituir filtro de cabine quando necessario.',
  },
  {
    codigo: 'SERV-DIAG-AR-CONDICIONADO-001',
    nome: 'Diagnostico de ar-condicionado',
    categoria: 'Ar-condicionado',
    valor: 100,
    tempoEstimadoMinutos: 50,
    descricao: 'Avaliacao de funcionamento do sistema de ar-condicionado.',
    notes: 'Verificar pressao, vazamentos, compressor e eficiencia de resfriamento.',
  },
  {
    codigo: 'SERV-LIMPEZA-BICOS-001',
    nome: 'Limpeza de bicos injetores',
    categoria: 'Injecao',
    valor: 180,
    tempoEstimadoMinutos: 90,
    descricao: 'Limpeza e avaliacao dos bicos injetores.',
    notes: 'Indicado para marcha lenta irregular, falhas e consumo elevado.',
  },
  {
    codigo: 'SERV-ARREFECIMENTO-INSPECAO-001',
    nome: 'Inspecao do sistema de arrefecimento',
    categoria: 'Arrefecimento',
    valor: 90,
    tempoEstimadoMinutos: 45,
    descricao: 'Inspecao de vazamentos, fluido, mangueiras e funcionamento do arrefecimento.',
    notes: 'Registrar condicao do aditivo, reservatorio, ventoinha e temperatura de trabalho.',
  },
];

async function seedProdutos() {
  for (const produto of produtos) {
    await prisma.produto.upsert({
      where: { sku: produto.sku },
      update: {
        nome: produto.nome,
        descricao: produto.descricao,
        marca: produto.marca,
        categoria: produto.categoria,
        tipo: 'PECA',
        unidade: produto.unidade,
        veiculosCompativeis: 'Universal',
        localizacaoFisica: 'Estoque principal',
        fornecedor: 'Fornecedor a definir',
        aplicacao: 'Aplicacao conforme catalogo tecnico',
        notes: produto.notes,
        status: 'ATIVO',
        controlaEstoque: true,
        podeVenderPdv: true,
        podeVincularOs: true,
        estoqueMinimo: produto.estoqueMinimo,
        precoCusto: produto.precoCusto,
        precoVenda: produto.precoVenda,
      },
      create: {
        sku: produto.sku,
        nome: produto.nome,
        descricao: produto.descricao,
        marca: produto.marca,
        categoria: produto.categoria,
        tipo: 'PECA',
        unidade: produto.unidade,
        veiculosCompativeis: 'Universal',
        localizacaoFisica: 'Estoque principal',
        fornecedor: 'Fornecedor a definir',
        aplicacao: 'Aplicacao conforme catalogo tecnico',
        notes: produto.notes,
        status: 'ATIVO',
        controlaEstoque: true,
        podeVenderPdv: true,
        podeVincularOs: true,
        quantityInStock: produto.quantityInStock,
        estoqueMinimo: produto.estoqueMinimo,
        precoCusto: produto.precoCusto,
        precoVenda: produto.precoVenda,
      },
    });
  }
}

async function seedServicos() {
  for (const servico of servicos) {
    await prisma.servico.upsert({
      where: { codigo: servico.codigo },
      update: {
        nome: servico.nome,
        descricao: servico.descricao,
        categoria: servico.categoria,
        valor: servico.valor,
        tempoEstimadoMinutos: servico.tempoEstimadoMinutos,
        geraComissao: false,
        status: 'ATIVO',
        observacaoTecnica: servico.notes,
        notes: servico.notes,
      },
      create: {
        codigo: servico.codigo,
        nome: servico.nome,
        descricao: servico.descricao,
        categoria: servico.categoria,
        valor: servico.valor,
        tempoEstimadoMinutos: servico.tempoEstimadoMinutos,
        geraComissao: false,
        status: 'ATIVO',
        observacaoTecnica: servico.notes,
        notes: servico.notes,
      },
    });
  }
}

async function main() {
  await seedProdutos();
  await seedServicos();

  console.log(`Catalogo operacional atualizado: ${produtos.length} produtos e ${servicos.length} servicos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
