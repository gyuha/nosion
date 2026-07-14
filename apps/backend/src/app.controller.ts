import { Controller, Get, Req } from "@nestjs/common";
import { AllowAnonymous, Session, UserSession } from "@thallesp/nestjs-better-auth";
import type { Request } from "express";

@Controller()
export class AppController {
  @Get("health")
  @AllowAnonymous()
  health() {
    return { status: "ok" };
  }

  @Get("me")
  me(@Session() session: UserSession, @Req() request: Request) {
    return {
      userId: session.user.id,
      workspaceId: (request as unknown as { workspaceId: string | null })
        .workspaceId,
    };
  }
}
