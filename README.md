# MindMap

로컬 소스 폴더를 기준으로 아이디어를 확장하고, AI로 프로젝트 구조를 분석하며, 필요한 경우 README와 기능 문서까지 생성하는 로컬 우선 마인드맵 앱입니다.

## 핵심 기능

- 로컬 소스 폴더 브라우징
- 선택한 폴더를 기준으로 AI 프로젝트 분석 마인드맵 생성
- 노드 편집, 추가, 삭제, 드래그, 연결
- 선택 노드 단위 AI 확장
- README 자동 생성
- 기능별 분석 문서 자동 생성
- 로컬 초안 자동 저장
- Supabase 기반 저장/불러오기/삭제
- JSON / Markdown 내보내기
- 템플릿 기반 새 맵 시작

## 현재 사용 방식

이 프로젝트는 지금 기준으로 `로컬 실행`이 가장 안정적입니다.

- 로컬에서는 `Ollama`를 붙여서 AI 분석, 노드 확장, README/문서 생성을 바로 사용할 수 있습니다.
- Vercel에서는 저장 기능은 가능하지만, `OLLAMA_HOST`가 로컬이면 AI 기능은 동작하지 않습니다.
- 소스 폴더 분석 기능은 로컬 개발 환경에서만 사용할 수 있습니다.

## 추천 흐름

1. 앱 실행
2. 왼쪽 패널에서 분석할 폴더 선택
3. AI가 프로젝트 개요 맵 생성
4. 필요하면 `README / 문서 생성`
5. 노드를 수정하거나 `AI 확장`
6. 중요한 맵은 Supabase 저장 또는 JSON/Markdown 내보내기

## 빠른 시작

### 1. 준비물

- Node.js 20+
- npm
- Ollama
- 선택 사항: Supabase 프로젝트

### 2. 설치

```bash
npm install
cp .env.example .env
```

### 3. Ollama 준비

권장 모델:

```bash
ollama pull exaone3.5:latest
```

대체 가능:

```bash
ollama pull llama3.1:latest
```

모델을 지정하지 않으면 서버가 아래 순서로 자동 선택합니다.

1. `exaone3.5`
2. `llama3.1`
3. `qwen2.5-coder`
4. 설치된 첫 번째 모델

### 4. 실행

기본:

```bash
npm run dev
```

`5000` 포트 충돌 시:

```bash
npm run dev:5001
```

또는

```bash
npm run dev:5050
```

브라우저:

- `http://localhost:5000`
- `http://localhost:5001`
- `http://localhost:5050`

## 환경 변수

`.env.example`을 기준으로 필요한 값만 채우면 됩니다.

### 로컬에서 자주 쓰는 값

- `PORT`: 서버 포트
- `LOCAL_WORKSPACE_ROOT`: 로컬 소스 폴더 루트
- `OLLAMA_HOST`: 기본값 `http://localhost:11434`
- `OLLAMA_MODEL`: 예: `exaone3.5:latest`

### Supabase 관련

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase 저장/불러오기를 쓰려면 `.env`에 Supabase 값을 명시적으로 넣어야 합니다. 값이 없으면 앱은 로컬 초안 중심으로 사용할 수 있습니다.

## 새 컴퓨터로 옮길 때 중요한 점

브라우저 로컬 초안은 자동으로 다른 컴퓨터로 이동되지 않습니다.

컴퓨터를 바꾸기 전에 아래 중 하나를 꼭 해두는 것이 좋습니다.

- 중요한 맵을 Supabase에 저장
- JSON 또는 Markdown으로 내보내기

자세한 이전 절차는 [docs/NEW_COMPUTER_SETUP.md](/Users/wh.choi/Desktop/Code/mindMap/docs/NEW_COMPUTER_SETUP.md)에 정리해뒀습니다.

## 자주 쓰는 기능

### 로컬 폴더 분석

- 폴더 선택
- 프로젝트 구조 기반 루트 맵 자동 생성
- 주요 기능 / 사용자 가치 / 수익화 전략 / 구현 구조 / 고도화 로드맵 / 리스크/검증 가지 자동 생성

### README / 문서 생성

- `README.md`가 없으면 자동 생성
- 있으면 덮어쓰지 않음
- `docs/mindmap-analysis/` 아래에 분석 문서 생성

생성 파일 예시:

- `docs/mindmap-analysis/00-overview.md`
- `docs/mindmap-analysis/01-features.md`
- `docs/mindmap-analysis/02-userValue.md`
- `docs/mindmap-analysis/03-monetization.md`
- `docs/mindmap-analysis/04-implementation.md`
- `docs/mindmap-analysis/05-roadmap.md`
- `docs/mindmap-analysis/06-risks.md`

### 저장 방식

- 로컬 초안 자동 저장
- Supabase 저장
- JSON 내보내기
- Markdown 내보내기

## 자주 쓰는 스크립트

```bash
npm run dev
npm run dev:5001
npm run dev:5050
npm run check
npm run build
npm run test:crud
```

## 검증

배포 또는 이관 전에는 최소한 아래 두 개를 확인하면 됩니다.

```bash
npm run check
npm run build
```

로컬 AI 기능까지 확인하려면:

1. 폴더 선택
2. AI 분석 맵 생성
3. `README / 문서 생성`
4. 노드 `AI 확장`
5. 저장 또는 내보내기

## 문서

- [docs/NEW_COMPUTER_SETUP.md](/Users/wh.choi/Desktop/Code/mindMap/docs/NEW_COMPUTER_SETUP.md)
- [docs/NEXT_STEPS.md](/Users/wh.choi/Desktop/Code/mindMap/docs/NEXT_STEPS.md)
- [docs/SUPABASE_SETUP.md](/Users/wh.choi/Desktop/Code/mindMap/docs/SUPABASE_SETUP.md)
- [docs/VERCEL_배포.md](/Users/wh.choi/Desktop/Code/mindMap/docs/VERCEL_배포.md)
