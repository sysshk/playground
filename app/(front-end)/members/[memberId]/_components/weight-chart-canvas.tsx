/*
  회원 상세·내 기록 화면 — 체중 그래프 캔버스 (Chart.js 설정·점 숫자·목표선)
  그래프 라이브러리가 커서 weight-chart가 화면이 뜬 뒤에 이 파일을 따로 받는다.

  @date : 2026-09-15
*/

"use client";

import {
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { formatDateShort } from "@/lib/client";
import { signed, type Stats } from "./weight-chart";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip);

/** 점 위 숫자는 이 개수까지만 모두 붙이고, 넘으면 최신 값만 붙인다. */
const LABEL_ALL_LIMIT = 8;

export default function WeightChartCanvas({ stats }: { stats: Stats }) {
  const chart = useMemo(() => buildChart(stats), [stats]);

  return (
    <div className="relative h-48 w-full md:h-56">
      {chart && (
        <Line
          // 플러그인(점 숫자·목표선)은 차트를 만들 때만 들어가서, 값이 바뀌면 새로 만든다.
          redraw
          data={chart.data}
          options={chart.options}
          plugins={chart.plugins}
          aria-label="날짜별 체중 변화 그래프"
          role="img"
        />
      )}
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
  line: string;
  hero: string;
  heroInk: string;
  font: string;
};

/** 캔버스는 CSS 변수를 못 읽어서 지금 테마의 값을 꺼내 넘긴다. */
function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    primary: read("--primary"),
    card: read("--card"),
    ink: read("--foreground"),
    subtle: read("--color-subtle"),
    goal: read("--color-goal"),
    line: read("--border"),
    hero: read("--color-hero"),
    heroInk: read("--color-hero-foreground"),
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

function buildChart(stats: Stats): {
  data: ChartData<"line", { x: number; y: number }[]>;
  options: ChartOptions<"line">;
  plugins: Plugin<"line">[];
} {
  const colors = readColors();
  const { points, first, last, goal } = stats;
  const lastIndex = points.length - 1;
  // 기록이 하루뿐이면 폭이 0이라 하루 폭을 준다.
  const span = Math.max(last.time - first.time, 86_400_000);
  // 목표선이 보이도록 세로 범위에 목표도 넣는다.
  const min = Math.min(stats.min, goal?.target ?? Infinity);
  const max = Math.max(stats.max, goal?.target ?? -Infinity);
  // 눈금 간격을 범위에 맞춰 고르고, 위아래 끝도 그 간격에 맞춰 자른다.
  const range = max - min;
  const step = range <= 3 ? 0.5 : range <= 6 ? 1 : range <= 12 ? 2 : 5;
  const yMin = Math.floor((min - step * 0.5) / step) * step;
  const yMax = Math.ceil((max + step * 0.5) / step) * step;

  const data = {
    datasets: [
      {
        data: points.map((point) => ({ x: point.time, y: point.weight })),
        borderColor: colors.primary,
        borderWidth: 2,
        pointRadius: 5,
        pointBorderWidth: 2.5,
        pointBorderColor: colors.primary,
        pointBackgroundColor: points.map((_, i) =>
          i === lastIndex ? colors.primary : colors.card,
        ),
        pointHoverRadius: 7,
        pointHoverBackgroundColor: colors.primary,
        pointHitRadius: 20,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 24, right: 12, left: 4 } },
    interaction: { mode: "nearest", axis: "x", intersect: false },
    scales: {
      x: {
        type: "linear",
        min: first.time - span * 0.08,
        max: last.time + span * 0.08,
        afterBuildTicks: (axis) => {
          axis.ticks = points.map((point) => ({ value: point.time }));
        },
        ticks: {
          color: colors.subtle,
          font: { family: colors.font, size: 11, weight: 600 },
          padding: 8,
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
        min: yMin,
        max: yMax,
        ticks: {
          stepSize: step,
          color: colors.subtle,
          font: { family: colors.font, size: 11 },
          padding: 8,
          callback: (value) => (Number.isInteger(value) ? `${value}` : Number(value).toFixed(1)),
        },
        grid: { color: colors.line, drawTicks: false },
        border: { display: false, dash: [3, 4] },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.hero,
        titleColor: withAlpha(colors.heroInk, 0.65),
        bodyColor: colors.heroInk,
        titleFont: { family: colors.font, size: 11, weight: "normal" },
        bodyFont: { family: colors.font, size: 14, weight: "bold" },
        padding: { x: 12, y: 8 },
        cornerRadius: 10,
        caretSize: 0,
        displayColors: false,
        yAlign: "bottom",
        callbacks: {
          title: (items) => formatDateShort(points[items[0].dataIndex].date),
          label: (item) => {
            const point = points[item.dataIndex];
            return point.delta === null
              ? `${point.weight}kg`
              : `${point.weight}kg  ${signed(point.delta)}`;
          },
        },
      },
    },
  };

  const pointLabels: Plugin<"line"> = {
    id: "weightPointLabels",
    afterDatasetsDraw: (chart) => {
      const { ctx } = chart;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      chart.getDatasetMeta(0).data.forEach((element, i) => {
        const isLast = i === lastIndex;
        if (points.length > LABEL_ALL_LIMIT && !isLast) return;
        ctx.font = `${isLast ? 800 : 700} ${isLast ? 13 : 12}px ${colors.font}`;
        ctx.fillStyle = isLast ? colors.primary : colors.ink;
        ctx.fillText(`${points[i].weight}`, element.x, element.y - 10);
      });
      ctx.restore();
    },
  };

  const goalLine: Plugin<"line"> = {
    id: "weightGoalLine",
    beforeDatasetsDraw: (chart) => {
      if (!goal) return;
      const { ctx, chartArea } = chart;
      const y = chart.scales.y.getPixelForValue(goal.target);
      const text = `목표 ${goal.target}kg`;

      ctx.save();
      ctx.font = `800 11px ${colors.font}`;
      const width = ctx.measureText(text).width + 14;
      const height = 20;
      const left = chartArea.right - width;

      // 점선
      ctx.strokeStyle = colors.goal;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(left - 4, y);
      ctx.stroke();

      // 이름표
      ctx.setLineDash([]);
      ctx.fillStyle = colors.goal;
      ctx.beginPath();
      ctx.roundRect(left, y - height / 2, width, height, height / 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, left + width / 2, y + 0.5);
      ctx.restore();
    },
  };

  return { data, options, plugins: [goalLine, pointLabels] };
}
