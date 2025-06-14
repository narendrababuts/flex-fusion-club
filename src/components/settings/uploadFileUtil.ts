
import { supabase } from '@/integrations/supabase/client';

/**
 * Upload a file to a supabase storage bucket.
 * @param bucket The storage bucket name
 * @param garageId The garage id, for namespacing
 * @param file The file object to upload
 * @returns The public URL of the uploaded file, or throws on error
 */
export async function uploadFileToBucket(bucket: string, garageId: string, file: File): Promise<string> {
  // IMPORTANT: DO NOT attempt to create the bucket at runtime on the client!
  // The bucket is guaranteed to exist via migration, and creation will fail from client due to RLS.
  const fileExt = file.name.split('.').pop();
  // Unique file name for each upload to avoid cache
  const fileName = `${garageId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  // Upload with upsert enabled
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .upload(fileName, file, { upsert: true });
  if (error) {
    console.error('Error uploading file:', error); // Improved logging
    throw error;
  }
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return urlData.publicUrl;
}
