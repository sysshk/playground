# MES — 공정관리 시스템 (Manufacturing Execution System)

발효 및 배양 공정을 효율적으로 실행하고 모니터링하기 위한 **MES 프레임워크**입니다. 
본 프로젝트는 최신 Next.js 16.1 및 React 19 스택을 기반으로 하며, 서버리스 데이터베이스 환경에서 대규모 시계열 배양 데이터를 처리하고 시각화하는 데 최적화되어 있습니다.

## 🚀 기술 스택

### Core
- **Framework**: Next.js 16.1 (App Router)
- **Library**: React 19
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4

### Backend & Database
- **ORM**: Prisma 7
- **Database**: PostgreSQL (Neon Serverless)
- **Adapter**: `@prisma/adapter-neon` (서버리스 연결 최적화)
- **Auth**: NextAuth.js v5 (Beta)

### Visualization & Tools
- **Charts**: Recharts, Custom SVG LineChart (경량 시계열 렌더링)
- **Data Parsing**: PapaParse (CSV 처리)
- **Animation**: Framer Motion

---

## 📂 프로젝트 구조

```text
/work
├── app/
│   ├── (front-end)/          # 사용자 인터페이스 그룹
│   │   ├── layout.tsx        # SessionProvider 및 AppShell 적용 (Client Component)
│   │   ├── dashboard/        # 공정 요약 및 KPI 대시보드
│   │   ├── batches/          # 배치 목록 및 상세 시계열 분석
│   │   ├── monitoring/       # 실시간 설비 모니터링
│   │   └── equipment/        # 발효조/설비 관리
│   ├── api/
│   │   └── auth/             # NextAuth 인증 핸들러
│   ├── layout.tsx            # 루트 레이아웃 (Server Component)
│   └── globals.css           # Tailwind 4 기반 전역 스타일
├── components/
│   ├── custom/               # 공통 유틸리티 컴포넌트 (SessionProvider 등)
│   └── mes/                  # MES 도메인 전용 UI (StatCard, LineChart, StatusBadge 등)
├── lib/
│   ├── prisma.ts             # Neon 어댑터가 적용된 Prisma Client 싱글톤
│   └── mock.ts               # 하이드레이션 일관성을 위한 결정적(Deterministic) 목업 데이터
├── prisma/
│   └── schema.prisma         # Batch, Record, User 모델 정의
├── public/                   # 정적 자산 (이미지, 아이콘)
└── scripts/                  # 데이터 파이프라인 (MAT → CSV → SQL)
```

---

## 🛠 핵심 설계 및 코딩 규칙

### 1. Next.js 16.1 & React 19 아키텍처
- **Base Path**: `next.config.ts`에 `basePath: "/mes"`가 설정되어 있어 모든 라우트는 `/mes` 하위에서 동작합니다.
- **Component Boundary**:
    - **Server Components**: 데이터 패칭 및 초기 렌더링을 담당하여 TTI(Time to Interactive)를 최적화합니다.
    - **Client Components**: `'use client'` 지시어를 사용하여 상태 관리 및 사용자 인터랙션을 처리합니다.
- **Hydration Strategy**: `lib/mock.ts`에서는 `Math.random()` 사용을 금지하고 시드 기반의 데이터를 생성하여, 서버와 클라이언트 간의 렌더링 결과 불일치(Hydration Mismatch)를 원천 차단합니다.

### 2. 데이터 모델 및 DB 전략
- **Prisma Neon Adapter**: 서버리스 환경의 Cold Start 및 연결 제한 문제를 해결하기 위해 `@prisma/adapter-neon`을 사용하여 HTTP 기반 쿼리를 수행합니다.
- **시계열 데이터 최적화**: `Record` 모델에 `[batchId, timeHr]` 복합 인덱스를 설정하여 대량의 배양 데이터 조회 성능을 확보했습니다.

### 3. 인증 체계
- **NextAuth v5**: 최신 Beta 버전을 사용하여 서버 액션 및 미들웨어 기반의 인증을 구현했습니다.
- **Role-based Access**: `User` 모델의 `role` 필드(`operator`, `supervisor`, `admin`)를 통해 권한별 접근 제어를 수행합니다.

---

## 📊 데이터 파이프라인 (IndPenSim)

본 시스템은 `.mat` 형태의 연구 데이터를 실제 DB에 적재하여 분석하는 파이프라인을 제공합니다.

**흐름: `.mat` 파일 $\rightarrow$ CSV 변환 $\rightarrow$ UI 업로드 $\rightarrow$ Neon DB 저장 $\rightarrow$ 시각화**

### 데이터 적재 방법
1. **CSV 변환 (Local)**:
   ```bash
   pip install scipy numpy pandas
   python scripts/mat_to_csv.py IndPenSim.mat batch1.csv --batch 1 --control recipe
   ```
2. **DB 반영**:
   ```bash
   npx prisma db push
   ```
3. **UI 업로드**: `/mes/batches` 화면의 **＋ CSV 업로드** 기능을 통해 데이터를 적재합니다.

---

## 💻 개발 가이드

### 환경 변수 설정 (`.env`)
```env
DATABASE_URL=postgresql://...   # Neon Postgres 연결 문자열
AUTH_SECRET=...                 # openssl rand -base64 32
```

### 주요 실행 명령어
```bash
npm install              # 의존성 설치
npm run dev              # 개발 서버 실행 (http://localhost:3000/mes)
npm run build            # 프로덕션 빌드 (Prisma Generate 포함)
npm run seed:admin       # 관리자 계정 생성 스크립트 실행
```
