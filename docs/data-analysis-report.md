# 📊 데이터/연동 영역 분석 보고서

본 보고서는 `work` (Next.js/Prisma) 프로젝트와 `sysshk-zestify` (Flutter/Firebase) 프로젝트의 데이터 모델, 스키마 및 API 통신 구조를 분석한 결과입니다.

---

## 1. work 프로젝트 (MES - 발효 공정 관리 시스템)

### 🛠 기술 스택
- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript / React 19
- **ORM/DB**: Prisma 7 / PostgreSQL (Neon Serverless)
- **Auth**: NextAuth v5 (Beta)

### 🗄 데이터 모델 및 스키마 분석 (`prisma/schema.prisma`)
본 프로젝트는 **인증 시스템**과 **발효 배치(IndPenSim) 관리**라는 두 가지 핵심 도메인으로 구성되어 있습니다.

#### A. 인증 도메인 (Auth)
- **`User`**: 사용자 계정 정보. `role` 필드를 통해 권한(`operator`, `supervisor`, `admin`)을 구분합니다.
- **`Account`, `Session`, `VerificationToken`**: NextAuth 표준 스키마를 따르며, OAuth 및 세션 관리를 처리합니다.

#### B. 발효 공정 도메인 (MES)
- **`Batch` (배치 메타데이터)**:
    - `batchNumber`: 고유 배치 번호 (Unique).
    - `controlType`: 제어 방식 (recipe, operator 등).
    - `finalYield`: 최종 Penicillin 수율 (결과값).
- **`Record` (시계열 측정 데이터)**:
    - `Batch`와 1:N 관계.
    - `timeHr`: 경과 시간 (X축).
    - `temperature`, `ph`, `dissolvedO2`, `substrate`, `penicillin`: 시간별 측정 지표 (Y축).
    - **인덱스**: `[batchId, timeHr]` 복합 인덱스를 통해 특정 배치의 시계열 조회 성능을 최적화했습니다.

### 📡 API 및 데이터 흐름
- **통신 구조**: Next.js **Server Components**를 통한 직접 DB 접근 및 **Route Handlers** (`/api/...`)를 통한 클라이언트 통신.
- **주요 데이터 산출물 (Dashboard 기준)**:
    - **KPI**: 배양 중 배치 수, 평균 수율, 가동 발효조 비율, 활성 알람 수.
    - **시계열 분석**: 특정 배치의 시간별 역가(Titer) 추이 (`LineChart` 데이터).
    - **상태 모니터링**: 가동 중인 발효조의 실시간 지표(온도, pH, DO, 교반).
    - **목록**: 최근 배치 현황 (배치번호, 제품, 상태, 진행률, 담당자).

---

## 2. sysshk-zestify 프로젝트 (Cleanup - 전문 청소 서비스)

### 🛠 기술 스택
- **Framework**: Flutter
- **Language**: Dart
- **Backend/DB**: Firebase (Auth, Cloud Firestore)
- **State Management**: Provider
- **Routing**: GoRouter

### 🗄 데이터 모델 및 스키마 분석 (`firestore_service.dart` 및 UI 기반)
NoSQL 기반의 Firestore를 사용하며, 컬렉션 중심의 유연한 구조를 가집니다.

#### A. 예약 도메인 (`bookings` 컬렉션)
- **`Booking` 모델**:
    - `customerPhone`: 고객 전화번호 (조회 키).
    - `serviceType`: 서비스 종류 (`living` - 생활청소, `moving` - 이사청소).
    - `createdAt`: 예약 생성일 (정렬 기준).
    - 기타: 주소, 일정, 옵션, 고객 정보, 결제 상태 등이 포함된 JSON 구조.

#### B. 서비스 도메인 (`ServiceType` Enum)
- `living` (생활청소) / `moving` (이사청소) 두 가지 핵심 서비스 타입을 정의하여 라우팅 및 예약 로직에 활용합니다.

### 📡 API 및 데이터 흐름
- **통신 구조**: Firebase SDK를 이용한 **Client-to-Backend 직접 통신**.
- **주요 데이터 흐름**:
    - **예약 생성**: `saveBooking()` $\rightarrow$ `bookings` 컬렉션에 JSON 데이터 추가.
    - **예약 조회**: `getBookingsByPhone()` $\rightarrow$ `customerPhone` 필드로 필터링 후 `createdAt` 내림차순 정렬 조회.
    - **인증 흐름**: `AuthProvider`를 통해 로그인 상태를 관리하며, `/booking` 경로 진입 시 `isLoggedIn` 여부를 체크하여 `/login`으로 리다이렉트하는 가드 로직이 구현되어 있습니다.

---

## 3. 종합 비교 및 요약

| 구분 | work (MES) | sysshk-zestify (Cleanup) |
| :--- | :--- | :--- |
| **성격** | B2B 공정 관리 (산업용) | B2C 서비스 예약 (상업용) |
| **데이터 특성** | 정형 데이터, 고밀도 시계열 데이터 | 비정형/반정형 데이터, 트랜잭션 중심 |
| **DB 아키텍처** | RDBMS (PostgreSQL) $\rightarrow$ 관계 중심 | NoSQL (Firestore) $\rightarrow$ 문서 중심 |
| **통신 방식** | Server-side Rendering / API Route | Client-side SDK (Firebase) |
| **핵심 지표** | 수율(Yield), 역가(Titer), 공정 변수 | 예약 건수, 서비스 타입, 고객 연락처 |
| **인증 방식** | NextAuth (Session/JWT) | Firebase Auth (Token/Provider) |
