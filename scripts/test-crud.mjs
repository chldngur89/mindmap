#!/usr/bin/env node
/**
 * CRUD 테스트: 서버가 떠 있어야 합니다.
 *   npm run dev
 *   (다른 터미널) npm run test:crud
 * 포트가 5000이 아니면: BASE=http://localhost:5001 npm run test:crud
 * (redirect: 'manual' 로 POST 응답이 GET 목록으로 바뀌는 것 방지)
 */
const BASE = process.env.BASE || `http://localhost:${process.env.PORT || 5000}`;

async function request(method, path, body) {
  const url = `${BASE}${path}`;
  const opt = {
    method,
    headers: { "Content-Type": "application/json" },
    redirect: "manual", // POST가 리다이렉트되면 GET으로 바뀌어 목록이 올 수 있음
  };
  if (body) opt.body = JSON.stringify(body);
  const res = await fetch(url, opt);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log("=== Mind Map CRUD 테스트 ===");
  console.log("요청 URL:", BASE, "\n");

  // 1. List (빈 목록이어도 됨)
  let r = await request("GET", "/api/maps");
  console.log("1. GET /api/maps (목록):", r.status, r.ok ? "OK" : "FAIL", r.data?.length ?? r.data);
  if (!r.ok) {
    console.log("   실패 시: 1) npm run dev 로 서버 실행 2) Supabase RLS 끄기 또는 anon 정책 추가");
    if (r.status === 403) console.log("   403 = Supabase RLS 정책 확인 (anon 허용 또는 RLS 비활성화)");
    if (r.data?.message) console.log("   서버 메시지:", r.data.message);
    process.exit(1);
  }

  // 2. Create
  const payload = {
    title: "CRUD 테스트 맵",
    nodes: [{ id: "1", type: "custom", position: { x: 0, y: 0 }, data: { label: "테스트" } }],
    edges: [],
  };
  r = await request("POST", "/api/maps", payload);
  console.log("2. POST /api/maps (생성):", r.status, r.ok ? "OK" : "FAIL");
  if (!r.ok) {
    console.log("   응답:", r.data);
    if (r.status === 500 && r.data?.message) {
      if (/RLS|SELECT|returned no row/i.test(r.data.message))
        console.log("   → Supabase RLS: anon 에 INSERT + SELECT 정책 추가 필요. docs/SUPABASE_SETUP.md 참고.");
    }
    process.exit(1);
  }
  const id = r.data?.id;
  if (!id) {
    console.log("   id 없음. 응답:", JSON.stringify(r.data));
    console.log("   → 1) 서버 재시작(npm run dev) 후 다시 실행  2) Supabase RLS에서 anon이 INSERT 후 SELECT 하도록 정책 추가");
    process.exit(1);
  }
  console.log("   생성된 id:", id);

  // 3. Read
  r = await request("GET", `/api/maps/${id}`);
  console.log("3. GET /api/maps/:id (조회):", r.status, r.ok ? "OK" : "FAIL", r.data?.title);

  // 4. Update
  r = await request("PUT", `/api/maps/${id}`, {
    title: "CRUD 테스트 맵 (수정됨)",
    nodes: payload.nodes,
    edges: payload.edges,
  });
  console.log("4. PUT /api/maps/:id (수정):", r.status, r.ok ? "OK" : "FAIL", r.data?.title);

  // 5. Delete
  r = await request("DELETE", `/api/maps/${id}`);
  console.log("5. DELETE /api/maps/:id (삭제):", r.status, r.ok || r.status === 204 ? "OK" : "FAIL");

  // 6. Read again (404 예상)
  r = await request("GET", `/api/maps/${id}`);
  console.log("6. GET /api/maps/:id (삭제 후):", r.status, r.status === 404 ? "OK (없음)" : "FAIL");

  console.log("\n=== CRUD 테스트 완료 ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
