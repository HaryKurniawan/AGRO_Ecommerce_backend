import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SubmitDeliveryProofDto {
  @ApiProperty({
    description:
      "Bukti foto pengiriman (Base64 atau URLs). Minimum 1, maksimum 3 foto",
    type: [String],
    example: ["data:image/jpeg;base64,...", "data:image/jpeg;base64,..."],
  })
  @IsArray()
  @ArrayMinSize(1, { message: "Minimal 1 foto wajib dilampirkan" })
  @ArrayMaxSize(3, { message: "Maksimal 3 foto diperbolehkan" })
  buktiKirimFoto: string[];

  @ApiPropertyOptional({
    description: "Catatan tentang pengiriman",
    type: String,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Catatan maksimal 500 karakter" })
  buktiKirimCatatan?: string;

  @ApiPropertyOptional({
    description: "GPS Latitude lokasi pengiriman",
    type: Number,
    example: -6.2088,
  })
  @IsOptional()
  buktiKirimLat?: number;

  @ApiPropertyOptional({
    description: "GPS Longitude lokasi pengiriman",
    type: Number,
    example: 106.8456,
  })
  @IsOptional()
  buktiKirimLng?: number;
}
