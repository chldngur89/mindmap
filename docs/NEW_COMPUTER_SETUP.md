# New Computer Setup

새 컴퓨터에서 이 프로젝트를 바로 다시 띄우기 위한 체크리스트입니다.

## 먼저 해야 할 것

컴퓨터를 바꾸기 전에 아래를 먼저 끝내는 것이 안전합니다.

1. 변경사항을 Git에 커밋하거나 백업합니다.
2. 중요한 마인드맵은 Supabase에 저장합니다.
3. 저장하지 않은 로컬 초안은 JSON 또는 Markdown으로 내보냅니다.
4. 현재 사용 중인 환경 변수 값을 따로 보관합니다.
5. 새 컴퓨터에서 쓸 Ollama 모델 이름을 기록합니다.

주의:

- 브라우저 로컬 초안은 다른 컴퓨터로 자동 이전되지 않습니다.
- 가장 안전한 방식은 `Supabase 저장` 또는 `내보내기`입니다.

## 새 컴퓨터 준비물

- Node.js 20+
- npm
- Git
- Ollama

## 설치 순서

### 1. 저장소 받기

```bash
git clone <repo-url>
cd mindMap
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 복사

```bash
cp .env.example .env
```

최소 확인 항목:

- `LOCAL_WORKSPACE_ROOT`
- `OLLAMA_HOST`
- `OLLAMA_MODEL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Supabase 저장/불러오기를 쓰려면 `.env`를 명시적으로 맞춰야 합니다. 값이 없으면 로컬 초안 중심으로만 사용하게 됩니다.

### 4. Ollama 준비

```bash
ollama pull exaone3.5:latest
```

대체 모델:

```bash
ollama pull llama3.1:latest
```

Ollama 서버가 꺼져 있으면:

```bash
ollama serve
```

### 5. 앱 실행

```bash
npm run dev
```

`5000` 포트 충돌 시:

```bash
npm run dev:5001
```

## 실행 후 바로 확인할 것

### 1. 앱 접속

- `http://localhost:5000`
- 또는 `http://localhost:5001`

### 2. 워크스페이스 패널 확인

- 소스 폴더 목록이 보여야 함
- 자주 쓰는 프로젝트 폴더가 보여야 함

보이지 않으면:

- `LOCAL_WORKSPACE_ROOT` 경로 확인

### 3. AI 분석 확인

1. 프로젝트 폴더 선택
2. 루트 마인드맵 자동 생성 확인
3. `주요 기능`, `사용자 가치`, `수익화 전략`, `구현 구조`, `고도화 로드맵`, `리스크/검증` 가지 확인

### 4. 문서 생성 확인

1. `README / 문서 생성` 클릭
2. 프로젝트 폴더 안에 아래 경로 확인

```text
README.md
docs/mindmap-analysis/00-overview.md
docs/mindmap-analysis/01-features.md
docs/mindmap-analysis/02-userValue.md
docs/mindmap-analysis/03-monetization.md
docs/mindmap-analysis/04-implementation.md
docs/mindmap-analysis/05-roadmap.md
docs/mindmap-analysis/06-risks.md
```

### 5. 저장 확인

- 로컬 초안 자동 저장
- Supabase 저장/불러오기

## 문제 생기면 먼저 볼 것

### 포트 충돌

```bash
npm run dev:5001
```

### Ollama 모델 없음

```bash
ollama list
ollama pull exaone3.5:latest
```

### AI 버튼이 오래 돌기만 함

- `ollama serve` 실행 여부 확인
- `OLLAMA_HOST` 확인
- 모델 설치 여부 확인

### 워크스페이스 폴더가 안 보임

- `LOCAL_WORKSPACE_ROOT` 확인
- 새 컴퓨터의 실제 코드 저장 위치 확인

### 저장이 안 됨

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- Supabase 정책

## 최소 스모크 테스트

```bash
npm run check
npm run build
```

그 다음 실제로 아래만 확인하면 됩니다.

1. 폴더 선택
2. AI 분석 맵 생성
3. README / 문서 생성
4. 노드 AI 확장
5. 저장 또는 내보내기
