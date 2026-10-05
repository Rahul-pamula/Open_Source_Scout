---
name: scout-db-migration
description: Requires backward compatibility checks before altering schema.
trigger: database
---

# Scout DB Migration Protocol

When creating Supabase SQL migrations:

1. **Never mutate old migrations:** If a table exists, create a NEW migration file with a timestamp (e.g., `YYYYMMDDHHMMSS_description.sql`).
2. **Backward Compatibility:** Dropping columns or changing types can break active clients. Ensure safe defaults (`DEFAULT`) and handle data casting (`USING`).
3. **RLS (Row Level Security):** Any new table MUST have `ENABLE ROW LEVEL SECURITY` and explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
