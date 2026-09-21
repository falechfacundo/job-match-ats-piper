import { createClient } from "@supabase/supabase-js";

const CV_BUCKET = "cv-generations";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase storage is not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

/** Uploads a generated CV PDF and returns a signed download URL (private bucket). */
export async function uploadGeneratedPdf(params: {
  userId: string;
  generationId: string;
  pdf: Buffer;
}): Promise<string> {
  const client = getServiceClient();
  const objectPath = `${params.userId}/${params.generationId}.pdf`;

  const { error: uploadError } = await client.storage.from(CV_BUCKET).upload(objectPath, params.pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) {
    throw new Error(`Failed to upload generated PDF: ${uploadError.message}`);
  }

  const { data, error: signError } = await client.storage
    .from(CV_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);
  if (signError || !data) {
    throw new Error(`Failed to sign PDF URL: ${signError?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}
