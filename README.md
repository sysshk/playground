# PT 매니저

개인 트레이너를 위한 회원 및 운동기록 관리 앱.

회원 정보, 남은 PT 세션, 운동 기록, 체중, 코칭 메모, 칼로리·영양 계산을 한곳에서 관리합니다.
트레이너 계정별로 데이터가 분리되며, 홈 화면에 설치해 앱처럼 쓸 수 있는 PWA입니다.

## 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| 인증 | Auth.js (next-auth v5 beta) — Credentials + JWT 세션 |
| DB | Neon(PostgreSQL) + Prisma 7 (`@prisma/adapter-neon`) |
| 배포 | Vercel (`basePath: /pt-manager`) |

## 화면 구성

| 경로 | 설명 |
| --- | --- |
| `/` | 홈 — 서비스 소개, 주요 기능, 앱 설치 안내 |
| `/members` | 회원 목록 — 검색(이름·연락처·목표), 회원 등록 |
| `/members/[memberId]` | 회원 상세 — 수업 완료, 체중/운동/코칭 메모, 영양 계산 |
| `/login`, `/join` | 로그인 / 트레이너 회원가입 |

## 데이터 모델

```
User (트레이너)
└── Member (회원)
    ├── Workout (하루치 운동 기록) ──> Exercise (종목·세트·횟수·무게)
    ├── WeightRecord (체중 기록)
    ├── CoachingNote (통증·자세·움직임·숙제)
    ├── SessionCompletion (수업 완료 내역)
    └── NutritionProfile (칼로리·영양 계산 결과, 회원당 1건)
```

모든 하위 레코드는 `onDelete: Cascade` — 회원을 지우면 연결 기록도 함께 지워집니다.

### 영양 계산 로직

`lib/nutrition.ts`에 있습니다.

- **기초대사량** — 제지방량을 알면 Katch-McArdle(`370 + 21.6 × LBM`), 모르면 Mifflin-St Jeor
- **제지방량** — 직접 입력값 > `체중 × (1 - 체지방률)` > 없음
- **유지칼로리** — 기초대사량 × 활동량 계수(1.2 ~ 1.9)
- **목표 칼로리** — 유지칼로리 + 목표 가감(감량 -500 / 유지 0 / 증량 +300) + 골격근량 보정
- **매크로** — 단백질을 목표별 g/kg 범위에서 정하고, 남은 칼로리를 탄수화물/지방으로 배분

> 결과는 코칭 참고용 추정치이며 의료 또는 영양 처방을 대신하지 않습니다.

---

## 로컬 실행

```bash
npm install          # postinstall에서 prisma generate까지 자동 실행
npm run dev          # http://localhost:3000/pt-manager
```

`basePath`가 `/pt-manager`라 루트(`/`)가 아니라 **`/pt-manager`로 접속**해야 합니다.

계정은 `/pt-manager/join`에서 가입해 만듭니다. 현재 DB에 계정이 하나도 없으니 먼저 가입하세요.

### 환경 변수

`.env.example`을 복사해 `.env`를 만들고 값을 채우세요.

```bash
cp .env.example .env
```

```bash
DATABASE_URL=postgresql://...@....neon.tech/neondb?sslmode=require
AUTH_SECRET=...   # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`.env*`는 `.gitignore`에 걸려 있어 커밋되지 않습니다(`.env.example`만 예외).
**배포에서는 파일을 쓰지 않습니다** — Vercel 대시보드의 Environment Variables가
빌드·런타임 환경에 직접 주입됩니다.

---

## Neon DB 다루기

`prisma.config.ts`가 `dotenv/config`로 `.env`를 읽으므로, 아래 명령들은 **`.env`의 `DATABASE_URL`을 대상으로** 동작합니다.

> ⚠️ 현재 `.env`와 `.env.production`의 `DATABASE_URL`이 **같습니다**. 즉 로컬에서 돌리는 스키마 명령이 **운영 DB에 바로 적용**됩니다. 실데이터가 쌓이기 시작하면 Neon 브랜치를 따서 개발용 URL을 `.env`에 따로 두는 걸 권합니다.

### 자주 쓰는 명령어

```bash
# 1. 스키마를 고친 뒤 타입(Prisma Client)만 다시 만들기 — DB는 안 건드림
npx prisma generate

# 2. 스키마 변경분을 DB에 반영 (마이그레이션 파일 없이 바로 동기화)
npx prisma db push

# 3. DB를 통째로 비우고 스키마 새로 적용 — 모든 데이터 삭제, 복구 불가
npx prisma db push --force-reset --accept-data-loss

