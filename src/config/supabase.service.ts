import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private bucketName = 'documents';

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || '',
    );
  }

  async uploadFile(
    file: Express.Multer.File,
    fileName: string,
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer || require('fs').readFileSync(file.path), {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }
}
