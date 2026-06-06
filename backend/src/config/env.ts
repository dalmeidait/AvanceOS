import { Logger } from '@nestjs/common';

const logger = new Logger('Env');
const DEFAULT_DB_NAME = 'AvanceOSDB';
const DEFAULT_DB_PORT = '1433';

function cleanEnv(name: string, value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  if (/[\r\n;]/.test(trimmed)) {
    throw new Error(`${name} contém caracteres inválidos para montar a string SQL Server.`);
  }

  return trimmed;
}

function encodeSqlServerParam(value: string): string {
  return encodeURIComponent(value);
}

function getBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'sim'].includes(value);
}

export function getPort(): number {
  const port = Number(process.env.PORT ?? 3001);
  return Number.isFinite(port) && port > 0 ? port : 3001;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET deve ser definido em producao.');
  }

  logger.warn('JWT_SECRET ausente. Usando chave apenas para desenvolvimento local.');
  return 'avanceos-dev-jwt-secret-change-me';
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() || 'admin@oficinaavance.com.br';
}

export function getDemoMasterToken(): string | undefined {
  return process.env.DEMO_MASTER_TOKEN?.trim() || undefined;
}

export function getCorsOrigin(): boolean | string[] {
  const raw =
    process.env.CORS_ORIGIN?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000';

  if (raw === '*') {
    logger.warn('CORS_ORIGIN=* permite qualquer origem. Use apenas em desenvolvimento.');
    return true;
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveDatabaseUrl(): string | undefined {
  const directUrl = process.env.DATABASE_URL?.trim();
  if (directUrl) return directUrl;

  const host = cleanEnv('DB_HOST', process.env.DB_HOST);
  const port = cleanEnv('DB_PORT', process.env.DB_PORT) || DEFAULT_DB_PORT;
  const database = cleanEnv('DB_NAME', process.env.DB_NAME) || DEFAULT_DB_NAME;
  const user = cleanEnv('DB_USER', process.env.DB_USER);
  const password = cleanEnv('DB_PASSWORD', process.env.DB_PASSWORD);

  if (!/^\d+$/.test(port)) {
    throw new Error('DB_PORT deve ser numerico. Use 1433 para SQL Server padrao.');
  }

  if (!host && !user && !password && !process.env.DB_NAME && !process.env.DB_PORT) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL ou DB_HOST/DB_USER/DB_PASSWORD devem ser definidos em producao.');
    }
    logger.warn('DATABASE_URL ausente. O Prisma falhara ao conectar ate que a variavel seja definida.');
    return undefined;
  }

  const missing = [
    ['DB_HOST', host],
    ['DB_USER', user],
    ['DB_PASSWORD', password],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Variaveis de banco incompletas: ${missing.join(', ')}.`);
  }

  const encrypt = getBooleanEnv('DB_ENCRYPT', true);
  const trustServerCertificate = getBooleanEnv('DB_TRUST_SERVER_CERTIFICATE', true);
  const databaseUrl =
    `sqlserver://${host}:${port};` +
    `database=${encodeSqlServerParam(database)};` +
    `user=${encodeSqlServerParam(user!)};` +
    `password=${encodeSqlServerParam(password!)};` +
    `encrypt=${encrypt};` +
    `trustServerCertificate=${trustServerCertificate}`;

  process.env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}

function readSqlServerParams(databaseUrl: string): Record<string, string> {
  return databaseUrl
    .split(';')
    .slice(1)
    .reduce<Record<string, string>>((params, pair) => {
      const index = pair.indexOf('=');
      if (index <= 0) return params;
      params[pair.slice(0, index).toLowerCase()] = pair.slice(index + 1);
      return params;
    }, {});
}

export function validateDatabaseUrl(): void {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) return;

  if (!databaseUrl.startsWith('sqlserver://')) {
    logger.warn('DATABASE_URL não usa provider sqlserver. Confira prisma/schema.prisma antes de iniciar.');
  }

  const params = readSqlServerParams(databaseUrl);
  const databaseName = params.database ? decodeURIComponent(params.database) : undefined;

  if (!databaseName) {
    logger.warn('DATABASE_URL não informa database. Use database=AvanceOSDB ou o nome restaurado no servidor.');
  } else if (databaseName !== DEFAULT_DB_NAME) {
    logger.warn(`DATABASE_URL aponta para database="${databaseName}". Padrao esperado: ${DEFAULT_DB_NAME}.`);
  }

  if (!params.user) {
    logger.warn('DATABASE_URL não informa user. Defina usuário SQL Server via DATABASE_URL ou DB_USER.');
  }

  if (!params.password) {
    logger.warn('DATABASE_URL não informa password. Defina senha SQL Server via DATABASE_URL ou DB_PASSWORD.');
  }

  if (!databaseUrl.match(/^sqlserver:\/\/[^;:]+:1433;/)) {
    logger.warn('DATABASE_URL não informa a porta padrão 1433 explicitamente.');
  }

  if (!('encrypt' in params)) {
    logger.warn('DATABASE_URL não informa encrypt=true/false. Para servidor/lab, defina explicitamente.');
  }

  if (!('trustservercertificate' in params)) {
    logger.warn('DATABASE_URL não informa trustServerCertificate=true/false. Defina conforme o certificado do SQL Server.');
  }
}
