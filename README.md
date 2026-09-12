# PT 매니저

개인 트레이너를 위한 회원 및 운동기록 관리 앱.

회원 정보, 남은 수업, 운동 기록, 체중, 코칭 메모, 칼로리·영양 계산을 한곳에서 관리합니다.
트레이너 계정별로 데이터가 분리되며, 홈 화면에 설치해 앱처럼 쓸 수 있는 PWA입니다.
라이트·다크 모드를 지원하고 기본값은 기기 설정을 따릅니다.

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
| `/` | 랜딩 — 서비스 소개, 주요 기능, 앱 설치 안내 |
| `/members` | 회원 목록 — 검색(이름·연락처·목표), 명단 지표 |
| `/members/new` | 회원 등록 |
| `/members/[memberId]` | 회원 상세 — 남은 수업, 운동/체중/메모/수업 이력 |
| `/members/[memberId]/workouts/new` | 운동 기록 작성 |
| `/members/[memberId]/workouts/[workoutId]` | 운동 기록 수정 |
| `/members/[memberId]/notes/new` | 코칭 메모 작성 |
| `/members/[memberId]/notes/[noteId]` | 코칭 메모 수정 |
| `/members/[memberId]/nutrition` | 칼로리·영양 계산 |
| `/login`, `/join` | 로그인 / 트레이너 회원가입 |

입력이 긴 것(운동 기록·코칭 메모·영양)은 **화면을 따로 씁니다.**
목록 위에서 펼치면 아래 내용이 밀려나 무엇을 하던 중인지 놓칩니다.
체중처럼 몇 줄짜리는 그 자리에서 폅니다.

## 데이터 모델

```
User (트레이너)
└── Member (회원)
    ├── Workout (하루치 운동 기록)
    │   └── Exercise (종목)
    │       └── ExerciseSet (세트별 횟수·무게)
    ├── WeightRecord (체중 기록)
    ├── CoachingNote (통증·자세·움직임·숙제)
    ├── SessionCompletion (수업 차감 이력)
    └── NutritionProfile (칼로리·영양 계산 결과, 회원당 1건)
```

세트마다 횟수와 무게가 다른 경우(드롭세트·피라미드)가 흔해서 `ExerciseSet`을 따로 뒀습니다.

모든 하위 레코드는 `onDelete: Cascade` — 회원을 지우면 연결 기록도 함께 지워집니다.

### 수업 차감

남은 수업은 **운동 기록을 저장할 때 함께 차감**됩니다. 그때 만들어진
`SessionCompletion`이 그 기록과 연결되고, 회원 상세의 기록 카드에 `수업 1회` 뱃지가 붙습니다.

상담처럼 남길 기록이 없는 날은 수업 이력에서 **직접 차감**합니다. 날짜와 시각(시 단위),
사유를 받습니다. 분 단위는 받지 않습니다.

차감을 되돌리면 남은 수업이 1회 늘고, 연결됐던 운동 기록은 지워지지 않고 남습니다
(`onDelete: SetNull`).

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

현재 **회원가입은 닫혀 있습니다**(`lib/config.ts`의 `SIGNUP_ENABLED = false`).
화면과 API 양쪽에서 막혀 있어 `/join`으로 직접 들어가도 로그인으로 돌려보냅니다.
다시 열려면 그 값만 `true`로 바꾸면 가입 화면·API·홈의 가입 링크가 한꺼번에 따라옵니다.

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

> ⚠️ `.env`의 `DATABASE_URL`은 **운영 Neon DB를 그대로 가리킵니다.** 즉 로컬에서 돌리는 스키마 명령이 **운영 DB에 바로 적용**됩니다. 실데이터가 쌓이기 시작하면 Neon 브랜치를 따서 개발용 URL을 `.env`에 따로 두는 걸 권합니다.

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

`SIGNUP_ENABLED`를 잠시 `true`로 두고 **앱의 회원가입 화면**으로 만듭니다.

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

`public/icons/`의 PNG(192/512/180px, 마스커블 512px)와 탭 아이콘 `app/favicon.ico`(16/32/48px)는 이미 만들어져 있습니다.
바꾸려면 그 파일들을 직접 교체하고 `public/manifest.json`의 경로를 맞춘 뒤,
`app/layout.tsx`의 `icons`에 붙은 `?v=` 숫자를 올립니다. 올리지 않으면 브라우저가 예전 아이콘을 계속 보여줍니다.

---

## 배포 (Vercel)

- `next.config.ts`의 `basePath: "/pt-manager"` — 모든 경로 앞에 `/pt-manager`가 붙습니다.
- `vercel.json`이 루트(`/`) 접속을 `/pt-manager`로 리다이렉트합니다.
- Vercel 프로젝트(`shk-zestify/mes`)에 `DATABASE_URL`, `AUTH_SECRET`이 등록돼 있습니다.
  확인: `vercel env ls` · 추가: `vercel env add`
- 목록에 `PGHOST`, `POSTGRES_URL`, `DATABASE_URL_UNPOOLED` 같은 변수가 여럿 보이는데,
  Neon↔Vercel 통합이 자동으로 심고 갱신하는 값입니다. **앱은 읽지 않습니다.**
  지워도 통합이 다시 만들어 놓으므로 그냥 둡니다.
- `.env` 파일은 배포에 관여하지 않습니다. 빌드는 대시보드 환경변수만 씁니다.

> ℹ️ `.env`가 한동안 공개 저장소에 커밋돼 있었고 **과거 커밋에는 그대로 남아 있습니다.**
> 2026-09-12에 Neon 비밀번호와 `AUTH_SECRET`을 모두 재발급해 노출됐던 값은 무효가 됐습니다.
> 커밋에 남은 값으로는 더 이상 접속할 수 없습니다.

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

### 컴포넌트 자리

| 폴더 | 넣는 것 |
| --- | --- |
| `components/ui` | shadcn 원본. 직접 고치는 일은 드뭅니다 |
| `components/custom` | 여러 화면이 쓰는 우리 부품 (`front-sidebar`, `confirm-dialog`, `date-picker` …) |
| 각 페이지의 `_components` | 그 화면 전용 |

한 화면만 쓰는 부품은 `custom`에 넣지 않습니다. 공용 서랍에 전용 물건이 섞이면
무엇을 꺼내 써도 되는지 판단이 안 섭니다.

### 색과 다크 모드

색은 `app/globals.css`의 CSS 변수에만 둡니다. 화면 코드는 `bg-surface`, `text-ink`처럼
이름만 쓰므로 값을 바꾸면 전체가 따라옵니다.

- 테두리는 두 종류입니다. 카드 바깥은 `edge`(먹색 1.5px), 카드 안 구분선은 `line`(연회색)
- 다크 모드는 `.dark`에서 같은 이름의 값만 다시 정의합니다
- `ink`는 테마에 따라 뒤집히므로, **늘 어두워야 하는 블록**(회원 상세 히어로, 랜딩의
  어두운 섹션)은 `hero` 토큰을 씁니다. `ink`로 칠하면 다크에서 흰 판에 흰 글씨가 됩니다
