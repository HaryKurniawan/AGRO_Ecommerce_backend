import { IsEmail } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
  @ApiProperty({ example: "pengguna@email.com" })
  @IsEmail()
  email: string;
}
