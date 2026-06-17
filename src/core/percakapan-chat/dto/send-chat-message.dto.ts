import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendChatMessageDto {
  @ApiProperty({ description: "Isi atau teks pesan chat yang akan dikirim" })
  @IsString()
  @IsNotEmpty()
  isiPesan: string;
}
