import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://sqbfxjptzswyqahyfznd.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYmZ4anB0enN3eXFhaHlmem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDYyMTksImV4cCI6MjA4OTE4MjIxOX0.KSdytoa1TXkhM69FqlI5XP17yDUYbbgG6c0jYV6nArU";

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
