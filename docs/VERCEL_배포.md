# Vercel 배포 가이드

## 1. 배포 후 Supabase 연동은 직접 해야 함

Vercel에 배포만 하면 **Supabase는 자동으로 연결되지 않습니다.**  
Vercel 프로젝트에 **환경 변수**를 넣어줘야 배포된 앱이 당신의 Supabase와 연동됩니다. 아래 순서대로 하면 됩니다.

---

## 2. Supabase에서 넣을 값 복사하기

1. [Supabase 대시보드](https://supabase.com/dashboard) 로그인 후 **사용하는 프로젝트** 선택.
2. 왼쪽 아래 **⚙️ Project Settings** 클릭.
3. **API** 메뉴로 이동.
4. 아래 두 값을 복사해 둡니다.
   - **Project URL**  
     예: `https://sqbfxjptzswyqahyfznd.supabase.co`
   - **anon public** (키 한 줄 전체)  
     `Project API keys` → **anon** 옆 **Reveal** → 표시된 긴 문자열 복사.

---

## 3. Vercel에 환경 변수 넣기

1. [Vercel 대시보드](https://vercel.com/dashboard) → **해당 프로젝트** 클릭.
2. 상단 **Settings** 탭 클릭.
3. 왼쪽 메뉴에서 **Environment Variables** 클릭.
4. 아래처럼 **두 개** 추가합니다.

| Name (이름)        | Value (값)                          | 적용 환경      |
|--------------------|-------------------------------------|----------------|
| `SUPABASE_URL`     | 2번에서 복사한 **Project URL**      | Production 등 전부 체크 |
| `SUPABASE_ANON_KEY`| 2번에서 복사한 **anon public** 키   | Production 등 전부 체크 |

- **Key**: 반드시 아래와 **완전히 동일**하게 입력 (대소문자, 밑줄만 사용).
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- **Value**: Supabase에서 복사한 값 그대로 붙여넣기. **앞뒤 공백이나 줄바꿈 없이**.
- **Environment**: Production, Preview, Development 전부 체크.

**참고**: Vercel에서는 코드 기본값을 쓰지 않고 **환경 변수만** 사용합니다. 두 개 다 넣어야 연동됩니다.

5. 각각 **Save** 클릭.

---

## 4. 환경 변수 반영을 위해 다시 배포하기

환경 변수를 **추가/수정한 뒤에는 한 번 더 배포**해야 적용됩니다.

- **방법 1**: Vercel 프로젝트 페이지에서 **Deployments** 탭 → 맨 위 배포 오른쪽 **⋯** → **Redeploy**.
- **방법 2**: 아무 커밋이나 푸시하면 자동 배포되고, 그때 새 환경 변수가 적용됩니다.

재배포가 끝나면 배포된 URL에서 **저장/불러오기/삭제**가 당신의 Supabase와 연동된 상태로 동작합니다.

---

## 5. 배포 절차 요약 (처음부터)

1. [vercel.com](https://vercel.com) 로그인 → **Add New** → **Project** → 이 저장소 연결 후 Import.
2. **위 2~4번**대로 Supabase에서 URL·anon key 복사 → Vercel **Settings → Environment Variables**에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 추가 → 필요하면 **Redeploy**.
3. 배포된 사이트에서 맵 만들기·저장·목록·삭제가 되는지 확인.

---

## 6. 참고

- **코드 기본값**: **로컬**에서는 환경 변수 없이도 Supabase 기본값으로 연결됩니다. **Vercel**에서는 기본값을 쓰지 않고 **반드시 환경 변수** `SUPABASE_URL`, `SUPABASE_ANON_KEY` 두 개를 넣어야 합니다.
- **다른 Supabase 프로젝트**를 쓰려면, 그 프로젝트의 **Project URL**과 **anon public**을 Vercel 환경 변수에 넣으면 됩니다.
- **AI 생성(Organize Map)**: Vercel 서버에서는 Ollama를 쓸 수 없어 해당 기능은 동작하지 않고, **저장/불러오기/삭제만** Supabase와 연동됩니다.

정리하면, **Vercel에 배포한 뒤 Supabase 연동은 “Vercel 환경 변수에 URL이랑 anon key 넣고, 한 번 재배포”** 하면 됩니다.

---

## 7. "목록을 불러오지 못했습니다" / 500 에러가 날 때

배포 후 목록이 안 뜨고 500이 나오면 아래 순서대로 확인하세요.

### 1) 화면에 나오는 에러 메시지 확인

에러 박스에 **서버에서 내려준 메시지**가 함께 표시됩니다. 예:

- `SUPABASE_URL and SUPABASE_ANON_KEY must be set in Vercel...` → 환경 변수가 **없거나 이름이 다름**. 7-3으로 가서 이름을 `SUPABASE_URL`, `SUPABASE_ANON_KEY`로 정확히 맞추고 **Redeploy**.
- `new row violates row-level security policy` → **Supabase RLS** 때문에 차단된 것. 7-2로 이동.
- `JWT expired` 또는 `Invalid API key` → **SUPABASE_ANON_KEY**가 잘못됨. 7-3으로.
- `Failed to fetch` / `fetch failed` → 네트워크/URL 문제. **SUPABASE_URL** 확인.

### 2) Supabase RLS 확인

1. Supabase 대시보드 → **Table Editor** → **mind_maps**
2. **Policies**에서 anon이 **SELECT** 할 수 있는 정책이 있는지 확인.
3. 없거나 막혀 있으면 **SQL Editor**에서 아래 실행:

```sql
CREATE POLICY "Allow anon all on mind_maps"
ON mind_maps FOR ALL TO anon
USING (true) WITH CHECK (true);
```

(이미 있다면 수정할 필요 없음.)

### 3) Vercel 환경 변수 확인

1. Vercel 프로젝트 → **Settings** → **Environment Variables**
2. **SUPABASE_URL**: `https://프로젝트ref.supabase.co` 형태, 공백/줄바꿈 없이.
3. **SUPABASE_ANON_KEY**: Supabase **Project Settings → API** 의 **anon public** 키 전체를 그대로 복사.
4. 수정했다면 **Redeploy** 한 번 더 실행.

### 4) Vercel 함수 로그 확인

1. Vercel 프로젝트 → **Deployments** → 최신 배포 클릭
2. **Functions** 탭에서 `/api/maps` 요청 선택
3. **Logs**에 찍힌 `List maps error:` 메시지로 원인 확인.

위를 다 해도 해결되지 않으면, 화면에 보이는 **에러 메시지 전체**와 **Vercel Functions 로그** 내용을 알려주면 다음 원인을 짚을 수 있습니다.
