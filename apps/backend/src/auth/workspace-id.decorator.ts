import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

// WorkspaceContextInterceptor가 세팅한 request.workspaceId를 컨트롤러에 주입한다.
export const WorkspaceId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const workspaceId: string | null | undefined = request.workspaceId;
    if (!workspaceId) {
      throw new ForbiddenException("워크스페이스를 찾을 수 없습니다");
    }
    return workspaceId;
  },
);
