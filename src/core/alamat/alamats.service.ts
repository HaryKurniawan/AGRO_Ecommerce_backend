import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(penggunaId: string) {
    const addresses = await this.prisma.alamatKonsumen.findMany({
      where: { konsumenId: penggunaId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return addresses.map((a: any) => ({ ...a, id: a.id_alamatPembeli }));
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
    const totalAddresses = await this.prisma.alamatKonsumen.count({
      where: { konsumenId: penggunaId },
    });
    if (totalAddresses >= 3) {
      throw new BadRequestException("Maksimal alamat yang dapat disimpan adalah 3.");
    }

    if (data.isDefault) {
      await this.prisma.alamatKonsumen.updateMany({
        where: { konsumenId: penggunaId },
        data: { isDefault: false },
      });
    }
    const newAddress = await this.prisma.alamatKonsumen.create({
      data: { konsumenId: penggunaId, ...data },
    });
    return { ...newAddress, id: newAddress.id_alamatPembeli };
  }

  async update(id: string, penggunaId: string, data: Record<string, unknown>) {
    const alamat = await this.prisma.alamatKonsumen.findUnique({
      where: { id_alamatPembeli: id },
    });
    if (!alamat || alamat.konsumenId !== penggunaId)
      throw new NotFoundException("Address not found");
    if (data.isDefault) {
      await this.prisma.alamatKonsumen.updateMany({
        where: { konsumenId: penggunaId },
        data: { isDefault: false },
      });
    }
    const updated = await this.prisma.alamatKonsumen.update({ where: { id_alamatPembeli: id }, data });
    return { ...updated, id: updated.id_alamatPembeli };
  }

  async remove(id: string, penggunaId: string) {
    const alamat = await this.prisma.alamatKonsumen.findUnique({
      where: { id_alamatPembeli: id },
    });
    if (!alamat || alamat.konsumenId !== penggunaId)
      throw new NotFoundException("Address not found");
    return this.prisma.alamatKonsumen.delete({ where: { id_alamatPembeli: id } });
  }

  async setDefault(id: string, penggunaId: string) {
    await this.prisma.alamatKonsumen.updateMany({
      where: { konsumenId: penggunaId },
      data: { isDefault: false },
    });
    const updated = await this.prisma.alamatKonsumen.update({
      where: { id_alamatPembeli: id },
      data: { isDefault: true },
    });
    return { ...updated, id: updated.id_alamatPembeli };
  }
}
