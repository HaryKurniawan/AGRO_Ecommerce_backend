import { Module } from "@nestjs/common";

import { AddressesController } from "./alamats.controller";
import { AddressesService } from "./alamats.service";

@Module({
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
