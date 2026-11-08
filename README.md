# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.


### 공고 캡처 여러 장 불러오기

`/custom-policies/new`와 직접 등록 공고 수정 화면에서 같은 공고의 캡처를 최대 5장 선택할 수 있다.
PNG·JPG·WEBP, 장당 10MB·합계 30MB 이하. 미리보기에서 추가·삭제·순서 변경 후
「캡처 N장 함께 불러오기」를 누르면 `POST /api/v1/me/imports/image`에 `image` 필드를 반복해 보낸다.
한 작업 결과로 입력칸을 채우며, 확인·수정한 뒤 등록한다. 불러오는 동안 입력과 저장은 잠긴다.
backend와 policy-harvester의 다중 캡처 지원을 먼저 배포해야 한다.


### 첫 방문 소개 화면

이용 기록이 없는 브라우저에서 `/`에 들어오면 기존 홈·프로필 요청보다 먼저 서비스 소개를 보여 준다.
로그인·회원가입은 기존 인증 화면으로, 가입 없이 시작은 프로필 입력을 건너뛰고 홈으로 연결한다.
소개 화면을 처음 표시할 때 `welcomeSeen=yes`를 localStorage에 기억하며, 버튼을 누르지 않고
새로고침하거나 다시 방문해도 소개를 다시 띄우지 않는다. 현재 보고 있는 소개 화면은 선택할 때까지 유지한다.
기존 익명 ID·로그인 토큰·온보딩 건너뛰기 기록이 있는 이용자와 공고 등 직접 링크는 기존 흐름을 유지한다.
소개 화면을 다시 확인하려면 새 브라우저 프로필이나 시크릿 창에서 `/`를 연다.
