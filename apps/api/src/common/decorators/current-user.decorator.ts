import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Pulls the authenticated user off the request. Phase 1 stub: the auth
 * module attaches `req.user` once a session strategy is wired in Phase 2 —
 * until then this returns undefined outside of tests.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
