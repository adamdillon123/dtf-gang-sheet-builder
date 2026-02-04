import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = process.env.S3_BUCKET ?? '';

const client = new S3Client({
  region: process.env.S3_REGION ?? 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials:
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
        }
      : undefined,
  forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE)
});

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  if (!bucket) {
    throw new Error('S3_BUCKET is not configured');
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  if (!bucket) {
    throw new Error('S3_BUCKET is not configured');
  }
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

export async function getObjectBuffer(key: string) {
  if (!bucket) {
    throw new Error('S3_BUCKET is not configured');
  }
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await client.send(command);
  const stream = response.Body;
  if (!stream) {
    throw new Error('Missing S3 body');
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
