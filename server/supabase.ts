import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined = undefined;
const SUPABASE_TIMEOUT_MS = 8000;

export interface SupabaseEnvStatus {
  hasUrl: boolean;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  usingServiceRole: boolean;
}

function readSupabaseConfig() {
  const isVercel = !!process.env.VERCEL;
  const url = isVercel
    ? process.env.SUPABASE_URL
    : (process.env.SUPABASE_URL ?? "https://sqbfxjptzswyqahyfznd.supabase.co");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = isVercel
    ? process.env.SUPABASE_ANON_KEY
    : (process.env.SUPABASE_ANON_KEY ??
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxYmZ4anB0enN3eXFhaHlmem5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDYyMTksImV4cCI6MjA4OTE4MjIxOX0.KSdytoa1TXkhM69FqlI5XP17yDUYbbgG6c0jYV6nArU");
  const key = serviceRoleKey ?? anonKey;

  return {
    url,
    key,
    status: {
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
      hasServiceRoleKey: !!serviceRoleKey,
      usingServiceRole: !!serviceRoleKey,
    } satisfies SupabaseEnvStatus,
  };
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  return readSupabaseConfig().status;
}

/**
 * Supabase 클라이언트를 요청 시점(런타임)에 생성합니다.
 * Vercel에서는 모듈 로드 시점에 env가 비어 있을 수 있으므로,
 * API 핸들러가 호출될 때 process.env를 읽도록 합니다.
 */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const { url, key } = readSupabaseConfig();

  const hasEnv = url && key;
  cached = hasEnv
    ? createClient(url.trim(), key.trim(), {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: async (input, init) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

            try {
              return await fetch(input, {
                ...init,
                signal: controller.signal,
              });
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") {
                throw new Error(
                  `Supabase request timed out after ${SUPABASE_TIMEOUT_MS / 1000}s. Check SUPABASE_URL and network access from Vercel.`,
                );
              }
              throw error;
            } finally {
              clearTimeout(timeout);
            }
          },
        },
      })
    : null;
  return cached;
}
