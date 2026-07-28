# 📱 화면/표현 영역 분석 보고서

본 보고서는 `work` (MES 시스템)와 `sysshk-zestify` (청소 서비스 앱) 두 프로젝트의 프론트엔드 구조를 분석하여, 각 서비스의 목적에 따른 UI/UX 전략과 기술적 구현 방식을 정리합니다.

## 1. `work` 프로젝트 (MES - Manufacturing Execution System)

### 1.1 라우팅 체계 및 페이지 구조
Next.js 16 App Router를 사용하며, **라우트 그룹 `(front-end)`**를 통해 사용자 인터페이스 영역을 논리적으로 분리하고 있습니다.

- **라우팅 구조**:
    - `/login`: 인증 진입점.
    - `/dashboard`: 공정 실시간 현황 요약 (KPI, 실시간 차트, 가동 설비 현황).
    - `/batches`: 전체 배치 목록 및 관리.
    - `/batches/[batchNumber]`: 특정 배치의 상세 시계열 데이터 및 분석.
    - `/equipment`: 설비 상태 모니터링 및 관리.
    - `/monitoring`: 실시간 공정 모니터링 전용 화면.
    - `/join`: 사용자 가입/등록.

- **특이사항**:
    - `(front-end)/layout.tsx`를 통해 전역 레이아웃(사이드바, 헤더 등)을 공유합니다.
    - 서버 컴포넌트(Server Components)를 기본으로 하여 데이터 패칭 효율을 극대화하고, 인터랙션이 필요한 부분만 클라이언트 컴포넌트로 분리하는 전략을 취하고 있습니다.

### 1.2 UI 컴포넌트 구성 및 디자인 전략
산업용 시스템 특성상 **데이터 밀도가 높고 시각적 직관성**이 강조된 디자인을 사용합니다.

- **핵심 UI 컴포넌트**:
    - `StatCard`: KPI 지표(배양중 배치, 평균 수율 등)를 표시하는 요약 카드.
    - `LineChart`: `recharts` 기반의 시계열 데이터 시각화 (역가 추이 등).
    - `StatusBadge`: `RUNNING`, `COMPLETED` 등 공정 상태를 색상으로 구분하여 표시.
    - `AppShell`: 전체 애플리케이션의 기본 골격(Shell)을 제공하는 래퍼.

- **디자인 특징**:
    - **색상 체계**: 상태별 전용 색상(`--run`, `--ok`, `--warn`)을 정의하여 알람 및 상태를 즉각적으로 인지하게 함.
    - **레이아웃**: 대시보드 중심의 그리드 시스템을 사용하여 한 화면에서 다량의 지표를 동시에 모니터링 가능.

---

## 2. `sysshk-zestify` 프로젝트 (B2C 청소 서비스)

### 2.1 라우팅 체계 및 페이지 구조
Flutter와 `go_router`를 사용하여 모바일 앱 환경에 최적화된 선언적 라우팅을 구현하고 있습니다.

- **라우팅 구조**:
    - `/`: 메인 홈 화면 (서비스 소개, 히어로 섹션, 신뢰 지표).
    - `/login`: 사용자 인증.
    - `/services/living`: 생활청소 서비스 상세 및 예약 진입.
    - `/services/moving`: 이사청소 서비스 상세 및 예약 진입.
    - `/booking/:serviceType`: 서비스 타입별 예약 프로세스 (5단계 스텝).
    - `/booking/complete`: 예약 완료 확인 페이지.
    - `/support`: 고객 지원 센터.
    - `/partner`: 파트너(청소사) 지원 센터.

- **특이사항**:
    - `AuthProvider`를 통한 **중앙 집중식 인증 가드**를 구현하여, `/booking` 하위 경로 진입 시 로그인 여부를 체크하고 `/login`으로 리다이렉트하는 로직이 포함되어 있습니다.
    - `NoTransitionPage`를 사용하여 페이지 전환 시 불필요한 애니메이션을 제거하고 빠른 응답성을 제공합니다.

### 2.2 UI 컴포넌트 구성 및 디자인 전략
B2C 서비스 특성상 **브랜드 이미지 제고와 사용자 전환(Conversion)**을 유도하는 감성적 디자인을 사용합니다.

- **핵심 UI 컴포넌트**:
    - `CleanupAppBar`: 브랜드 아이덴티티가 반영된 상단 바.
    - `ServiceCard`: 서비스 유형을 시각적으로 구분하고 예약으로 유도하는 카드.
    - `_HeroSection`: 그라데이션 배경과 애니메이션(`flutter_animate`)을 활용한 강렬한 첫인상 제공.
    - `FooterWidget`: 서비스 정보 및 법적 고지 사항을 포함한 하단 영역.

- **디자인 특징**:
    - **색상 체계**: `Color(0xFF0F6FFF)`(Primary Blue)와 `Color(0xFF00C9B1)`(Accent Teal)의 그라데이션을 사용하여 깨끗하고 전문적인 이미지 강조.
    - **UX 흐름**: 홈 $\rightarrow$ 서비스 선택 $\rightarrow$ 5단계 예약(주소 $\rightarrow$ 일정 $\rightarrow$ 옵션 $\rightarrow$ 정보 $\rightarrow$ 결제)으로 이어지는 선형적 사용자 경험 설계.

---

## 3. 종합 비교 분석

| 구분 | `work` (MES) | `sysshk-zestify` (Cleanup) |
| :--- | :--- | :--- |
| **대상 사용자** | 공정 운영자, 관리자 (B2B/Internal) | 일반 고객, 청소 파트너 (B2C) |
| **주요 목적** | 실시간 모니터링 및 데이터 분석 | 서비스 탐색 및 예약 전환 |
| **UI 핵심** | 데이터 밀도, 상태 가시성, 차트 | 브랜드 이미지, 사용성, 애니메이션 |
| **라우팅 특성** | 계층적/관리적 구조 (Next.js App Router) | 흐름 중심/선형적 구조 (GoRouter) |
| **데이터 흐름** | 서버 $\rightarrow$ 클라이언트 (Server Components) | 클라이언트 $\leftrightarrow$ Firebase (Direct SDK) |
| **디자인 톤** | 정제된, 기능적인, 경고 중심의 | 밝은, 신뢰감 있는, 유도 중심의 |
