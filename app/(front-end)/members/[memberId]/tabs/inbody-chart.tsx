/*
  회원 상세·내 기록 화면 — 체중·인바디 그래프 캔버스
  체중은 굵은 선과 채움(왼쪽 축), 골격근량·체지방량은 가는 선(오른쪽 축). 목표선·끝 값·세로 안내선
  그래프 라이브러리가 커서 inbody-tab이 화면이 뜬 뒤에 이 파일을 따로 받음

  @date : 2026-09-15
*/

"use client";

import {
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { useMemo } from "react";
import { Chart } from "react-chartjs-2";
import { formatDateShort } from "@/lib/client";
import { type Stats } from "./inbody-tab";
import { signed } from "./tab-ui";

ChartJS.register(LinearScale, LineController, LineElement, PointElement, Tooltip, Filler);

/** 체중·인바디 그래프 */
export default function WeightChartCanvas({ stats }: { stats: Stats }) {
  const chart = useMemo(() => buildChart(stats), [stats]);

  return (
    <div className="relative h-56 w-full md:h-64">
      <Chart
        type="line"
        // 플러그인(마지막 값·목표선·안내선)은 차트를 만들 때만 들어가서, 값이 바뀌면 새로 만듦
        redraw
        data={chart.data}
        options={chart.options}
        plugins={chart.plugins}
        aria-label="날짜별 체중·골격근량·체지방량 선 그래프"
        role="img"
      />
    </div>
  );
}

// ── Chart.js 설정 ─────────────────────────────────────

type Colors = {
  primary: string;
  card: string;
  ink: string;
  subtle: string;
  goal: string;
  hero: string;
  heroInk: string;
  font: string;
};

/** 캔버스는 CSS 변수를 못 읽어서 지금 테마의 값을 꺼내 넘김 */
function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    primary: read("--primary"),
    card: read("--card"),
    ink: read("--foreground"),
    subtle: read("--subtle"),
    goal: read("--goal"),
    hero: read("--hero"),
    heroInk: read("--hero-foreground"),
    font: getComputedStyle(document.body).fontFamily,
  };
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 값 범위를 눈금 간격에 맞춰 위아래로 넓힘 — 눈금이 5~6개쯤 되게 */
function niceRange(min: number, max: number) {
  const range = max - min;
  const step = range <= 2.5 ? 0.5 : range <= 5 ? 1 : range <= 10 ? 2 : range <= 25 ? 5 : 10;
  return {
    step,
    min: Math.floor((min - step * 0.5) / step) * step,
    max: Math.ceil((max + step * 0.5) / step) * step,
  };
}

/** 선 아래를 위에서 아래로 옅어지게 채움 */
function fadeFill(color: string, strength: number) {
  return (context: { chart: ChartJS }) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return withAlpha(color, strength / 2);
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, withAlpha(color, strength));
    gradient.addColorStop(1, withAlpha(color, 0));
    return gradient;
  };
}

