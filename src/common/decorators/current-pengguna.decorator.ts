import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Passport meletakkan user di request.user (standard).
    // JWT strategy mungkin meletakkan di request.user juga.
    // Fallback ke request.pengguna untuk backward compat jika ada.
    const pengguna = request.user ?? request.pengguna;
    return data ? pengguna?.[data] : pengguna;
  },
);
