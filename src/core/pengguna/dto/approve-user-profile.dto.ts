import { IsString, IsNotEmpty, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ApproveUserProfileDto {
  @ApiProperty({
    description: "Peran profil yang akan di-approve (e.g., PENJUAL)",
    example: "PENJUAL",
  })
  @IsString()
  @IsNotEmpty()
  peran: string;

  @ApiProperty({
    description: "Status verifikasi baru",
    enum: ["APPROVED", "REJECTED", "PENDING"],
    example: "APPROVED",
  })
  @IsEnum(["APPROVED", "REJECTED", "PENDING"])
  @IsNotEmpty()
  status: "APPROVED" | "REJECTED" | "PENDING";
}
