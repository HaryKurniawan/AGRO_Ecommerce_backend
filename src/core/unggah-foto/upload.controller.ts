import { extname } from "path";

import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { v4 as uuid } from "uuid";

@Controller("upload")
export class UploadController {
  @Post("gambar")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./public/uploads",
        filename: (req, file, cb) => {
          const uniqueSuffix = uuid() + extname(file.originalname);
          cb(null, uniqueSuffix);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException("Only gambar files are allowed!"),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    // Return relative URL that can be served via static file serving
    return {
      statusCode: 201,
      message: "File uploaded successfully",
      data: {
        url: `/uploads/${file.filename}`,
      },
    };
  }
}
