# 백엔드/프론트엔드 분리: NestJS API + Vite React SPA, pnpm workspace 모노레포

이전 버전은 Next.js 풀스택 단일 앱이었으나, 서비스급 구조 학습과 loop 엔지니어(무인 주행) 실험을 위해 백엔드와 프론트엔드를 분리한다. 백엔드는 관례가 강해 에이전트가 구조를 헷갈리기 어려운 NestJS(TypeScript), 프론트엔드는 로그인 뒤 앱이라 SSR이 불필요하므로 Next.js가 아닌 Vite + React SPA를 쓴다. 두 앱은 pnpm workspace 모노레포(`apps/backend`, `apps/frontend`, `packages/shared`)에 두어 API 계약 타입을 공유하고, loop가 한 세션에서 양쪽을 오가며 작업할 수 있게 한다.

## 결과

- 인증은 better-auth를 NestJS에 마운트해 쿠키 세션으로 처리한다(Passport+JWT 직접 구현 대비 인증 코드량 절감, 이전 프로젝트에서 이미 사용한 도구).
- 별도 레포 분리는 forge 루프가 단일 레포 단위로 돌기 때문에 기각했다. 빌드 오케스트레이터(turborepo 등)는 앱 2개 규모에 과해 v1에서 쓰지 않는다.
