import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class PenggunasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUnique(args: Prisma.PenggunaFindUniqueArgs) {
    return this.prisma.pengguna.findUnique(args);
  }

  async findFirst(args: Prisma.PenggunaFindFirstArgs) {
    return this.prisma.pengguna.findFirst(args);
  }

  async create(args: Prisma.PenggunaCreateArgs) {
    return this.prisma.pengguna.create(args);
  }

  async update(args: Prisma.PenggunaUpdateArgs) {
    return this.prisma.pengguna.update(args);
  }

  async delete(args: Prisma.PenggunaDeleteArgs) {
    return this.prisma.pengguna.delete(args);
  }

  async findMany(args: Prisma.PenggunaFindManyArgs) {
    return this.prisma.pengguna.findMany(args);
  }

  async count(args: Prisma.PenggunaCountArgs) {
    return this.prisma.pengguna.count(args);
  }

  // ── Seller Profile ──────────────────────────────────────────────────────────

  async createProfilPenjual(args: Prisma.ProfilPenjualCreateArgs) {
    return this.prisma.profilPenjual.create(args);
  }

  async updateProfilPenjual(args: Prisma.ProfilPenjualUpdateArgs) {
    return this.prisma.profilPenjual.update(args);
  }
}
