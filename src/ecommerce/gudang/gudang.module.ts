import { Module } from "@nestjs/common";

import { GudangController } from "./gudang.controller";

@Module({
  controllers: [GudangController],
  providers: [],
  exports: [],
})
export class GudangModule {}
