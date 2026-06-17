import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class MasterProdukRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany<T extends Prisma.MasterProdukFindManyArgs>(
    args?: Prisma.SelectSubset<T, Prisma.MasterProdukFindManyArgs>,
  ) {
    return this.prisma.masterProduk.findMany(args);
  }

  async count(args?: Prisma.MasterProdukCountArgs) {
    return this.prisma.masterProduk.count(args);
  }

  async findUnique<T extends Prisma.MasterProdukFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.MasterProdukFindUniqueArgs>,
  ) {
    return this.prisma.masterProduk.findUnique(args);
  }

  async create<T extends Prisma.MasterProdukCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.MasterProdukCreateArgs>,
  ) {
    return this.prisma.masterProduk.create(args);
  }

  async update<T extends Prisma.MasterProdukUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.MasterProdukUpdateArgs>,
  ) {
    return this.prisma.masterProduk.update(args);
  }

  async delete<T extends Prisma.MasterProdukDeleteArgs>(
    args: Prisma.SelectSubset<T, Prisma.MasterProdukDeleteArgs>,
  ) {
    return this.prisma.masterProduk.delete(args);
  }

  // Mappings
  async createMapping(args: Prisma.MappingProdukGudangCreateArgs) {
    return this.prisma.mappingProdukGudang.create(args);
  }

  async deleteMapping(args: Prisma.MappingProdukGudangDeleteArgs) {
    return this.prisma.mappingProdukGudang.delete(args);
  }

  async findManyMappings(args?: Prisma.MappingProdukGudangFindManyArgs) {
    return this.prisma.mappingProdukGudang.findMany(args);
  }

  async findUniqueMapping(args: Prisma.MappingProdukGudangFindUniqueArgs) {
    return this.prisma.mappingProdukGudang.findUnique(args);
  }
}
