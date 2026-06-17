import { Module } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";
import { MasterProdukController } from "./master-produk.controller";
import { MasterProdukRepository } from "./repositories/master-produk.repository";

import { CreateMasterProdukUseCase } from "./use-cases/create-master-produk.usecase";
import { UpdateMasterProdukUseCase } from "./use-cases/update-master-produk.usecase";
import { DeleteMasterProdukUseCase } from "./use-cases/delete-master-produk.usecase";
import { FindAllMasterProdukUseCase } from "./use-cases/find-all-master-produk.usecase";
import { FindOneMasterProdukUseCase } from "./use-cases/find-one-master-produk.usecase";
import { MapGudangMasterProdukUseCase } from "./use-cases/map-gudang-master-produk.usecase";
import { UnmapGudangMasterProdukUseCase } from "./use-cases/unmap-gudang-master-produk.usecase";

@Module({
  controllers: [MasterProdukController],
  providers: [
    PrismaService,
    MasterProdukRepository,
    CreateMasterProdukUseCase,
    UpdateMasterProdukUseCase,
    DeleteMasterProdukUseCase,
    FindAllMasterProdukUseCase,
    FindOneMasterProdukUseCase,
    MapGudangMasterProdukUseCase,
    UnmapGudangMasterProdukUseCase,
  ],
  exports: [
    MasterProdukRepository,
    CreateMasterProdukUseCase,
    UpdateMasterProdukUseCase,
    DeleteMasterProdukUseCase,
    FindAllMasterProdukUseCase,
    FindOneMasterProdukUseCase,
    MapGudangMasterProdukUseCase,
    UnmapGudangMasterProdukUseCase,
  ],
})
export class MasterProdukModule {}
