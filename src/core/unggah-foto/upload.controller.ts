import { extname, join, resolve } from "path";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { Response } from "express";

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
  Res,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { v4 as uuid } from "uuid";

const getUploadDir = (folder: string) => {
  const targetFolder = folder || "lainnya";
  
  // Periksa beberapa kemungkinan path working directory
  const possibleRoots = [
    resolve(process.cwd(), "backend", "public", "uploads", targetFolder),
    resolve(process.cwd(), "public", "uploads", targetFolder),
    resolve(__dirname, "..", "..", "..", "public", "uploads", targetFolder),
    resolve(__dirname, "..", "..", "..", "..", "public", "uploads", targetFolder),
  ];

  let dir = possibleRoots[0];
  for (const candidate of possibleRoots) {
    if (existsSync(candidate) || existsSync(join(candidate, ".."))) {
      dir = candidate;
      break;
    }
  }

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
};

@Controller("upload")
export class UploadController {
  @Post(":folder/gambar")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const rawFolder = req.params?.folder;
          const folder = typeof rawFolder === "string" ? rawFolder : "lainnya";
          const uploadPath = getUploadDir(folder);
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = uuid() + extname(file.originalname);
          cb(null, uniqueSuffix);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/i)) {
          return cb(
            new BadRequestException("Hanya file gambar (JPG, PNG, GIF, WEBP) yang diperbolehkan!"),
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
      throw new BadRequestException("Tidak ada file yang diunggah");
    }
    return {
      statusCode: 201,
      message: "File uploaded successfully",
      data: {
        url: `/uploads/${folder}/${file.filename}`,
      },
    };
  }

  @Get("file/:folder/:fileName")
  serveFile(
    @Param("folder") folder: string,
    @Param("fileName") fileName: string,
    @Res() res: Response,
  ) {
    const filePath = join(getUploadDir(folder), fileName);
    if (!existsSync(filePath)) {
      throw new NotFoundException("File foto tidak ditemukan");
    }
    return res.sendFile(filePath);
  }

  @Get("admin/list")
  listFiles(@Query("folder") folder: string) {
    const targetFolder = folder || "lainnya";
    const directoryPath = getUploadDir(targetFolder);

    try {
      const files = readdirSync(directoryPath);
      const fileData = files.map((fileName) => {
        const filePath = join(directoryPath, fileName);
        const stats = statSync(filePath);
        return {
          name: fileName,
          url: `/upload/file/${targetFolder}/${fileName}`,
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

    const directoryPath = getUploadDir(folder);
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

    const directoryPath = getUploadDir(folder);

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
