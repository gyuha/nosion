import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { eq } from "drizzle-orm";
import { db } from "../drizzle/client";
import { workspace } from "../drizzle/schema";

// AuthGuard(전역, @thallesp/nestjs-better-auth)가 세팅한 request.user를 읽어
// 인증된 요청에 workspace_id를 주입한다(architecture.md §2 워크스페이스 격리).
@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id;
    if (userId) {
      const ws = await db.query.workspace.findFirst({
        where: eq(workspace.userId, userId),
      });
      request.workspaceId = ws?.id ?? null;
    }
    return next.handle();
  }
}
