import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as dotenv from 'dotenv';
import * as express from 'express';
dotenv.config();

import { AppModule } from './app.module';
import helmet from 'helmet';
import { auditStorage } from './application/audit/audit.storage';
import { getCorsOrigin, getPort } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadsPath = join(process.cwd(), 'uploads');

  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }

  app.setGlobalPrefix('api');
  app.use('/uploads', express.static(uploadsPath));

  app.use((req: any, res: any, next: any) => {
    auditStorage.run({}, next);
  });

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: getCorsOrigin(),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  });

  await app.listen(getPort());
}

bootstrap();
