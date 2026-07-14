import * as path from "node:path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import * as express from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // better-auth가 원본 요청 본문을 직접 처리해야 함
  });
  app.setGlobalPrefix("api");
  // better-auth 라우트(/api/auth/*)는 자체 처리하고, 그 외 라우트는 여기서 JSON 파싱한다.
  app.use(express.json());
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
