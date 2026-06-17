import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...perans: string[]) => SetMetadata(ROLES_KEY, perans);
