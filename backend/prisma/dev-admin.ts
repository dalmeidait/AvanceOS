import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Role } from '../src/domain/enums';

const prisma = new PrismaClient();

async function main() {
  const senhaInicial = process.env.DEV_ADMIN_PASSWORD;
  if (!senhaInicial) {
    throw new Error('DEV_ADMIN_PASSWORD deve ser definido para criar admin em producao.');
  }
  const senhaHash = await bcrypt.hash(senhaInicial, 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@oficinaavance.com.br' },
    update: {
      nome: 'Administrador do Sistema',
      senhaHash,
      cargo: Role.ADMINISTRADOR,
      isActive: true,
      mfaAtivo: false,
      mfaSecret: null,
      versaoToken: 0,
    },
    create: {
      nome: 'Administrador do Sistema',
      email: 'admin@oficinaavance.com.br',
      senhaHash,
      cargo: Role.ADMINISTRADOR,
      isActive: true,
      mfaAtivo: false,
      mfaSecret: null,
      versaoToken: 0,
    },
  });

  console.log(`Admin de desenvolvimento garantido: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
