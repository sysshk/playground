# work — Rules

## Custom Rules
<!-- 프로젝트별 규칙을 여기에 작성하세요. 이 영역은 자동 업데이트되지 않습니다. -->

<!-- alioth:auto-start hash:b953be3fb703 -->
## Architecture (auto-generated)

**Stack**: typescript (react, nextjs) / pkg: npm

## Common Modules (Shared API)
**적용 범위 — 이 재사용 규칙은 *새로 작성하거나 사용자가 변경을 요청한 UI* 에만 적용됩니다 (CRITICAL). 이미 구현되어 동작 중인 기존 화면을 요청 없이 아래 컴포넌트들로 리팩터(교체·재배치)하지 마세요 — 데이터 바인딩·버그 수정 같은 국소 요구면 그 지점만 고치고 기존 마크업은 그대로 둡니다.** **아래는 이미 존재하는 공통 모듈/컴포넌트입니다. (신규/변경 UI에서) 같은 역할의 UI·로직을 새로 인라인으로 재구현하지 말고, 아래 것을 우선 재사용(import)하세요 (CRITICAL).** 화면 구성 시 디자인의 각 UI 요소(탭/카드/바/칩/입력 등)를 아래 목록에 1:1 매핑해, 동일 역할의 컴포넌트가 있으면 그대로 import 해 사용하고(예: 탭 → `TabGroup`, 하단바 → `BottomBar`), 직접 `<div>`/`<button>` 으로 같은 것을 다시 만들지 마세요. **import 만 해놓고 JSX 에서 실제로 쓰지 않으면 안 됩니다 (no-unused-vars 로 빌드 실패) — import 했으면 반드시 `<TabGroup .../>` 처럼 렌더링까지 교체하세요.** 상태/함수 prop(`onTabChange`/`onClick` 등)이 필요한 controlled 컴포넌트(예: `TabGroup`)는 **반드시 `"use client"` 래퍼 컴포넌트 안에서** 상태를 만들어 연결하세요 (예: `"use client"` + `const [tab,setTab]=useState(...)` → `<TabGroup activeTabId={tab} onTabChange={setTab}/>`). **Server Component(`page.tsx`)에 이런 컴포넌트를 직접 렌더링하지 마세요 — 빈 함수 `onTabChange={()=>{}}` 라도 `Event handlers cannot be passed to Client Component props` 로 빌드가 깨집니다.** page.tsx 에는 그 위치에 client 래퍼(`<MainTabs/>`)만 두어 디자인 순서를 보존하세요. 호출 시 아래 시그니처의 정확한 이름·파라미터를 따르세요. **금액·날짜 등 포맷 로직도 같은 원칙입니다 (CRITICAL): 아래에 `formatKRW`/`formatDate` 같은 유틸이 있으면 그것을 import 해 호출하고, 동일 로직을 인라인으로 다시 작성하지 마세요** (실측: `formatKRW(v)` 가 있는데 `new Intl.NumberFormat('ko-KR').format(v)+'원'` 로 본문을 그대로 재구현 — formatKRW 와 100% 동일). 아래 목록은 **시그니처만** 보여줍니다 — 출력 형식이 확신되지 않으면 인라인 재구현 대신 그 파일을 `read_file` 로 열어 확인한 뒤 재사용하세요. 한 화면 안에서 한 곳만 유틸을 쓰고 다른 곳은 인라인하는 불일치도 금지합니다.
- `lib/prisma.ts` (imported by 5 files)
  - `prisma`
- `components/mes/status-badge.tsx` (imported by 3 files)
  - `StatusBadge({ label, color, dot = true, }: { label: string; color: string; dot?: boolean; })`
- `components/mes/line-chart.tsx` (imported by 2 files)
  - `LineChart({ data, color = "#2DD4BF", unit = "", height = 180, showAxis = true, xLabel, }: LineChartProps)`
- `components/custom/session-provider.tsx` (imported by 1 files)
  - `SessionProvider({ children }: { children: ReactNode })`
- `components/mes/app-shell.tsx` (imported by 1 files)
  - `AppShell({ children }: { children: ReactNode })`
- `components/mes/stat-card.tsx` (imported by 1 files)
  - `StatCard({ label, value, unit, hint, accent = "var(--primary)", icon, }: { label: string; value: string | number; unit?: string; hint?: string; accent?: string…`

<!-- alioth:auto-end -->