# 4. 브라우저로 데이터 들여다보기 (http://localhost:5555)
npx prisma studio

# 5. 실제 DB 상태와 스키마 파일의 차이 확인 (읽기 전용, 안전)
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma
```

**언제 무엇을 쓰나**

| 상황 | 명령 |
| --- | --- |
| 스키마 파일만 고쳤고 타입이 안 맞을 때 | `npx prisma generate` |
| 컬럼/테이블을 추가했을 때 | `npx prisma db push` |
| 데이터 다 버리고 처음부터 | `npx prisma db push --force-reset --accept-data-loss` |
| 데이터 직접 보고 싶을 때 | `npx prisma studio` |

> `prisma db push`는 마이그레이션 히스토리를 만들지 않습니다. 운영 이력이 필요해지면
> `npx prisma migrate dev --name <이름>`으로 전환하세요.

### 파괴적 명령과 AI 에이전트

Prisma 7은 AI 에이전트가 `--force-reset` 같은 파괴적 명령을 실행하면 **차단하고 사용자 동의를 요구**합니다.
사람이 직접 실행할 땐 그냥 돌아가고, 에이전트가 실행하려면 사용자의 동의 문구를
`PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` 환경변수로 넘겨야 합니다.

### 트레이너 계정 만들기

시드 스크립트 없이 **앱의 회원가입 화면**으로 만듭니다.

```
http://localhost:3000/pt-manager/join
```

DB를 리셋하면 계정도 사라지므로, 다시 가입해서 만드세요.

> 예전 `scripts/seed-admin.mjs`는 비밀번호 평문이 소스에 박혀 있어 제거했습니다.
> 그 값(`대서우1234`)은 git 히스토리에 남아 있으니 **어디서도 재사용하지 마세요.**

---

## 기타 명령어

```bash
npm run build        # prisma generate + next build
npm run start        # 프로덕션 빌드 실행
npm run lint         # ESLint
npx tsc --noEmit     # 타입 검사
```

### PWA 아이콘

`public/icons/`의 PNG(192/512/180px)와 `public/favicon.svg`는 이미 만들어져 커밋돼 있습니다.
바꾸려면 그 파일들을 직접 교체하고 `public/manifest.json`의 경로만 맞추면 됩니다.

---

## 배포 (Vercel)

- `next.config.ts`의 `basePath: "/pt-manager"` — 모든 경로 앞에 `/pt-manager`가 붙습니다.
- `vercel.json`이 루트(`/`) 접속을 `/pt-manager`로 리다이렉트합니다.
- Vercel 프로젝트(`shk-zestify/mes`)에 `DATABASE_URL`, `AUTH_SECRET`이 등록돼 있습니다.
  확인: `vercel env ls` · 추가: `vercel env add`
- `.env` 파일은 배포에 관여하지 않습니다. 빌드는 대시보드 환경변수만 씁니다.

> ⚠️ `.env`와 `.env.production`이 한동안 공개 저장소에 커밋돼 있었습니다.
> 현재는 추적을 끊었지만 **과거 커밋에는 남아 있습니다.** Neon 비밀번호와
> `AUTH_SECRET`을 재발급하기 전까지는 그 값들이 유효한 상태입니다.

### basePath 때문에 주의할 점

`<Link>`와 `router.push()`는 basePath가 **자동으로** 붙지만, `fetch`는 **안 붙습니다.**
그래서 API 호출은 항상 `lib/client.ts`의 `apiFetch()`를 거칩니다.

```ts
apiFetch("/api/members")   // 실제로는 /pt-manager/api/members 로 나감
```

`manifest.json`, 아이콘, `SessionProvider`의 `basePath`도 같은 이유로 경로를 직접 지정합니다.

---

## 구조 메모

- `proxy.ts` — 로그인 안 한 접근을 `/login`으로 보내는 가드.
  Next 16부터 `middleware.ts` 대신 `proxy.ts` 규약을 씁니다.
  Edge에서 돌기 때문에 Prisma를 쓸 수 없어 **세션 쿠키 존재 여부만** 봅니다.
  실제 권한 검사는 각 API 라우트의 `requireTrainerId()` / `requireOwnedMember()`가 합니다.
- `lib/api.ts` — API 라우트 공통 인증 가드·소유권 확인·입력 검증.
  남의 회원에 접근하면 존재 여부를 흘리지 않도록 404로 응답합니다.
- `app/generated/prisma` — Prisma가 생성하는 코드. git에 올리지 않고 린트에서도 제외합니다.
