import { IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResendVerificationDto {
  @ApiProperty({
    description: "Email pengguna untuk dikirimi ulang tautan verifikasi",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
