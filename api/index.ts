import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { type Handler } from 'express';

let cachedApp: any;

async function bootstrap() {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_2,
    'http://localhost:5173',
  ].filter((url): url is string => Boolean(url));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.init();
  cachedApp = app.getHttpAdapter().getInstance();
  return cachedApp;
}

const handler: Handler = async (req, res) => {
  const app = await bootstrap();
  app(req, res);
};

export default handler;
