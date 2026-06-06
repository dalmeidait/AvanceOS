import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Role } from '../src/domain/enums';;
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const senhaInicial = process.env.DEV_ADMIN_PASSWORD;
  if (!senhaInicial) {
    throw new Error('DEV_ADMIN_PASSWORD deve ser definido para criar admin em producao.');
  }
  const senhaHasheada = await bcrypt.hash(senhaInicial, 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@oficinaavance.com.br' },
    update: {
      senhaHash: senhaHasheada
    }, 
    create: {
      nome: 'Administrador do Sistema',
      email: 'admin@oficinaavance.com.br',
      senhaHash: senhaHasheada,
      cargo: Role.ADMINISTRADOR,
    },
  });

  console.log('Usuário ADMIN garantido no banco:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
