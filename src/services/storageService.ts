import { supabase, isSupabaseConfigured } from './supabase';

export interface StorageUploadResult {
  fileUrl: string;
  fileSize: string;
  fileType: 'pdf' | 'image' | 'doc';
  fileName: string;
  isRealStorage: boolean;
}

export const storageService = {
  /**
   * Upload a medical document to Supabase Storage 'medical-records' bucket.
   * If Supabase is unconfigured or in offline mode, converts file to a secure local Blob/DataURI.
   */
  async uploadMedicalDocument(
    file: File,
    userId: string,
    onProgress?: (percent: number) => void
  ): Promise<StorageUploadResult> {
    // 1. Validation
    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`File exceeds maximum allowed size of ${maxSizeMB}MB`);
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported file format. Please upload PDF, JPEG, PNG, or Word documents.');
    }

    const fileType = file.type.includes('pdf') 
      ? 'pdf' 
      : file.type.includes('image') 
      ? 'image' 
      : 'doc';
    const fileSizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    // 2. Real Supabase Storage Upload
    if (isSupabaseConfigured) {
      try {
        if (onProgress) onProgress(20);
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('medical-records')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.warn('Supabase storage upload error, falling back to local vault:', error.message);
        } else if (data) {
          if (onProgress) onProgress(80);
          // Generate signed URL (expires in 2 hours for security)
          const { data: signedData } = await supabase.storage
            .from('medical-records')
            .createSignedUrl(data.path, 7200);

          if (onProgress) onProgress(100);
          return {
            fileUrl: signedData?.signedUrl || data.path,
            fileSize: fileSizeFormatted,
            fileType,
            fileName: file.name,
            isRealStorage: true
          };
        }
      } catch (err) {
        console.warn('Storage service exception:', err);
      }
    }

    // 3. Graceful Local / In-Browser Fallback for Demo & Offline Environments
    if (onProgress) onProgress(50);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file locally'));
      reader.readAsDataURL(file);
    });

    if (onProgress) onProgress(100);
    return {
      fileUrl: dataUrl,
      fileSize: fileSizeFormatted,
      fileType,
      fileName: file.name,
      isRealStorage: false
    };
  }
};
