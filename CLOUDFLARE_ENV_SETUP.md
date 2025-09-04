# Cloudflare Pages 환경 변수 설정 완벽 가이드

## ⚠️ 중요: 환경 변수가 인식되지 않는 문제 해결

### 현재 상황
`curl https://survey.n1b.kr/api/notion?path=health` 결과:
```json
{
  "hasNotionKey": false,
  "hasParentId": false,
  "hasVersion": false
}
```

이는 **환경 변수가 Functions에 전달되지 않고 있다는 의미**입니다.

## 📋 체크리스트 (순서대로 진행)

### 1. Cloudflare 대시보드에서 환경 변수 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 접속
2. **Workers & Pages** 클릭
3. **notion-survey-ai** 프로젝트 선택
4. **Settings** 탭 클릭
5. **Environment variables** 섹션으로 이동

### 2. 환경 변수 추가 (Production & Preview 모두)

#### Production 탭에서:
| Variable name | Value | Encrypt |
|---------------|-------|---------|
| `NOTION_API_KEY` | `secret_...` (Notion Integration Token) | ✅ |
| `NOTION_PARENT_PAGE_ID` | `26344b48ad1780e19a39c787e5f1f7c4` | ❌ |
| `NOTION_VERSION` | `2022-06-28` | ❌ |

#### Preview 탭으로 전환 후 동일하게 추가:
- **중요**: Production과 Preview 환경 **모두** 설정해야 합니다!
- 변수명은 **대소문자를 정확히** 지켜야 합니다

### 3. 환경 변수 저장 및 재배포

1. **Save** 버튼 클릭
2. **Deployments** 탭으로 이동
3. 최신 배포의 **⋮** 메뉴 클릭
4. **Retry deployment** 선택
5. 배포 완료 대기 (1-2분)

### 4. 환경 변수 확인

```bash
# 헬스체크
curl https://survey.n1b.kr/api/notion?path=health | python3 -m json.tool

# 예상 결과:
{
  "status": "ok",
  "environment": {
    "hasNotionKey": true,    # ✅
    "hasParentId": true,      # ✅
    "hasVersion": true        # ✅
  }
}
```

## 🔧 여전히 안 될 경우

### A. 변수명 확인
Functions 코드에서 사용하는 정확한 변수명:
- `NOTION_API_KEY` (not notion_api_key, not NOTION-API-KEY)
- `NOTION_PARENT_PAGE_ID` (not NOTION_PAGE_ID)
- `NOTION_VERSION` (optional, defaults to 2022-06-28)

### B. Secrets vs Environment Variables
- Cloudflare Pages에서 **Add variable** 클릭 시:
  - Type: **Secret** 선택 (API 키용)
  - 또는 **Plain text** 선택 (일반 설정용)

### C. 배포 환경 확인
```bash
# 현재 배포가 Production인지 Preview인지 확인
# Cloudflare 대시보드 > Deployments에서 확인
# survey.n1b.kr은 Production 환경을 사용해야 함
```

### D. Functions 파일 확인
```bash
# functions/api/notion.js 파일이 존재하는지 확인
ls -la functions/api/
```

## 📊 디버깅용 추가 정보

환경 변수 디버깅을 위해 health 엔드포인트가 다음 정보를 제공합니다:
- `envVarCount`: 전체 환경 변수 개수
- `envKeys`: 키 이름 목록 (secret 제외)

```bash
curl https://survey.n1b.kr/api/notion?path=health
```

`envVarCount`가 0이면 환경 변수가 전혀 전달되지 않는 것입니다.

## 🚨 긴급 해결책

만약 위 방법이 모두 실패한다면:

1. **새 배포 트리거**
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push origin main
   ```

2. **프로젝트 재생성** (최후의 수단)
   - Cloudflare Pages에서 프로젝트 삭제
   - GitHub 연동으로 다시 생성
   - 환경 변수 재설정

## 📞 지원

- [Cloudflare Community](https://community.cloudflare.com)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/platform/functions/bindings/#environment-variables)