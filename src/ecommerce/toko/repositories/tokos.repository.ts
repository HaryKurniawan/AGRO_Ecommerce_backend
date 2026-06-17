import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";

@Injectable()
export class TokosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSellerProfileByUserId(penggunaId: string) {
    return this.prisma.profilPenjual.findUnique({
      where: { penggunaId },
    });
  }

  async create<T extends Prisma.TokoCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.TokoCreateArgs>,
  ) {
    return this.prisma.toko.create(args);
  }

  async findMany<T extends Prisma.TokoFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.TokoFindManyArgs>,
  ) {
    return this.prisma.toko.findMany(args);
  }

  async count(args: Prisma.TokoCountArgs) {
    return this.prisma.toko.count(args);
  }

  async aggregate(args: Prisma.TokoAggregateArgs) {
    return this.prisma.toko.aggregate(args);
  }

  async findUnique<T extends Prisma.TokoFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.TokoFindUniqueArgs>,
  ) {
    return this.prisma.toko.findUnique(args);
  }

  async findFirst<T extends Prisma.TokoFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.TokoFindFirstArgs>,
  ) {
    return this.prisma.toko.findFirst(args);
  }

  async update<T extends Prisma.TokoUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.TokoUpdateArgs>,
  ) {
    return this.prisma.toko.update(args);
  }

  async findUserById(id: string) {
    return this.prisma.pengguna.findUnique({
      where: { id },
    });
  }
}
