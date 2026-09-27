import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "../auth/auth-user";

/** The signed-in user attached by AuthGuard — undefined on anonymous public requests. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest().user;
});
