import { Injectable } from "@nestjs/common";
import { TransaksiKeuntungan, TransaksiKeuntunganBatch } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class FindTransaksiByPesananQuery {
  constructor(private prisma: PrismaService) {}

  async execute(pesananId: string): Promise<
    (TransaksiKeuntungan & {
      batchDetails: TransaksiKeuntunganBatch[];
    })[]
  > {
    return this.prisma.transaksiKeuntungan.findMany({
      where: { pesananId },
      include: { batchDetails: true },
    });
  }
}
