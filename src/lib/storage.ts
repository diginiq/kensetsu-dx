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

/** DBの fileUrl が S3 オブジェクトキーか（ローカルは / で始まる） */
export function isMessageAttachmentS3Key(stored: string | null | undefined): boolean {
  if (!stored) return false
  return isS3Configured && !stored.startsWith('/') && !stored.startsWith('http')
}

/** プライベートバケット用の読み取り署名付きURL */
export async function getPresignedReadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const client = new S3Client({
    region: process.env.AWS_REGION ?? 'ap-northeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

/** メッセージ添付の表示用URL（ローカルパス・公開URLはそのまま、S3キーは署名付き） */
export async function resolveMessageAttachmentUrl(
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null
  if (stored.startsWith('/') || stored.startsWith('http')) return stored
  if (isS3Configured) return getPresignedReadUrl(stored)
  return `/uploads/${stored}`
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

/** ファイルを削除 */
export async function deleteFile(key: string): Promise<void> {
  if (isS3Configured) {
    try {
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
      const client = new S3Client({
        region: process.env.AWS_REGION ?? 'ap-northeast-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })
      await client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: key }))
    } catch { /* ignore */ }
  } else {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      await fs.unlink(path.join(process.cwd(), 'public', 'uploads', key))
    } catch { /* ignore if not found */ }
  }
}

/** 写真のバッファ（バイナリデータ）を取得する（PDF/ZIP生成用） */
export async function getPhotoBuffer(key: string): Promise<Buffer> {
  if (isS3Configured) {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-northeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    })
    const response = await client.send(command)
    const arrayBuffer = await response.Body?.transformToByteArray()
    if (!arrayBuffer) throw new Error('Failed to load image from S3')
    return Buffer.from(arrayBuffer)
  }
  
  const filePath = path.join(process.cwd(), 'public', 'uploads', key)
  return fs.readFile(filePath)
}
