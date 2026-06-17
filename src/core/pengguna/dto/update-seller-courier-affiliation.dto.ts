import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsEmail,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateSellerCourierAffiliationDto {
  @ApiProperty({
    description: "Aksi penugasan kurir",
    enum: ["assign", "remove", "create_new"],
  })
  @IsEnum(["assign", "remove", "create_new"])
  @IsNotEmpty()
  action: "assign" | "remove" | "create_new";

  @ApiPropertyOptional({
    description: "ID User Kurir (wajib untuk assign/remove)",
  })
  @IsString()
  @IsOptional()
  courierUserId?: string;

  @ApiPropertyOptional({
    description: "Nama Kurir baru (wajib untuk create_new)",
  })
  @IsString()
  @IsOptional()
  courierName?: string;

  @ApiPropertyOptional({
    description: "Email Kurir baru (wajib untuk create_new)",
  })
  @IsEmail()
  @IsOptional()
  courierEmail?: string;

  @ApiPropertyOptional({
    description: "Password Kurir baru (wajib untuk create_new)",
  })
  @IsString()
  @IsOptional()
  courierPassword?: string;

  @ApiPropertyOptional({
    description: "No Telepon Kurir baru (wajib untuk create_new)",
  })
  @IsString()
  @IsOptional()
  courierPhone?: string;
}
