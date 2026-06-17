import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class PengajuanStokRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create<T extends Prisma.PengajuanStokTokoCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PengajuanStokTokoCreateArgs>,
  ) {
    return this.prisma.pengajuanStokToko.create(args);
  }

  async findMany<T extends Prisma.PengajuanStokTokoFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.PengajuanStokTokoFindManyArgs>,
  ) {
    return this.prisma.pengajuanStokToko.findMany(args);
  }

  async findFirst<T extends Prisma.PengajuanStokTokoFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.PengajuanStokTokoFindFirstArgs>,
  ) {
    return this.prisma.pengajuanStokToko.findFirst(args);
  }

  async findUnique<T extends Prisma.PengajuanStokTokoFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.PengajuanStokTokoFindUniqueArgs>,
  ) {
    return this.prisma.pengajuanStokToko.findUnique(args);
  }

  async update<T extends Prisma.PengajuanStokTokoUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PengajuanStokTokoUpdateArgs>,
  ) {
    return this.prisma.pengajuanStokToko.update(args);
  }

  async delete<T extends Prisma.PengajuanStokTokoDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.PengajuanStokTokoDeleteArgs>,
  ) {
    return this.prisma.pengajuanStokToko.delete(args);
  }

  // ── Item Pengajuan Stok ────────────────────────────────────────────────────

  async updateItem(args: Prisma.ItemPengajuanStokUpdateArgs) {
    return this.prisma.itemPengajuanStok.update(args);
  }

  // ── Price Configs ──────────────────────────────────────────────────────────

  async findPriceConfigByTokoId(tokoId: string) {
    return this.prisma.konfigurasiHargaToko.findUnique({
      where: { tokoId },
    });
  }

  async upsertPriceConfig(tokoId: string, marginDefaultPersen: number) {
    return this.prisma.konfigurasiHargaToko.upsert({
      where: { tokoId },
      update: { marginDefaultPersen },
      create: { tokoId, marginDefaultPersen },
    });
  }
}
