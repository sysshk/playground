# 📑 통합 프로젝트 분석 리포트

본 리포트는 `work` (MES 공정 관리 시스템)와 `sysshk-zestify` (B2C 청소 서비스 앱) 두 프로젝트의 기술 스택, 데이터 모델, UI/UX 구조를 통합 분석한 결과입니다.

---

## 1. 프로젝트 개요 및 비교

| 구분 | `work` (MES) | `sysshk-zestify` (Cleanup) |
| :--- | :--- | :--- |
| **서비스 성격** | B2B 산업용 발효 공정 관리 시스템 | B2C 전문 청소 서비스 예약 플랫폼 |
| **핵심 목적** | 실시간 모니터링, 수율 분석, 공정 제어 | 서비스 탐색, 간편 예약, 고객 전환 |
| **주요 사용자** | 공정 운영자, 슈퍼바이저, 관리자 | 일반 고객, 청소 파트너 |
| **기술 스택** | Next.js 16, TypeScript, Prisma, PostgreSQL | Flutter, Dart, Firebase (Auth, Firestore) |
| **인증 방식** | NextAuth v5 (Session/JWT) | Firebase Auth (Token/Provider) |
| **데이터 특성** | 고밀도 시계열 데이터, 정형 관계형 데이터 | 트랜잭션 중심, 비정형/반정형 문서 데이터 |

---

## 2. `work` 프로젝트 상세 분석 (MES)

### 🛠 기술 아키텍처
- **Frontend**: Next.js 16 (App Router) 기반의 서버 컴포넌트 중심 설계.
- **Backend**: Route Handlers 및 Server Actions를 통한 API 구현.
- **Database**: Prisma ORM $\rightarrow$ PostgreSQL (Neon Serverless).

### 🗄 데이터 모델 (`prisma/schema.prisma`)
- **인증 도메인**: `User` (역할 기반 권한 관리: `operator`, `supervisor`, `admin`), `Account`, `Session`.
- **공정 도메인**:
    - `Batch`: 배치 메타데이터 (배치 번호, 제어 방식, 최종 수율).
    - `Record`: 시계열 측정 데이터 (시간별 온도, pH, DO, 기질, Penicillin 농도). `[batchId, timeHr]` 복합 인덱스로 조회 최적화.

### 📱 UI/UX 및 표현 영역
- **라우팅**: `(front-end)` 라우트 그룹을 통해 `/dashboard`, `/batches`, `/equipment`, `/monitoring` 등으로 구성.
- **디자인 전략**: 데이터 밀도가 높은 산업용 UI. 상태별 색상 토큰(`--run`, `--ok`, `--warn`)을 활용한 직관적 가시성 확보.
- **핵심 컴포넌트**:
    - `StatCard`: KPI 지표 요약.
    - `LineChart`: `recharts` 기반 시계열 역가(Titer) 추이 시각화.
    - `StatusBadge`: 공정 상태(`RUNNING`, `COMPLETED` 등) 표시.

---

## 3. `sysshk-zestify` 프로젝트 상세 분석 (Cleanup)

### 🛠 기술 아키텍처
- **Frontend**: Flutter 기반의 크로스 플랫폼 모바일 앱.
- **Backend**: Firebase SDK를 이용한 Client-to-Backend 직접 통신.
- **State/Routing**: `Provider`를 통한 상태 관리, `go_router`를 통한 선언적 라우팅.

### 🗄 데이터 모델 (`firestore_service.dart`)
- **NoSQL 구조**: Firestore의 `bookings` 컬렉션 중심.
- **핵심 모델**:
    - `Booking`: 고객 전화번호(`customerPhone`)를 키로 하며, 서비스 타입(`living`, `moving`), 주소, 일정, 옵션, 결제 상태 등을 포함하는 JSON 문서.
- **데이터 흐름**: `saveBooking()` (생성) $\rightarrow$ `getBookingsByPhone()` (조회 및 내림차순 정렬).

### 📱 UI/UX 및 표현 영역
- **라우팅**: `/` (홈) $\rightarrow$ `/services/{type}` $\rightarrow$ `/booking/{type}` (5단계 스텝) $\rightarrow$ `/booking/complete`.
- **디자인 전략**: 브랜드 이미지 제고를 위한 감성적 디자인. Primary Blue와 Accent Teal 그라데이션 활용.
- **핵심 컴포넌트**:
    - `_HeroSection`: `flutter_animate`를 활용한 인터랙티브 진입 영역.
    - `ServiceCard`: 서비스 선택 및 예약 유도 카드.
    - `BookingStep`: 주소 $\rightarrow$ 일정 $\rightarrow$ 옵션 $\rightarrow$ 정보 $\rightarrow$ 결제 순의 선형적 UX.

---

## 4. 종합 분석 결론

두 프로젝트는 **"데이터의 성격"**과 **"사용자의 목적"**에 따라 완전히 다른 기술적 선택을 하고 있습니다.

1. **`work`**는 **정밀도와 분석**이 중요하므로, 강력한 타입 시스템(TypeScript)과 관계형 DB(PostgreSQL), 그리고 서버 사이드 렌더링(Next.js)을 통해 데이터 일관성과 초기 로딩 성능을 확보했습니다.
2. **`sysshk-zestify`**는 **속도와 전환**이 중요하므로, 빠른 개발 사이클의 Flutter와 실시간 동기화가 강점인 Firebase를 선택하여 매끄러운 사용자 경험(UX)과 유연한 데이터 구조를 구현했습니다.
