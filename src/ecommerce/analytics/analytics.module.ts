import { Module } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AnalyticsController } from "./analytics.controller";
import { GetProdukTerlarisPerKategoriUseCase } from "./use-cases/get-produk-terlaris-per-kategori.usecase";
import { GetRiwayatTerlarisUseCase } from "./use-cases/get-riwayat-terlaris.usecase";
import { GetTrenBulananUseCase } from "./use-cases/get-tren-bulanan.usecase";
import { GetTrenProdukBulananUseCase } from "./use-cases/get-tren-produk-bulanan.usecase";
import { GetPolaPenjualanUseCase } from "./use-cases/get-pola-penjualan.usecase";
import { GetPertumbuhanProdukUseCase } from "./use-cases/get-pertumbuhan-produk.usecase";
import { GetDemandSignalGudangUseCase } from "./use-cases/get-demand-signal-gudang.usecase";
import { GetTrenKomoditasGlobalUseCase } from "./use-cases/get-tren-komoditas-global.usecase";
import { GetPesananHarianUseCase } from "./use-cases/get-pesanan-harian.usecase";

// Queries
import { GetProdukTerlarisPerKategoriQuery } from "./queries/get-produk-terlaris-per-kategori.query";
import { GetRiwayatTerlarisQuery } from "./queries/get-riwayat-terlaris.query";
import { GetTrenBulananQuery } from "./queries/get-tren-bulanan.query";
import { GetTrenProdukBulananQuery } from "./queries/get-tren-produk-bulanan.query";
import { GetPolaPenjualanQuery } from "./queries/get-pola-penjualan.query";
import { GetPertumbuhanProdukQuery } from "./queries/get-pertumbuhan-produk.query";
import { GetDemandSignalGudangQuery } from "./queries/get-demand-signal-gudang.query";
import { GetTrenKomoditasGlobalQuery } from "./queries/get-tren-komoditas-global.query";
import { GetPesananHarianQuery } from "./queries/get-pesanan-harian.query";

@Module({
  controllers: [AnalyticsController],
  providers: [
    PrismaService,
    GetProdukTerlarisPerKategoriUseCase,
    GetRiwayatTerlarisUseCase,
    GetTrenBulananUseCase,
    GetTrenProdukBulananUseCase,
    GetPolaPenjualanUseCase,
    GetPertumbuhanProdukUseCase,
    GetDemandSignalGudangUseCase,
    GetTrenKomoditasGlobalUseCase,
    GetPesananHarianUseCase,

    // Queries
    GetProdukTerlarisPerKategoriQuery,
    GetRiwayatTerlarisQuery,
    GetTrenBulananQuery,
    GetTrenProdukBulananQuery,
    GetPolaPenjualanQuery,
    GetPertumbuhanProdukQuery,
    GetDemandSignalGudangQuery,
    GetTrenKomoditasGlobalQuery,
    GetPesananHarianQuery,
  ],
  exports: [
    GetProdukTerlarisPerKategoriUseCase,
    GetTrenBulananUseCase,
    GetDemandSignalGudangUseCase,
    GetTrenKomoditasGlobalUseCase,
  ],
})
export class AnalyticsModule {}
