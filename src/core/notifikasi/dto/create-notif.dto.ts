import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipeNotifikasi } from '@prisma/client';

export class CreateNotifDto {
  @ApiProperty({ description: 'ID pengguna penerima notifikasi' })
  @IsString()
  @IsNotEmpty()
  penggunaId: string;

  @ApiProperty({ description: 'Judul notifikasi' })
  @IsString()
  @IsNotEmpty()
  judul: string;

  @ApiProperty({ description: 'Isi pesan notifikasi' })
  @IsString()
  @IsNotEmpty()
  pesan: string;

  @ApiProperty({ enum: TipeNotifikasi, description: 'Tipe notifikasi' })
  @IsEnum(TipeNotifikasi)
  tipe: TipeNotifikasi;

  @ApiPropertyOptional({ description: 'Data tambahan terkait notifikasi (opsional)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
