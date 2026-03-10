import path from 'path'
import fs from 'fs/promises'

const isS3Configured = !!(
  process.env.AWS_S3_BUCKET_NAME &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
)

/** ファイルをS3またはローカルに保存 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType = 'image/jpeg',
): Promise<{ s3Key: string; url: string }> {
  if (isS3Configured) {
    return uploadToS3(buffer, key, contentType)
  }
  return saveLocally(buffer, key)
}

async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<{ s3Key: string; url: string }> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    region: process.env.AWS_REGION ?? 'ap-northeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
  const region = process.env.AWS_REGION ?? 'ap-northeast-1'
  const bucket = process.env.AWS_S3_BUCKET_NAME!
  return {
    s3Key: key,
    url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
  }
}

async function saveLocally(
  buffer: Buffer,
  key: string,
): Promise<{ s3Key: string; url: string }> {
  const filePath = path.join(process.cwd(), 'public', 'uploads', key)
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, buffer)
  return { s3Key: key, url: `/uploads/${key}` }
}

/** 保存済みキーからアクセス可能なURLを取得 */
export function getPhotoUrl(s3Key: string): string {
  if (isS3Configured) {
    const region = process.env.AWS_REGION ?? 'ap-northeast-1'
    const bucket = process.env.AWS_S3_BUCKET_NAME!
    return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`
  }
  return `/uploads/${s3Key}`
}
