import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 vyžaduje S3 client inicializáciu s tvojimi zadanými Credentials
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!, // napr. https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function getSecureAudioUrl(fileName: string): Promise<string> {
  if (!fileName) return '';

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!, // napr. "mindbanger-audio"
    Key: fileName, // napr. "day-1-sk.mp3"
  });

  // Tento odkaz bude platiť iba 1 hodinu (3600 sekúnd)
  // Keď používateľ zavrie a otvorí appku o 2 hodiny, vygeneruje sa nový odkaz platiaci ďalšiu hodinu.
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  return signedUrl;
}
