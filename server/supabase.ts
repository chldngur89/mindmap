import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined = undefined;

/**
 * Supabase 클라이언트를 요청 시점(런타임)에 생성합니다.
 * Vercel에서는 모듈 로드 시점에 env가 비어 있을 수 있으므로,
 * API 핸들러가 호출될 때 process.env를 읽도록 합니다.
 */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const isVercel = !!process.env.VERCEL;
  const url = isVercel
    ? process.env.SUPABASE_URL
    : (process.env.SUPABASE_URL ?? "https://sqbfxjptzswyqahyfznd.supabase.co");
  const key = isVercel
    ? process.env.SUPABASE_ANON_KEY
    : (process.env.SUPABASE_ANON_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYmZ4anB0enN3eXFhaHlmem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDYyMTksImV4cCI6MjA4OTE4MjIxOX0.KSdytoa1TXkhM69FqlI5XP17yDUYbbgG6c0jYV6nArU");

  const hasEnv = url && key;
  cached = hasEnv ? createClient(url.trim(), key.trim()) : null;
  return cached;
}

