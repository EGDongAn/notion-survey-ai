# Cloudflare Pages 설정 가이드

## 환경 변수 설정

Cloudflare Pages 대시보드에서 다음 환경 변수를 설정해야 합니다:

1. **Cloudflare 대시보드** 접속
2. **Workers & Pages** → 프로젝트 선택
3. **Settings** → **Environment variables** 탭
4. **Production**과 **Preview** 환경 모두에 다음 변수들 추가:

### Functions 환경 변수 (서버사이드)
```
NOTION_API_KEY = secret_xxx...  # Notion Integration 키
NOTION_PARENT_PAGE_ID = 26344b48ad1780e19a39c787e5f1f7c4  # 부모 페이지 ID (하이픈 포함 가능)
NOTION_VERSION = 2022-06-28  # Notion API 버전
```

### 빌드 환경 변수 (프론트엔드)
```
VITE_GEMINI_API_KEY = xxx...  # Gemini API 키
VITE_GOOGLE_CLIENT_ID = xxx...  # Google OAuth Client ID
```

**중요**: 
- 환경 변수 추가 후 **재배포**가 필요합니다
- Production과 Preview 환경 모두에 설정해야 합니다
- 변수명은 대소문자를 정확히 구분합니다

## 배포 방법

### 1. GitHub 연동 자동 배포 (권장)
- Cloudflare Pages에서 GitHub 레포지토리 연결
- main 브랜치에 push하면 자동 배포

### 2. 수동 배포
```bash
# 빌드
npm run build

# Cloudflare Pages에 배포
npm run deploy
```

### 3. 로컬 테스트
```bash
# 빌드 먼저
npm run build

# Pages Functions 로컬 테스트
npm run pages:dev
```

## 도메인 설정

1. **Custom domains** 탭에서 도메인 추가
2. `survey.n1b.kr` 추가
3. DNS 설정:
   - Type: CNAME
   - Name: survey
   - Target: notion-survey-ai.pages.dev
   - Proxy: ON (주황색 구름)

## 트러블슈팅

### 405 Method Not Allowed 에러
- Functions 폴더 구조 확인: `/functions/api/notion.ts`
- `_routes.json` 파일 확인

### 환경 변수 인식 안됨
- Production과 Preview 환경 모두에 설정되었는지 확인
- 재배포 필요할 수 있음

### CORS 에러
- Functions 파일의 `corsHeaders` 설정 확인
- `onRequestOptions` 핸들러 구현 확인