import { Module } from "@nestjs/common";

import { MasterKomoditasController } from "./master-komoditas.controller";
import { MasterKomoditasService } from "./master-komoditas.service";

@Module({
  controllers: [MasterKomoditasController],
  providers: [MasterKomoditasService],
  exports: [MasterKomoditasService],
})
export class MasterKomoditasModule {}
