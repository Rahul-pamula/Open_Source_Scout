---
name: scout-api-contract
description: Prevents changing public API shapes without updating docs.
trigger: backend_api
---

# Scout API Contract Protocol

When modifying backend APIs or Edge Functions, you are modifying the "contract" between systems.

1. **Never break existing clients:** If you rename a field, keep the old field as deprecated (unless explicitly instructed to break it).
2. **Types & Docs:** If you modify a database schema or Edge Function payload, you MUST update the corresponding frontend TypeScript types (`apps/web/src/types.ts` or `supabase/functions/_shared/types.ts`).
3. **Response Validation:** Ensure API responses continue to return expected standard HTTP codes (e.g., 400 for bad input, 500 for internal errors).
