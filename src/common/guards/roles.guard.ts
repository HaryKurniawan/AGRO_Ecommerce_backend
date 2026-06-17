import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const pengguna = request.user || request.pengguna;

    if (!pengguna) {
      throw new ForbiddenException("No pengguna found in request");
    }

    const hasRole = requiredRoles.some((peran) => pengguna.peran === peran);

    if (!hasRole) {
      throw new ForbiddenException(
        `Pengguna peran "${pengguna.peran}" is not authorized. Required: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
