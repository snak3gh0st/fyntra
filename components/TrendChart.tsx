"use client";

import { useId, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

type Point = { label: string; value: number };

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

/**
 * Renders even sparse/mostly-zero data as a legible shape: value 0 sits on
 * the baseline, not an empty box, and the one real data point still reads
 * as a deliberate peak rather than a rendering bug.
 */
export function TrendChart({
  data,
  format = "currency",
  compact = false,
}: {
  data: Point[];
  format?: "currency" | "count";
  compact?: boolean;
}) {
  const formatValue = format === "currency" ? (v: number) => `$${v.toFixed(0)}` : (v: number) => `${v}`;
  const gradientId = useId();
  const reducedMotion = useReducedMotion() ?? false;
  const width = compact ? 160 : 600;
  const height = compact ? 44 : 150;
  const padY = compact ? 4 : 14;

  const { linePath, areaPath, points, peakIndex } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.value));
    const step = data.length > 1 ? width / (data.length - 1) : 0;
    const points = data.map((d, i) => ({
      x: data.length > 1 ? i * step : width / 2,
      y: height - padY - (d.value / max) * (height - padY * 2),
      value: d.value,
      label: d.label,
    }));
    const linePath = buildPath(points);
    const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z` : "";
    let peakIndex = 0;
    data.forEach((d, i) => {
      if (d.value > data[peakIndex].value) peakIndex = i;
    });
    return { linePath, areaPath, points, peakIndex };
  }, [data, width, height, padY]);

  if (data.length === 0) return null;

  return (
    <div className={compact ? "w-40" : "w-full"}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="Gráfico de tendência">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-teal)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.3 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--color-teal)"
          strokeWidth={compact ? 1.75 : 2}
          strokeLinecap="round"
          initial={reducedMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === peakIndex && p.value > 0 ? (compact ? 2.5 : 3.5) : compact ? 1.5 : 2.25}
            fill={i === peakIndex && p.value > 0 ? "var(--color-gold)" : "var(--color-teal)"}
          />
        ))}
      </svg>
      {!compact && (
        <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-muted">
          {data.map((d, i) => (
            <span key={i} className={i === peakIndex && d.value > 0 ? "font-semibold text-ink" : ""}>
              {i === peakIndex && d.value > 0 ? formatValue(d.value) : ""}
            </span>
          ))}
        </div>
      )}
      {!compact && (
        <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-muted">
          {data.map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export type { Point as TrendChartPoint };
