# Nosion 기술 구성 (Tech Stack)

백엔드/프론트엔드를 분리한 pnpm workspace 모노레포. 선택의 근거가 되는 결정 기록은 `.forge/adr/`에 있다 — [ADR-0001 BlockNote](../.forge/adr/0001-blocknote-editor.md), [ADR-0003 NestJS+SPA 모노레포](../.forge/adr/0003-nestjs-spa-monorepo.md), [ADR-0004 PostgreSQL+JSONB](../.forge/adr/0004-postgres-jsonb-storage.md).

## 1. 한눈에 보기

| 영역 | 선택 | 근거 |
|------|------|------|
| 언어 | TypeScript (전 구간) | 프론트·백·공유 패키지가 타입을 공유 (ADR-0003) |
| 백엔드 | NestJS | 모듈/컨트롤러/서비스 관례가 강해 loop 에이전트가 구조를 잃지 않음 (ADR-0003) |
| DB | PostgreSQL 16 (docker-compose) | 서비스급 표준. 문서 본문은 JSONB 통저장 (ADR-0004) |
| ORM | Drizzle | 이전 프로젝트에서 사용 — 학습 비용 없음. SQL에 가까운 타입 안전 쿼리 |
| 인증 | better-auth (NestJS에 마운트) | 이메일/비밀번호 + 쿠키 세션 기본 제공, React 클라이언트 SDK 존재 (ADR-0003) |
| 프론트엔드 | Vite + React 19 SPA | 로그인 뒤 앱이라 SSR 불필요. 빌드/HMR이 빨라 loop 반복 주기에 유리 (ADR-0003) |
| 라우팅 | React Router | SPA 표준 |
| 서버 상태 | TanStack Query | API 캐싱·무효화·낙관적 갱신 |
| 에디터 | BlockNote (코어, MPL-2.0) | 노션급 편집 UX 기본 탑재 유일 (ADR-0001). XL 패키지는 라이선스 제약으로 미사용 |
| 스타일 | Tailwind CSS | 이전 프로젝트에서 사용. 유틸리티 기반이라 에이전트 산출물 일관성 유지 용이 |
| 백엔드 테스트 | Jest + supertest | NestJS 기본 내장 — 통합(API) 테스트가 loop 종료 조건의 한 축 |
| E2E | Playwright | PRD 기능↔시나리오 매핑이 loop 종료 조건의 핵심 축 |
| 패키지 매니저 | pnpm workspace | 모노레포 도구. 빌드 오케스트레이터(turborepo 등)는 앱 2개에 과해 미사용 (ADR-0003) |
| 런타임 | Node.js 22 LTS | 현행 LTS |

## 2. 워크스페이스 구성

```
nosion/
├── apps/
│   ├── backend/     # NestJS API 서버 (:3001)
│   └── frontend/    # Vite + React SPA (:5173, dev proxy → :3001)
├── packages/
│   └── shared/      # API 계약 타입·DTO·상수 (양쪽에서 import)
├── e2e/             # Playwright 시나리오 (loop-exit-criteria의 매핑 대상)
├── docker-compose.yml   # postgres (dev/test)
└── docs/
```

- `packages/shared`가 API 요청/응답 타입의 단일 원천이다. 백엔드 DTO와 프론트 API 클라이언트가 같은 타입을 import해 계약 드리프트를 차단한다.
- E2E는 앱이 아니라 저장소 레벨 관심사라 `apps/` 밖 `e2e/`에 둔다.

## 3. 백엔드 상세

- **NestJS 모듈 구성**은 [architecture.md](./architecture.md) §2 참고.
- **better-auth**를 NestJS에 마운트해 `/api/auth/*` 경로를 위임한다. 세션은 httpOnly 쿠키. SPA와 동일 오리진처럼 동작하도록 dev에서는 Vite 프록시, 운영 빌드에서는 리버스 프록시(또는 백엔드의 정적 서빙)를 전제한다 — CORS·크로스사이트 쿠키 문제를 원천 회피.
- **Drizzle 마이그레이션**(`drizzle-kit`)으로 스키마를 관리한다. 마이그레이션 파일은 커밋 대상.
- **검색**: 문서 저장 시 본문 JSON에서 평문 텍스트를 추출해 검색 컬럼에 갱신하고, `pg_trgm` GIN 인덱스로 부분 문자열 매칭한다(한국어 형태소 분석 없음 — ADR-0004).

## 4. 프론트엔드 상세

- **상태 구분**: 서버 데이터는 전부 TanStack Query. 클라이언트 전용 상태(사이드바 접힘, 테마 등)는 React 상태 + localStorage로 최소화 — 전역 상태 라이브러리는 필요해질 때까지 도입하지 않는다.
- **BlockNote**: 문서 페이지당 에디터 인스턴스 1개. `onChange` 디바운스로 자동 저장(PATCH), 저장 실패는 UI에 표시(PRD §4).
- **다크모드**: Tailwind `dark` 클래스 전략 + localStorage 유지. BlockNote 테마도 함께 전환.

## 5. 개발·실행 흐름

로컬 개발은 Postgres 컨테이너 하나를 띄운 뒤 두 앱을 dev 모드로 실행한다.

```
docker compose up -d postgres
      ↓
pnpm install
      ↓
pnpm --filter backend db:migrate   # Drizzle 마이그레이션
      ↓
pnpm dev                           # backend(:3001) + frontend(:5173) 동시 기동
```

검증(빌드·테스트·E2E) 명령은 [loop-exit-criteria.md](./loop-exit-criteria.md)에 확정 목록이 있다 — 루트 `package.json`의 스크립트 이름은 그 문서를 원천으로 맞춘다.

## 6. 명시적으로 쓰지 않는 것

- **turborepo/Nx** — 앱 2개 규모에 과함 (ADR-0003).
- **Next.js** — 프론트 전용으로 쓰면 서버 컴포넌트/캐싱 복잡도만 남음 (ADR-0003).
- **Prisma** — Drizzle 유지, 도구 교체 이유 없음.
- **외부 IdP(Auth0/Clerk 등)** — 외부 의존은 E2E 무인 검증을 깨뜨림 (ADR-0003).
- **BlockNote XL 패키지** — AGPL/상용 이중 라이선스 (ADR-0001).
