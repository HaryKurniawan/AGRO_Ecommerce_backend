import { SetMetadata } from "@nestjs/common";
import { Peran } from "@prisma/client";

export const ROLES_KEY = "roles";
export const Roles = (...perans: Peran[]) => SetMetadata(ROLES_KEY, perans);
