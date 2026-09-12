// 아이콘 — lucide-react를 이름으로 꺼내 쓰는 얇은 래퍼.
//
// 화면 곳곳이 <Icon name="trash" />처럼 이름으로 부르고 있어서, 여기서 이름과
// lucide 컴포넌트를 짝지어 둔다. 선 굵기 같은 공통 스타일도 한 곳에서 정한다.

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Dumbbell,
  Flame,
  LogOut,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Users,
  X,
  type LucideProps,
} from "lucide-react";

const ICONS = {
  dumbbell: Dumbbell,
  users: Users,
  target: Target,
  trend: TrendingUp,
  clipboard: ClipboardList,
  flame: Flame,
  phone: Smartphone,
  check: Check,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  spark: Sparkles,
  plus: Plus,
  minus: Minus,
  close: X,
  search: Search,
  pencil: Pencil,
  trash: Trash2,
  alert: TriangleAlert,
  logout: LogOut,
  calendar: Calendar,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock,
  undo: RotateCcw,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  ...rest
}: { name: IconName } & LucideProps) {
  const Component = ICONS[name];
  return (
    <Component size={size} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />
  );
}
