import { Module } from "@nestjs/common";
import { PajakController } from "./pajak.controller";
import { PajakService } from "./pajak.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Module({
  controllers: [PajakController],
  providers: [PajakService, PrismaService],
  exports: [PajakService],
})
export class PajakModule {}
