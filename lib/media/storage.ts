import 'server-only'
import { S3Client, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type StorageProvider = { putUrl(key: string, mimeType: string): Promise<string>; getUrl(key: string): Promise<string>; head(key: string): Promise<{ size?: number; mimeType?: string; bytes?: Uint8Array }>; remove(key: string): Promise<void> }

function config() {
  const values = ['B2_ENDPOINT', 'B2_REGION', 'B2_BUCKET_NAME', 'B2_APPLICATION_KEY_ID', 'B2_APPLICATION_KEY'] as const
  const missing = values.filter((key) => !process.env[key])
  if (missing.length) throw new Error(`Storage is not configured: ${missing.join(', ')}`)
  return { endpoint: process.env.B2_ENDPOINT!, region: process.env.B2_REGION!, bucket: process.env.B2_BUCKET_NAME!, accessKeyId: process.env.B2_APPLICATION_KEY_ID!, secretAccessKey: process.env.B2_APPLICATION_KEY! }
}

function client() { const c = config(); return { c, s3: new S3Client({ endpoint: c.endpoint, region: c.region, forcePathStyle: true, credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } }) } }

export const b2Storage: StorageProvider = {
  async putUrl(key, mimeType) { const { c, s3 } = client(); return getSignedUrl(s3, new PutObjectCommand({ Bucket: c.bucket, Key: key, ContentType: mimeType }), { expiresIn: 600 }) },
  async getUrl(key) { const { c, s3 } = client(); return getSignedUrl(s3, new GetObjectCommand({ Bucket: c.bucket, Key: key }), { expiresIn: 300 }) },
  async head(key) { const { c, s3 } = client(); const result = await s3.send(new HeadObjectCommand({ Bucket: c.bucket, Key: key })); const sample = await s3.send(new GetObjectCommand({ Bucket: c.bucket, Key: key, Range: 'bytes=0-31' })); return { size: result.ContentLength, mimeType: result.ContentType, bytes: sample.Body ? await sample.Body.transformToByteArray() : undefined } },
  async remove(key) { const { c, s3 } = client(); await s3.send(new DeleteObjectCommand({ Bucket: c.bucket, Key: key })) },
}
