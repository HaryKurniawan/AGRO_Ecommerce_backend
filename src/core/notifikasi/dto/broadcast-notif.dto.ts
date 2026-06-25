import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BroadcastNotifDto {
  @ApiProperty({ description: 'Judul notifikasi' })
  @IsString()
  @IsNotEmpty()
  judul: string;

  @ApiProperty({ description: 'Isi pesan notifikasi' })
  @IsString()
  @IsNotEmpty()
  pesan: string;

  @ApiProperty({ description: 'Target penerima (ALL_USER, ALL_OPERASIONAL, ROLE:xxx, USER:xxx)' })
  @IsString()
  @IsNotEmpty()
  target: string;

  @ApiPropertyOptional({ description: 'Data tambahan terkait notifikasi (opsional)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
