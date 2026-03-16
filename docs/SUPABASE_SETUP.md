# Supabase 연동 (현재 설정)

## 지금 연결 방식

- **Project ref**: `sqbfxjptzswyqahyfznd`
- **Anon key**: 코드에 기본값으로 설정됨
- **연결**: `server/supabase.ts`에서 Supabase 클라이언트로 `mind_maps` 테이블에 저장/조회

**추가로 넣어줄 값 없음.** 그대로 `npm run dev` 하면 위 프로젝트로 연결됩니다.

## 테이블 구조

Supabase에 만든 `mind_maps` 테이블 컬럼이 아래와 같아야 합니다.

| 컬럼       | 타입        | 비고                    |
|-----------|-------------|-------------------------|
| `id`      | uuid / text | PK, 기본값 gen_random_uuid() |
| `title`   | text        | nullable               |
| `nodes`   | jsonb       | NOT NULL               |
| `edges`   | jsonb       | NOT NULL               |
| `updated_at` | timestamptz | NOT NULL, 기본값 NOW() |

다르게 만들었다면 Supabase **SQL Editor**에서 아래로 맞추면 됩니다.

```sql
-- 기존 테이블이 있으면 컬럼만 맞추거나, 없으면 새로 생성
CREATE TABLE IF NOT EXISTS mind_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `id`를 **UUID** 타입으로 쓰면 앱에서 그대로 동작합니다. (문자열로 자동 변환됨)
- `id`를 **VARCHAR**로 쓰고 `gen_random_uuid()::text`로 두어도 됩니다.

## 다른 Supabase 프로젝트로 바꾸려면

`.env`에 다음만 넣으면 코드 기본값 대신 이 값으로 연결됩니다.

```env
SUPABASE_URL=https://다른프로젝트ref.supabase.co
SUPABASE_ANON_KEY=다른프로젝트의_anon_key
```

## RLS (Row Level Security) — 403 나올 때

API 호출 시 **403**이 나오면 Supabase에서 `mind_maps` 테이블에 대한 접근이 막힌 상태입니다.

**방법 1: RLS 끄기 (간단)**  
Supabase 대시보드 → **Table Editor** → `mind_maps` 선택 → **RLS 비활성화**.

**방법 2: anon 정책 추가 (RLS 유지)**  
Supabase **SQL Editor**에서 실행:

```sql
-- anon이 mind_maps 전체 읽기/쓰기 허용
ALTER TABLE mind_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon all on mind_maps"
ON mind_maps FOR ALL
TO anon
USING (true)
WITH CHECK (true);
```

이렇게 하면 **추가로 넣어줄 값 없이** 현재 project ref + anon key로 CRUD가 동작합니다.

---

## CRUD 테스트

서버 실행 후 터미널에서:

```bash
npm run dev   # 다른 터미널에서
node scripts/test-crud.mjs
```

- 목록(GET), 생성(POST), 조회(GET:id), 수정(PUT), 삭제(DELETE) 순서로 검증합니다.
- 실패 시: 서버가 떠 있는지, 위 RLS 설정이 적용됐는지 확인하세요.
