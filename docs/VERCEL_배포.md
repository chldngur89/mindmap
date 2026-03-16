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

- **Key**: 위 표의 Name 그대로 입력 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
- **Value**: Supabase에서 복사한 값 붙여넣기.
- **Environment**: Production, Preview, Development 전부 체크해 두면 편합니다.

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

- **코드 기본값**: 이 프로젝트 코드에는 Supabase URL·anon key가 기본값으로 들어가 있어서, **로컬**에서는 환경 변수 없이도 그 프로젝트로 연결됩니다. **Vercel**에서는 보안상 환경 변수로 넣어 주는 방식을 쓰는 것이 좋습니다.
- **다른 Supabase 프로젝트**를 쓰려면, 그 프로젝트의 **Project URL**과 **anon public**을 Vercel 환경 변수에 넣으면 됩니다.
- **AI 생성(Organize Map)**: Vercel 서버에서는 Ollama를 쓸 수 없어 해당 기능은 동작하지 않고, **저장/불러오기/삭제만** Supabase와 연동됩니다.

정리하면, **Vercel에 배포한 뒤 Supabase 연동은 “Vercel 환경 변수에 URL이랑 anon key 넣고, 한 번 재배포”** 하면 됩니다.
