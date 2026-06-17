import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class ProdukEcomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany<T extends Prisma.ProdukEcomFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProdukEcomFindManyArgs>,
  ) {
    return this.prisma.produkEcom.findMany(args);
  }

  async count(args: Prisma.ProdukEcomCountArgs) {
    return this.prisma.produkEcom.count(args);
  }

  async findUnique<T extends Prisma.ProdukEcomFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProdukEcomFindUniqueArgs>,
  ) {
    return this.prisma.produkEcom.findUnique(args);
  }

  async create<T extends Prisma.ProdukEcomCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProdukEcomCreateArgs>,
  ) {
    return this.prisma.produkEcom.create(args);
  }

  async update<T extends Prisma.ProdukEcomUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProdukEcomUpdateArgs>,
  ) {
    return this.prisma.produkEcom.update(args);
  }

  async delete<T extends Prisma.ProdukEcomDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.ProdukEcomDeleteArgs>,
  ) {
    return this.prisma.produkEcom.delete(args);
  }

  // ── Stock History ──────────────────────────────────────────────────────────

  async createStockHistory(args: Prisma.RiwayatStokProdukCreateArgs) {
    return this.prisma.riwayatStokProduk.create(args);
  }

  async findManyStockHistory(args: Prisma.RiwayatStokProdukFindManyArgs) {
    return this.prisma.riwayatStokProduk.findMany(args);
  }

  async countStockHistory(args: Prisma.RiwayatStokProdukCountArgs) {
    return this.prisma.riwayatStokProduk.count(args);
  }

  // ── Inventaris Toko ────────────────────────────────────────────────────────

  async findUniqueInventory(args: Prisma.InventarisTokoFindUniqueArgs) {
    return this.prisma.inventarisToko.findUnique(args);
  }

  async updateInventory(args: Prisma.InventarisTokoUpdateArgs) {
    return this.prisma.inventarisToko.update(args);
  }

  async findManyInventory(args: Prisma.InventarisTokoFindManyArgs) {
    return this.prisma.inventarisToko.findMany(args);
  }

  async upsertInventory(args: Prisma.InventarisTokoUpsertArgs) {
    return this.prisma.inventarisToko.upsert(args);
  }

  // ── Varian Kemasan ─────────────────────────────────────────────────────────

  async findManyVarian(args: Prisma.VarianKemasanFindManyArgs) {
    return this.prisma.varianKemasan.findMany(args);
  }

  async findUniqueVarian(args: Prisma.VarianKemasanFindUniqueArgs) {
    return this.prisma.varianKemasan.findUnique(args);
  }

  async createVarian(args: Prisma.VarianKemasanCreateArgs) {
    return this.prisma.varianKemasan.create(args);
  }

  async updateVarian(args: Prisma.VarianKemasanUpdateArgs) {
    return this.prisma.varianKemasan.update(args);
  }

  async deleteVarian(args: Prisma.VarianKemasanDeleteArgs) {
    return this.prisma.varianKemasan.delete(args);
  }
}
