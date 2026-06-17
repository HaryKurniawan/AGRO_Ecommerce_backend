import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { SubmitDeliveryProofDto } from "../dto/submit-delivery-proof.dto";

@Injectable()
export class SubmitDeliveryProofUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pesananId: string, payload: SubmitDeliveryProofDto) {
    // Validate pesanan exists
    const pesanan = await this.prisma.pesananEcom.findUnique({
      where: { id: pesananId },
      include: { pengiriman: true },
    });

    if (!pesanan) {
      throw new NotFoundException(`Pesanan ${pesananId} tidak ditemukan`);
    }

    if (!pesanan.pengiriman) {
      throw new NotFoundException(
        `Pengiriman untuk pesanan ${pesananId} tidak ditemukan`,
      );
    }

    // Only allow proof submission when already arrived
    if (pesanan.pengiriman.status !== "ARRIVED") {
      throw new BadRequestException(
        'Bukti kirim hanya dapat dikirim setelah status "Sudah Tiba"',
      );
    }

    // Update with proof
    return this.prisma.pengirimanPesananEcom.update({
      where: { pesananId },
      data: {
        buktiKirimFoto: payload.buktiKirimFoto,
        buktiKirimCatatan: payload.buktiKirimCatatan,
        buktiKirimWaktu: new Date(),
        buktiKirimLat: payload.buktiKirimLat,
        buktiKirimLng: payload.buktiKirimLng,
      },
      include: { pesanan: true },
    });
  }
}
