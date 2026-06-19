import { extname, join } from "path";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";

import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Get,
  Delete,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { v4 as uuid } from "uuid";

@Controller("upload")
export class UploadController {
  @Post(":folder/gambar")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const folder = req.params.folder || "lainnya";
          const uploadPath = `./public/uploads/${folder}`;
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
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
  uploadImage(
    @Param("folder") folder: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    // Return relative URL that can be served via static file serving
    return {
      statusCode: 201,
      message: "File uploaded successfully",
      data: {
        url: `/uploads/${folder}/${file.filename}`,
      },
    };
  }

  @Get("admin/list")
  listFiles(@Query("folder") folder: string) {
    const targetFolder = folder || "lainnya";
    const directoryPath = join(__dirname, "..", "..", "..", "public", "uploads", targetFolder);

    if (!existsSync(directoryPath)) {
      return {
        statusCode: 200,
        data: [],
      };
    }

    try {
      const files = readdirSync(directoryPath);
      const fileData = files.map((fileName) => {
        const filePath = join(directoryPath, fileName);
        const stats = statSync(filePath);
        return {
          name: fileName,
          url: `/uploads/${targetFolder}/${fileName}`,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      });

      return {
        statusCode: 200,
        data: fileData,
      };
    } catch (err) {
      throw new BadRequestException("Unable to list files!");
    }
  }

  @Delete("admin/file")
  deleteFile(@Query("folder") folder: string, @Query("fileName") fileName: string) {
    if (!folder || !fileName) {
      throw new BadRequestException("Folder and fileName query parameters are required");
    }

    const directoryPath = join(__dirname, "..", "..", "..", "public", "uploads", folder);
    const filePath = join(directoryPath, fileName);

    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
        return {
          statusCode: 200,
          message: "File deleted successfully",
        };
      } catch (err) {
        throw new BadRequestException("Unable to delete file!");
      }
    } else {
      throw new BadRequestException("File not found");
    }
  }

  @Delete("admin/clean-folder")
  cleanFolder(@Query("folder") folder: string) {
    if (!folder) {
      throw new BadRequestException("Folder query parameter is required");
    }

    const directoryPath = join(__dirname, "..", "..", "..", "public", "uploads", folder);

    if (existsSync(directoryPath)) {
      try {
        const files = readdirSync(directoryPath);
        let deletedCount = 0;
        for (const file of files) {
          unlinkSync(join(directoryPath, file));
          deletedCount++;
        }
        return {
          statusCode: 200,
          message: `Successfully deleted ${deletedCount} files`,
        };
      } catch (err) {
        throw new BadRequestException("Unable to clean folder!");
      }
    } else {
      throw new BadRequestException("Folder not found");
    }
  }
}
