import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CreateStokMasukDto } from "./dto/create-stok-masuk.dto";
import { StokMasukProduk } from "@prisma/client";

@Injectable()
export class StokMasukRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateStokMasukDto): Promise<StokMasukProduk> {
    return this.prisma.stokMasukProduk.create({
      data: {
        produkId: data.produkId,
        pengajuanStokId: data.pengajuanStokId,
        itemPengajuanStokId: data.itemPengajuanStokId,
        jumlahMasuk: data.jumlahMasuk,
        jumlahTersisa: data.jumlahMasuk, // Initially, all stock is available
        hargaBeli: data.hargaBeli,
        tanggalMasuk: data.tanggalMasuk
          ? new Date(data.tanggalMasuk)
          : new Date(),
        varianKemasanId: data.varianKemasanId,
        ukuranKemasanKg: data.ukuranKemasanKg,
        jumlahKemasanMasuk: data.jumlahKemasanMasuk,
        jumlahKemasanTersisa: data.jumlahKemasanTersisa,
      },
    });
  }

  async findAvailableStockBatches(
    produkId: string,
  ): Promise<StokMasukProduk[]> {
    return this.prisma.stokMasukProduk.findMany({
      where: {
        produkId,
        jumlahTersisa: { gt: 0 },
      },
      orderBy: {
        tanggalMasuk: "asc", // FIFO: oldest first
      },
    });
  }

  async updateBatchStock(
    batchId: string,
    newQty: number,
  ): Promise<StokMasukProduk> {
    return this.prisma.stokMasukProduk.update({
      where: { id: batchId },
      data: { jumlahTersisa: newQty },
    });
  }

  async incrementBatchStock(
    batchId: string,
    qty: number,
  ): Promise<StokMasukProduk> {
    return this.prisma.stokMasukProduk.update({
      where: { id: batchId },
      data: {
        jumlahTersisa: {
          increment: qty,
        },
      },
    });
  }

  async decrementBatchStock(
    batchId: string,
    qty: number,
  ): Promise<StokMasukProduk> {
    return this.prisma.stokMasukProduk.update({
      where: { id: batchId },
      data: {
        jumlahTersisa: {
          decrement: qty,
        },
      },
    });
  }

  async findById(id: string): Promise<StokMasukProduk | null> {
    return this.prisma.stokMasukProduk.findUnique({
      where: { id },
    });
  }

  async getTotalAvailableStock(produkId: string): Promise<number> {
    const result = await this.prisma.stokMasukProduk.aggregate({
      where: {
        produkId,
        jumlahTersisa: { gt: 0 },
      },
      _sum: {
        jumlahTersisa: true,
      },
    });

    return result._sum.jumlahTersisa || 0;
  }

  async findVarianKemasan(produkId: string, ukuranKg: number) {
    return this.prisma.varianKemasan.findUnique({
      where: {
        produkId_ukuranKg: {
          produkId,
          ukuranKg,
        },
      },
    });
  }
}