/** 날짜(ms) → YYYY-MM-DD */
function dayOf(time: number) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 누른 날짜에 세로 안내선 */
function crosshair(color: string): Plugin<"line"> {
  return {
    id: "crosshair",
    afterDatasetsDraw: (chart) => {
      const active = chart.getActiveElements()[0];
      if (!active) return;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(active.element.x, chartArea.top);
      ctx.lineTo(active.element.x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };
}

function buildChart(stats: Stats) {
  const colors = readColors();
  const { points, first, last, goal, muscle, fat } = stats;
  const lastIndex = points.length - 1;
  // 기록이 하루뿐이면 폭이 0이라 하루 폭을 줌
  const span = Math.max(last.time - first.time, 86_400_000);
  const hasInbody = muscle.length > 0 || fat.length > 0;

  // 왼쪽 — 체중과 목표
  const left = niceRange(
    Math.min(stats.min, goal?.target ?? Infinity),
    Math.max(stats.max, goal?.target ?? -Infinity),
  );
  // 오른쪽 — 골격근량·체지방량
  const inbodyValues = [...muscle, ...fat].map((p) => p.value);
  const right = hasInbody ? niceRange(Math.min(...inbodyValues), Math.max(...inbodyValues)) : null;

  const lines = [
    ["골격근량", muscle, colors.ink],
    ["체지방량", fat, colors.goal],
  ] as const;

  const data: ChartData<"line", { x: number; y: number }[]> = {
    datasets: [
      {
        type: "line",
        label: "체중",
        yAxisID: "y",
        data: points.map((p) => ({ x: p.time, y: p.weight })),
        // 세 선 중 주인공 — 가장 굵게, 아래를 옅게 채움
        borderColor: colors.primary,
        borderWidth: 3.5,
        tension: 0.3,
        fill: "start",
        backgroundColor: fadeFill(colors.primary, 0.28),
        pointRadius: points.map((_, i) => (i === lastIndex ? 5 : 3)),
        pointBorderWidth: 2,
        pointBorderColor: colors.primary,
        pointBackgroundColor: points.map((_, i) => (i === lastIndex ? colors.primary : colors.card)),
        pointHoverRadius: 6,
        pointHitRadius: 16,
        order: 1,
      },
      ...lines
        .filter(([, series]) => series.length > 0)
        .map(([label, series, color]) => ({
          type: "line" as const,
          label,
          yAxisID: "y1",
          data: series.map((p) => ({ x: p.time, y: p.value })),
          borderColor: color,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3.5,
          pointBorderWidth: 2,
          pointBorderColor: color,
          pointBackgroundColor: color,
          pointHoverRadius: 6,
          pointHitRadius: 16,
          order: 0,
        })),
    ],
  };

  const tick = { color: colors.subtle, font: { family: colors.font, size: 11 }, padding: 6 };
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 26, right: 4, left: 4 } },
    interaction: { mode: "x", intersect: false },
    scales: {
      x: {
        type: "linear",
        min: first.time - span * 0.05,
        max: last.time + span * 0.05,
        afterBuildTicks: (axis) => {
          axis.ticks = points.map((p) => ({ value: p.time }));
        },
        ticks: {
          ...tick,
          font: { family: colors.font, size: 11, weight: 600 },
          autoSkipPadding: 20,
          maxRotation: 0,
          callback: (value) => {
            const d = new Date(Number(value));
            return `${d.getMonth() + 1}/${d.getDate()}`;
          },
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        position: "left",
        min: left.min,
        max: left.max,
        ticks: { ...tick, stepSize: left.step },
        grid: { color: withAlpha(colors.subtle, 0.15), drawTicks: false },
        border: { display: false },
      },
      ...(right
        ? {
            y1: {
              position: "right" as const,
              min: right.min,
              max: right.max,
              ticks: { ...tick, stepSize: right.step },
              grid: { display: false },
              border: { display: false },
            },
          }
        : {}),
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.hero,
        titleColor: withAlpha(colors.heroInk, 0.65),
        bodyColor: colors.heroInk,
        titleFont: { family: colors.font, size: 11, weight: "normal" },
        bodyFont: { family: colors.font, size: 13, weight: "bold" },
        padding: { x: 12, y: 8 },
        cornerRadius: 10,
        caretSize: 0,
        boxPadding: 4,
        displayColors: hasInbody,
        callbacks: {
          title: (items) => formatDateShort(dayOf(Number(items[0].parsed.x ?? 0))),
          label: (item) => {
            if (item.datasetIndex > 0) return `${item.dataset.label} ${item.parsed.y}kg`;
            const point = points[item.dataIndex];
            return point.delta === null
              ? `체중 ${point.weight}kg`
              : `체중 ${point.weight}kg  ${signed(point.delta)}`;
          },
        },
      },
    },
  };

  // 숫자는 마지막 체중 점에만 — 나머지는 누르면 말풍선으로 봄
  const lastLabel: Plugin<"line"> = {
    id: "weightLastLabel",
    afterDatasetsDraw: (chart) => {
      const element = chart.getDatasetMeta(0).data[lastIndex];
      if (!element) return;
      const { ctx } = chart;
      const text = `${last.weight}kg`;
      ctx.save();
      ctx.font = `800 12px ${colors.font}`;
      const width = ctx.measureText(text).width + 12;
      const x = Math.min(
        Math.max(element.x, chart.chartArea.left + width / 2),
        chart.chartArea.right - width / 2,
      );
      const y = element.y - 18;
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.roundRect(x - width / 2, y - 10, width, 20, 10);
      ctx.fill();
      ctx.fillStyle = colors.card;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y + 0.5);
      ctx.restore();
    },
  };

  const goalLine: Plugin<"line"> = {
    id: "weightGoalLine",
    beforeDatasetsDraw: (chart) => {
      if (!goal) return;
      const { ctx, chartArea } = chart;
      const y = chart.scales.y.getPixelForValue(goal.target);
      ctx.save();
      ctx.strokeStyle = colors.goal;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `800 11px ${colors.font}`;
      ctx.fillStyle = colors.goal;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText(`목표 ${goal.target}kg`, chartArea.left + 4, y - 4);
      ctx.restore();
    },
  };

  // 선 끝에 지금 값 — 오른쪽 축을 읽지 않아도 되게
  const lineEndLabels: Plugin<"line"> = {
    id: "lineEndLabels",
    afterDatasetsDraw: (chart) => {
      const { ctx } = chart;
      ctx.save();
      ctx.font = `800 12px ${colors.font}`;
      ctx.textBaseline = "middle";
      chart.data.datasets.forEach((dataset, index) => {
        if (index === 0) return;
        const elements = chart.getDatasetMeta(index).data;
        const end = elements[elements.length - 1];
        const value = (dataset.data[dataset.data.length - 1] as { y: number } | undefined)?.y;
        if (!end || value === undefined) return;
        const color = (dataset as { borderColor?: string }).borderColor ?? colors.ink;
        const text = value.toFixed(1);
        const width = ctx.measureText(text).width;
        // 오른쪽 끝을 넘으면 점의 왼쪽에 둠
        const x = end.x + 8 + width > chart.chartArea.right ? end.x - 8 - width : end.x + 8;
        ctx.fillStyle = color;
        ctx.fillText(text, x, end.y - 10);
      });
      ctx.restore();
    },
  };

  return { data, options, plugins: [goalLine, crosshair(colors.subtle), lastLabel, lineEndLabels] };
}
