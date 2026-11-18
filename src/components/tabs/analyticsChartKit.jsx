import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/* Shared visual language for Motor/Battery Analytics — same gradient-area +
   glow-dot + dark-tooltip treatment already proven in LiveCharts.jsx, so
   every analytics chart in the app reads as one consistent system. */

export const PALETTE = {
  orange:  { color: "#f97316", grad: ["rgba(249,115,22,0.38)",  "rgba(249,115,22,0.01)"]  },
  purple:  { color: "#a78bfa", grad: ["rgba(167,139,250,0.38)", "rgba(167,139,250,0.01)"] },
  amber:   { color: "#fbbf24", grad: ["rgba(251,191,36,0.38)",  "rgba(251,191,36,0.01)"]  },
  emerald: { color: "#34d399", grad: ["rgba(52,211,153,0.38)",  "rgba(52,211,153,0.01)"]  },
  indigo:  { color: "#818cf8", grad: ["rgba(129,140,248,0.38)", "rgba(129,140,248,0.01)"] },
  sky:     { color: "#38bdf8", grad: ["rgba(56,189,248,0.38)",  "rgba(56,189,248,0.01)"]  },
  rose:    { color: "#fb7185", grad: ["rgba(251,113,133,0.38)", "rgba(251,113,133,0.01)"] },
  cyan:    { color: "#22d3ee", grad: ["rgba(34,211,238,0.38)",  "rgba(34,211,238,0.01)"]  },
};

const fmt = (v, fixed = 1) =>
  v == null || isNaN(v) ? "–" : Number(v).toFixed(fixed);

function Tip({ active, payload, label, color, unit, fixed, glow }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl text-xs border"
      style={{
        background: "rgba(8,8,18,0.98)",
        borderColor: color + "50",
        boxShadow: `0 0 24px ${glow || color + "30"}, 0 4px 16px rgba(0,0,0,0.6)`,
      }}
    >
      <div className="text-gray-500 mb-1 font-mono text-[10px] tracking-widest">{label}</div>
      <div className="text-lg font-black tabular-nums leading-none" style={{ color }}>
        {fmt(payload[0]?.value, fixed)}
        <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span>
      </div>
    </div>
  );
}

/**
 * One trend chart: gradient area, soft grid, glowing hover dot. Works for
 * both a multi-day trend (xKey="day") and a single-day hourly trend
 * (xKey="hour") — the caller just shapes the data and labels differently.
 */
export function TrendChart({
  data,
  xKey = "x",
  yKey = "y",
  palette = PALETTE.orange,
  unit = "",
  fixed = 1,
  xTickFormatter,
  warnLine,
  dangerLine,
  height = 220,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        No data for this period
      </div>
    );
  }

  const gradId = `grad-${xKey}-${yKey}-${palette.color.replace("#", "")}`;
  const filtId = `glow-${xKey}-${yKey}-${palette.color.replace("#", "")}`;

  // The backend returns `day` as a full ISO timestamp (e.g.
  // "2026-11-16T18:30:00.000Z"). Recharts has no idea that's a date unless
  // told, so left alone it prints the raw string — unreadable and
  // overlapping once a few ticks show. Format it short ("Nov 16") by
  // default; hourly data already arrives pre-formatted ("00:00") and needs
  // no further formatting, and an explicit xTickFormatter always wins.
  const defaultXTickFormatter =
    xTickFormatter ??
    (xKey === "day"
      ? (v) => {
          const d = new Date(v);
          return isNaN(d.getTime())
            ? v
            : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      : undefined);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.grad[0]} />
              <stop offset="100%" stopColor={palette.grad[1]} />
            </linearGradient>
            <filter id={filtId} x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid strokeDasharray="2 8" stroke="rgba(255,255,255,0.05)" vertical={false} />

          <XAxis
            dataKey={xKey}
            tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickFormatter={defaultXTickFormatter}
            interval="preserveStartEnd"
            minTickGap={40}
          />

          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => {
              const abs = Math.abs(v);
              if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
              return Number(v).toFixed(abs < 10 && abs > 0 ? 1 : 0);
            }}
          />

          <Tooltip
            content={(p) => (
              <Tip
                {...p}
                label={defaultXTickFormatter ? defaultXTickFormatter(p.label) : p.label}
                color={palette.color}
                unit={unit}
                fixed={fixed}
              />
            )}
            cursor={{ stroke: palette.color + "30", strokeWidth: 1, strokeDasharray: "4 4" }}
          />

          {warnLine != null && (
            <ReferenceLine y={warnLine} stroke="#eab308" strokeDasharray="4 4" strokeOpacity={0.5} />
          )}
          {dangerLine != null && (
            <ReferenceLine y={dangerLine} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
          )}

          <Area
            type="monotone"
            dataKey={yKey}
            stroke={palette.color}
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: palette.color,
              stroke: "rgba(0,0,0,0.8)",
              strokeWidth: 2,
              filter: `url(#${filtId})`,
            }}
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartCard({ title, subtitle, children }) {
  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-gradient-to-br from-gray-900/90 to-black/80 backdrop-blur-sm shadow-xl">
      <div className="mb-3">
        <h3 className="text-sm font-bold tracking-wide text-gray-200">{title}</h3>
        {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <div className="border border-white/10 p-6 rounded-2xl bg-gradient-to-br from-gray-900/90 to-black/80 backdrop-blur-sm shadow-xl">
      <h3 className="font-bold text-gray-200 mb-5 text-base border-b border-white/10 pb-3 tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Stat({ label, value, unit, fixed = 1, palette = PALETTE.orange, warn, danger }) {
  if (value == null || isNaN(value)) {
    return (
      <div className="flex justify-between items-center bg-gray-800/40 px-5 py-4 rounded-xl border border-white/5">
        <span className="text-gray-400 font-medium">{label}</span>
        <span className="text-gray-600">–</span>
      </div>
    );
  }

  const n = Number(value);
  let color = palette.color;
  if (warn != null && danger != null) {
    if (n >= danger) color = "#ef4444";
    else if (n >= warn) color = "#eab308";
  }

  return (
    <div className="flex justify-between items-center bg-gray-800/40 px-5 py-4 rounded-xl border border-white/5 hover:border-white/15 transition-colors">
      <span className="text-gray-300 font-medium">{label}</span>
      <div className="px-3 py-1 rounded-lg" style={{ background: color + "15" }}>
        <span className="font-bold text-lg tabular-nums" style={{ color }}>
          {fmt(n, fixed)}
          <span className="text-xs font-normal opacity-70 ml-1">{unit}</span>
        </span>
      </div>
    </div>
  );
}
