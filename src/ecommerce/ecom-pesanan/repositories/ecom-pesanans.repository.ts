import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class PesananEcomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create<T extends Prisma.PesananEcomCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PesananEcomCreateArgs>,
  ) {
    return this.prisma.pesananEcom.create(args);
  }

  async findMany<T extends Prisma.PesananEcomFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.PesananEcomFindManyArgs>,
  ) {
    return this.prisma.pesananEcom.findMany(args);
  }

  async count(args: Prisma.PesananEcomCountArgs) {
    return this.prisma.pesananEcom.count(args);
  }

  async findUnique<T extends Prisma.PesananEcomFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.PesananEcomFindUniqueArgs>,
  ) {
    return this.prisma.pesananEcom.findUnique(args);
  }

  async update<T extends Prisma.PesananEcomUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PesananEcomUpdateArgs>,
  ) {
    return this.prisma.pesananEcom.update(args);
  }

  // ── Shipping ───────────────────────────────────────────────────────────────

  async createShipping(args: Prisma.PengirimanPesananEcomCreateArgs) {
    return this.prisma.pengirimanPesananEcom.create(args);
  }

  async updateShipping(args: Prisma.PengirimanPesananEcomUpdateArgs) {
    return this.prisma.pengirimanPesananEcom.update(args);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  async findCartByCustomerId(penggunaId: string) {
    return this.prisma.keranjangEcom.findUnique({
      where: { konsumenId: penggunaId },
    });
  }

  async deleteManyCartItems(args: Prisma.ItemKeranjangEcomDeleteManyArgs) {
    return this.prisma.itemKeranjangEcom.deleteMany(args);
  }
}
