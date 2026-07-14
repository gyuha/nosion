import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { AppController } from "./app.controller";
import { DrizzleModule } from "./drizzle/drizzle.module";
import { auth } from "./auth/auth.config";
import { WorkspaceContextInterceptor } from "./auth/workspace-context.interceptor";
import { PagesModule } from "./pages/pages.module";
import { DocumentsModule } from "./documents/documents.module";

@Module({
  imports: [
    DrizzleModule,
    AuthModule.forRoot({ auth }),
    PagesModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: WorkspaceContextInterceptor },
  ],
})
export class AppModule {}
