import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(penggunaId: string) {
    return this.prisma.alamatKonsumen.findMany({
      where: { konsumenId: penggunaId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async create(
    penggunaId: string,
    data: {
      label: string;
      penerima?: string;
      alamat: string;
      kota: string;
      provinsi: string;
      kecamatan?: string;
      kelurahan?: string;
      kodePos?: string;
      telepon?: string;
      isDefault?: boolean;
      lat?: number;
      lng?: number;
    },
  ) {
    if (data.isDefault) {
      await this.prisma.alamatKonsumen.updateMany({
        where: { konsumenId: penggunaId },
        data: { isDefault: false },
      });
    }
    return this.prisma.alamatKonsumen.create({
      data: { konsumenId: penggunaId, ...data },
    });
  }

  async update(id: string, penggunaId: string, data: Record<string, unknown>) {
    const alamat = await this.prisma.alamatKonsumen.findUnique({
      where: { id },
    });
    if (!alamat || alamat.konsumenId !== penggunaId)
      throw new NotFoundException("Address not found");
    if (data.isDefault) {
      await this.prisma.alamatKonsumen.updateMany({
        where: { konsumenId: penggunaId },
        data: { isDefault: false },
      });
    }
    return this.prisma.alamatKonsumen.update({ where: { id }, data });
  }

  async remove(id: string, penggunaId: string) {
    const alamat = await this.prisma.alamatKonsumen.findUnique({
      where: { id },
    });
    if (!alamat || alamat.konsumenId !== penggunaId)
      throw new NotFoundException("Address not found");
    return this.prisma.alamatKonsumen.delete({ where: { id } });
  }

  async setDefault(id: string, penggunaId: string) {
    await this.prisma.alamatKonsumen.updateMany({
      where: { konsumenId: penggunaId },
      data: { isDefault: false },
    });
    return this.prisma.alamatKonsumen.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
