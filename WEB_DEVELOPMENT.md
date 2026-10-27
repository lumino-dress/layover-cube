# LUMINO 개인 홈페이지 개발

## 범위와 기준

lumino-dress/layover-cube의 로컬 origin/main (455f397a1e005b85a050c700ae79b77388db0c20)을 기준으로 lumino-web-dev를 만들었습니다. 원격 최신화는 수행하지 않았습니다.
test-environment의 0479149 커밋은 그대로 보존합니다. 기존 공용 관리자 코드(worker.js, admin 파일, brand-config.js, wrangler.admin.jsonc)는 변경하지 않습니다.

## 연결

개인 홈페이지는 web-worker.js만 실행합니다. 공용 관리자 로그인/저장 코드를 가져오지 않습니다.
/admin 접속은 https://layover-admin.progen-web.workers.dev/admin 으로 이동합니다. 실제 관리자 로그인·저장은 기존 공용 서비스에서 운영자가 수행합니다.
개인 홈페이지의 /api/admin 요청은 거부합니다. 그 밖의 쓰기 메서드도 거부합니다.

외부 요청은 https://layover-cube.progen-web.workers.dev 의 다음 경로만 허용합니다.
- /products.json
- /portfolio.json
- /images/products/ 아래 JPG/JPEG/PNG/WebP/GIF/AVIF
- /images/portfolio/ 아래 같은 형식

GET/HEAD만 전송하고 쿠키·인증 헤더·사용자 쿼리를 전달하지 않으며 리다이렉트를 따라가지 않습니다. 원본 주소는 코드의 고정 상수이며 임의의 URL 프록시는 제공하지 않습니다.
상품과 포트폴리오의 기존 상대 이미지 경로는 개인 Worker가 원본으로 연결합니다. 원본의 절대 상품/포트폴리오 이미지 주소도 응답에서 개인 사이트 경유로 변환합니다. 다른 서버 이미지·비표준 경로·영상은 기존 표시 규칙을 따르므로 실제 콘텐츠 점검이 필요합니다.
디자인·갤러리·컬렉션 자산은 로컬 파일로 제공합니다. 상품·포트폴리오 파일 자체는 바꾸지 않습니다.

## 갱신과 장애

상품은 프로젠 공개 홈페이지 배포가 완료되어야 갱신됩니다. Fork 연결이나 개인 홈페이지 배포가 상품 동기화를 대신하지 않습니다.
포트폴리오 역시 공개 원본이 제공하는 버전을 사용합니다.
추가 캐시는 두지 않습니다. 원본의 캐시·배포 지연까지 제거할 수는 없습니다.
조회 시간 제한은 10초, JSON 최대 2MiB, 이미지 최대 8MiB입니다. 응답 상태·형식·상품 필수 구조를 확인합니다.
장애/리다이렉트/잘못된 자료에는 502를 반환하고 기존 페이지 오류 안내를 사용합니다. 오래된 동봉 상품을 최신 상품처럼 대신 제공하지 않습니다.
연결 장애 중에도 로컬 디자인/갤러리/여권 기능은 유지되지만 상품·룩북·원본 사진은 사용하지 못할 수 있습니다. 이번 범위에는 영구 백업이나 오프라인 캐시를 포함하지 않습니다.

## 개인 Cloudflare 설정 (아직 배포하지 않음)

- 본인 계정의 lumino-test-web Worker에 이 브랜치 코드를 연결합니다. 원격 저장/배포는 별도 승인 후 진행합니다.
- 기본 wrangler.jsonc를 사용합니다. entrypoint는 web-worker.js, 자산은 ASSETS, run_worker_first는 모든 경로입니다.
- wrangler.admin.jsonc로 배포하지 않습니다. 별도 관리자 Worker는 필요 없습니다.
- GitHub 런타임 토큰·관리자 비밀번호·SESSION_SECRET·TEST_ADMIN_CONFIG는 필요 없습니다.
- Worker Builds의 코드 접근 권한이 필요한 경우 개인 Fork 하나에만 부여합니다. 원본 저장소 권한은 필요 없습니다.
- 소스 브랜치를 lumino-web-dev로 명시하고 운영 도메인을 연결하지 않습니다. 테스트 주소는 Cloudflare가 부여한 주소를 사용합니다.
- python 정적 서버만으로는 Worker 프록시를 시험할 수 없습니다. Worker 로컬 개발 환경 또는 추후 승인된 테스트 배포에서 확인합니다.

## 검증과 제한

node --test tests/*.test.mjs 통과. 기존 여권·여정 기록 검사와 모의 외부 응답 기반 Worker 검사 포함.
JavaScript/JSON/HTML/자산/충돌 표시 정적 검사 통과.
보호 파일 검사 실패: .assetsignore, wrangler.jsonc는 기존 학생용 정책의 보호 파일입니다. 검사 코드·규칙·workflow를 수정하거나 우회하지 않았습니다. PR 검증 통과를 의미하지 않습니다.
공개 원본 JSON 실제 조회는 실행 환경의 프록시에서 403 Forbidden으로 차단되었습니다. 원본 서버의 접근 가능 여부·실제 응답 형식·최신성·이미지 응답은 미검증입니다.
실제 테스트 서버에서 상품 4개/상세/룩북/이미지, 관리자 저장 이후 원본 배포 반영, 즐겨찾기→여권→PNG 생성, 모바일 화면, 원본 장애 처리를 추가 확인해야 합니다.
신규 배포 주소의 localStorage는 운영 주소와 분리되므로 기존 방문자의 기록이 자동 이전되지 않습니다.
