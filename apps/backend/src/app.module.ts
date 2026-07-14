import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { DrizzleModule } from "./drizzle/drizzle.module";

@Module({
  imports: [DrizzleModule],
  controllers: [AppController],
})
export class AppModule {}
