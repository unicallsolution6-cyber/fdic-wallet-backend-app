import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../config/prisma.service';
import { EmailModule } from '../email/email.module';

// Use /tmp on serverless (Vercel), ./uploads locally
const uploadDir = process.env.NODE_ENV === 'production'
  ? join(tmpdir(), 'uploads')
  : './uploads';

if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Module({
  imports: [
    EmailModule,
    MulterModule.register({
      storage: diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  ],
  controllers: [UserController],
  providers: [UserService, PrismaService],
})
export class UserModule {}
