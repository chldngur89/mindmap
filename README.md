# MindMap

React + Vite + Express 기반 마인드맵 앱. Supabase 저장, Vercel 배포 가능.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5000

- **5000 포트 사용 중** (macOS AirPlay 등): `npm run dev:5001` 또는 `npm run dev:5050` 후 해당 주소(예: http://localhost:5050)로 접속. 다른 포트: `PORT=원하는포트 npm run dev`

## 문서

- **Supabase 연동**: `docs/SUPABASE_SETUP.md`
- **Vercel 배포**: `docs/VERCEL_배포.md`
- **CRUD 테스트**: `npm run test:crud` (서버 실행 후 다른 터미널에서)
