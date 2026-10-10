# Material Signed URL Function — `supabase/functions/get-material-url/`

This directory contains the Edge Function for verifying user authorization and generating short-lived signed URLs for documents stored in private Supabase Storage buckets.

---

## 📁 Directory Files

- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/get-material-url/index.ts): Deno serverless function entrypoint that handles `OPTIONS` CORS preflight, extracts the caller's JWT token, validates that the user is either the class teacher or an enrolled student, and generates a temporary signed download URL (1-hour expiry / 3600 seconds) via `adminSupabase.storage`.

---

## 💡 Role in the Application

Protects private curriculum files from public exposure while allowing authorized students and teachers to preview PDFs, images, and assignments inside the application.

For authorization verification flows, signed URL generation rules, and error handling, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/get-material-url/code.ARCH.md).
