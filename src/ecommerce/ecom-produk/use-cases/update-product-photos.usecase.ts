import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";


@Injectable()
export class UpdateProductPhotosUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(produkId: string, fotoUrls: string[]) {
    // Validate
    if (fotoUrls.length < 2 || fotoUrls.length > 3) {
      throw new BadRequestException("Foto harus minimal 2 dan maksimal 3");
    }

    // Check if product exists
    const produk = await this.prisma.produkEcom.findUnique({
      where: { id: produkId },
    });

    if (!produk) {
      throw new NotFoundException("Produk tidak ditemukan");
    }

    // Update photos
    // First photo is gambarUrl, rest are fotoLainnya
    const gambarUrl = fotoUrls[0];
    const fotoLainnya = fotoUrls.slice(1);

    const updated = await this.prisma.produkEcom.update({
      where: { id: produkId },
      data: {
        gambarUrl,
        fotoLainnya,
      },
      select: {
        id: true,
        nama: true,
        gambarUrl: true,
        fotoLainnya: true,
        updatedAt: true,
      },
    });



    return {
      statusCode: 200,
      message: "Foto produk berhasil diperbarui",
      data: updated,
    };
  }
}
