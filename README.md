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
