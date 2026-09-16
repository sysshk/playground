/*
  공통 — 아이콘 (lucide-react를 이름으로 꺼내 씀)

  @date : 2026-09-12
*/

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
  Menu,
  Minus,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  TriangleAlert,
  UserRound,
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
  menu: Menu,
  settings: Settings,
  sun: Sun,
  moon: Moon,
  user: UserRound,
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
