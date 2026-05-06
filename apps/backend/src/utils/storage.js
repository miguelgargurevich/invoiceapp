const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

let r2Client = null;
let supabaseClient = null;

function getStorageProvider() {
  return (process.env.STORAGE_PROVIDER || 'supabase').toLowerCase();
}

function isR2Provider() {
  return getStorageProvider() === 'r2';
}

function getR2Client() {
  if (!r2Client) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required for R2 storage');
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: String(process.env.R2_PATH_STYLE).toLowerCase() === 'true',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return r2Client;
}

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Supabase storage');
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }

  return supabaseClient;
}

function getBucketName() {
  return isR2Provider() ? process.env.R2_BUCKET : 'logos';
}

function getPublicUrl(key) {
  if (isR2Provider()) {
    const publicBase = process.env.R2_PUBLIC_URL;
    if (!publicBase) {
      throw new Error('R2_PUBLIC_URL is required to build public file URLs');
    }

    return `${publicBase.replace(/\/$/, '')}/${key}`;
  }

  const { data } = getSupabaseClient().storage.from(getBucketName()).getPublicUrl(key);
  return data.publicUrl;
}

async function uploadFile(key, body, options = {}) {
  const { contentType = 'application/octet-stream', upsert = true } = options;

  if (isR2Provider()) {
    await getR2Client().send(new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }));

    return { publicUrl: getPublicUrl(key) };
  }

  const { error } = await getSupabaseClient()
    .storage
    .from(getBucketName())
    .upload(key, body, { contentType, upsert });

  if (error) {
    throw new Error(error.message || 'Supabase upload failed');
  }

  return { publicUrl: getPublicUrl(key) };
}

async function deleteFile(key) {
  if (isR2Provider()) {
    await getR2Client().send(new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }));
    return;
  }

  const { error } = await getSupabaseClient().storage.from(getBucketName()).remove([key]);
  if (error) {
    throw new Error(error.message || 'Supabase delete failed');
  }
}

function extractStorageKeyFromUrl(url) {
  if (!url) return null;

  if (isR2Provider()) {
    const publicBase = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    if (publicBase && url.startsWith(`${publicBase}/`)) {
      return url.slice(publicBase.length + 1);
    }
  }

  const supabaseMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (supabaseMatch) {
    return supabaseMatch[1];
  }

  return null;
}

module.exports = {
  getStorageProvider,
  uploadFile,
  deleteFile,
  getPublicUrl,
  extractStorageKeyFromUrl,
};
