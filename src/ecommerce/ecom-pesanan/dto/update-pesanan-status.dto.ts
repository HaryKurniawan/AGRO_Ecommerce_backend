import { IsString, IsNotEmpty, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

const validStatuses = [
  "MENUNGGU_BAYAR",
  "DIPROSES",
  "DIKIRIM",
  "SELESAI",
  "DIBATALKAN",
  "MENUNGGU_KONFIRMASI_SELLER",
];

export class UpdatePesananStatusDto {
  @ApiProperty({
    description: "Status baru pesanan",
    enum: validStatuses,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(validStatuses, {
    message: `Status harus berupa salah satu dari: ${validStatuses.join(", ")}`,
  })
  status: string;
}
