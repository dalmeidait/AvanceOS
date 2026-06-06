require('dotenv').config();

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} deve ser definido.`);
  if (/[\r\n;]/.test(value)) {
    throw new Error(`${name} contem caracteres invalidos para montar DATABASE_URL.`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name]?.trim() || fallback;
  if (/[\r\n;]/.test(value)) {
    throw new Error(`${name} contem caracteres invalidos para montar DATABASE_URL.`);
  }
  return value;
}

function boolEnv(name, defaultValue) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'sim'].includes(value);
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return;

  const host = required('DB_HOST');
  const port = optional('DB_PORT', '1433');
  const database = optional('DB_NAME', 'AvanceOSDB');
  const user = required('DB_USER');
  const password = required('DB_PASSWORD');
  const encrypt = boolEnv('DB_ENCRYPT', true);
  const trustServerCertificate = boolEnv('DB_TRUST_SERVER_CERTIFICATE', true);

  if (!/^\d+$/.test(port)) {
    throw new Error('DB_PORT deve ser numerico. Use 1433 para SQL Server padrao.');
  }

  process.env.DATABASE_URL =
    `sqlserver://${host}:${port};` +
    `database=${encodeURIComponent(database)};` +
    `user=${encodeURIComponent(user)};` +
    `password=${encodeURIComponent(password)};` +
    `encrypt=${encrypt};` +
    `trustServerCertificate=${trustServerCertificate}`;
}

ensureDatabaseUrl();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const expectedTables = [
  'usuarios',
  'fornecedores',
  'representantes',
  'logs_auditoria',
  'Cliente',
  'Veiculo',
  'produtos',
  'servicos',
  'movimentacoes_estoque',
  'ordens_servico',
  'itens_os',
  'solicitacoes_estoque',
  'Pagamento',
  'transacoes_financeiras',
  'categorias_financeiras',
  'comissoes_mecanicos',
  'sessoes_caixa',
  'vendas_pdv',
  'itens_venda_pdv',
  'recursos_fisicos',
  'agendamentos',
  'pesquisas_nps',
];

async function main() {
  const [{ databaseName }] = await prisma.$queryRaw`SELECT DB_NAME() AS databaseName`;
  const tables = await prisma.$queryRaw`
    SELECT TABLE_NAME AS tableName
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
  `;

  const tableNames = new Set(tables.map((row) => String(row.tableName).toLowerCase()));
  const missingTables = expectedTables.filter((table) => !tableNames.has(table.toLowerCase()));
  const hasPrismaMigrations = tableNames.has('_prisma_migrations');

  console.log('Conexao SQL Server OK.');
  console.log(`Banco atual: ${databaseName}`);
  console.log(`Tabelas esperadas encontradas: ${expectedTables.length - missingTables.length}/${expectedTables.length}`);
  console.log(`Tabela _prisma_migrations: ${hasPrismaMigrations ? 'OK' : 'NAO ENCONTRADA'}`);

  if (missingTables.length > 0) {
    console.error(`Tabelas ausentes: ${missingTables.join(', ')}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Falha ao conectar ou validar o SQL Server.');
    console.error(error?.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
