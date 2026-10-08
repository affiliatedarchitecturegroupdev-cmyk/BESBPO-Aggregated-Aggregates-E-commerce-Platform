"use client";

import { Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";

/**
 * Insights charts (dataviz method: thin marks, 2px lines, ≤24px bars with a
 * 4px rounded data-end, a 2px surface gap between stacked segments,
 * hairline grid, one y-axis, crosshair tooltip). Series colours are the
 * validated categorical slots in fixed order; the comparison period is a
 * recessive grey. Every chart sits in a ChartCard with a table view, so no
 * value depends on colour or hover alone.
 */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"] as const;
export const PREVIOUS = "#898781";
const SURFACE = "#ffffff";
const GRID = "#e1e0d9";
const MUTED = "#6b6560";

export type Format = "rand" | "count" | "percent";

const RAND = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function formatValue(v: number | null | undefined, format: Format) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (format === "rand") return `${v < 0 ? "-" : ""}R${RAND.format(Math.abs(v))}`;
  if (format === "percent") return `${NUM.format(v)}%`;
  return NUM.format(v);
}

function axisValue(v: number, format: Format) {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const prefix = format === "rand" ? "R" : "";
  const suffix = format === "percent" ? "%" : "";
  if (a >= 1_000_000) return `${sign}${prefix}${NUM.format(a / 1_000_000)}m${suffix}`;
  if (a >= 1000) return `${sign}${prefix}${NUM.format(a / 1000)}k${suffix}`;
  return `${sign}${prefix}${NUM.format(a)}${suffix}`;
}

/** A bar whose data end (top for positive, bottom for negative values) is rounded 4px; the baseline end stays square. */
function DataEndBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; value?: number | number[] }) {
  const { x = 0, width = 0, fill } = props;
  let { y = 0, height = 0 } = props;
  if (height < 0) {
    y += height;
    height = -height;
  }
  if (!height || !width) return null;
  const raw = Array.isArray(props.value) ? props.value[1] - props.value[0] : props.value ?? 0;
  const r = Math.min(4, width / 2, height);
  const d =
    raw < 0
      ? `M${x},${y} h${width} v${height - r} q0,${r} ${-r},${r} h${-(width - 2 * r)} q${-r},0 ${-r},${-r} Z`
      : `M${x},${y + height} v${-(height - r)} q0,${-r} ${r},${-r} h${width - 2 * r} q${r},0 ${r},${r} v${height - r} Z`;
  return <path d={d} fill={fill} />;
}

type SeriesDef = { key: string; name: string; color?: string };

export function Legend({ items }: { items: { name: string; color: string; kind: "line" | "rect" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 font-body text-xs text-slate">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5">
          <span aria-hidden className={i.kind === "line" ? "h-0.5 w-4 rounded-full" : "h-2.5 w-2.5 rounded-[2px]"} style={{ background: i.color }} />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

function ChartTooltip({ active, payload, label, format, labels }: TooltipProps<number, string> & { format: Format; labels?: Record<string, string> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Record<string, unknown> | undefined;
  const heading = (row?.tooltipLabel as string | undefined) ?? String(label ?? "");
  return (
    <div className="rounded-sm border border-basalt/10 bg-white px-3 py-2 font-body text-xs shadow-sm">
      <p className="text-slate">{heading}</p>
      <ul className="mt-1 space-y-0.5">
        {payload
          .filter((p) => p.dataKey !== undefined)
          .map((p) => (
            <li key={String(p.dataKey)} className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: p.color }} />
              <span className="font-semibold tabular-nums text-basalt">{formatValue(p.value as number, format)}</span>
              <span className="text-slate">{labels?.[String(p.dataKey)] ?? p.name}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

const axisProps = { stroke: GRID, tick: { fill: MUTED, fontSize: 11 }, tickLine: false } as const;

/**
 * One measure over time: the current period as a line with a light wash,
 * the comparison period (aligned bucket by bucket) as a grey line.
 */
export function TrendChart({
  data,
  format,
  currentName,
  previousName,
  height = 240,
}: {
  data: { label: string; tooltipLabel?: string; current: number; previous?: number | null }[];
  format: Format;
  currentName: string;
  previousName?: string | null;
  height?: number;
}) {
  const hasPrevious = Boolean(previousName) && data.some((d) => d.previous !== null && d.previous !== undefined);
  return (
    <div>
      {hasPrevious && (
        <Legend
          items={[
            { name: currentName, color: SERIES[0], kind: "line" },
            { name: previousName!, color: PREVIOUS, kind: "line" },
          ]}
        />
      )}
      <div style={{ height }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" {...axisProps} minTickGap={16} />
            <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => axisValue(v, format)} />
            <Tooltip
              cursor={{ stroke: MUTED, strokeWidth: 1 }}
              content={<ChartTooltip format={format} labels={{ current: currentName, previous: previousName ?? "" }} />}
            />
            {hasPrevious && <Line type="linear" dataKey="previous" name={previousName!} stroke={PREVIOUS} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />}
            <Area
              type="linear"
              dataKey="current"
              name={currentName}
              stroke={SERIES[0]}
              strokeWidth={2}
              fill={SERIES[0]}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Columns per bucket — stacked when there is more than one series (same unit only). */
export function ColumnChart({
  data,
  series,
  format,
  height = 240,
}: {
  data: Record<string, string | number | null>[];
  series: SeriesDef[];
  format: Format;
  height?: number;
}) {
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? SERIES[i % SERIES.length] }));
  const stacked = colored.length > 1;
  const hasNegative = data.some((d) => colored.some((s) => Number(d[s.key] ?? 0) < 0));
  return (
    <div>
      {stacked && <Legend items={colored.map((s) => ({ name: s.name, color: s.color, kind: "rect" }))} />}
      <div style={{ height }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" {...axisProps} minTickGap={16} />
            <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => axisValue(v, format)} />
            {hasNegative && <ReferenceLine y={0} stroke="#c3c2b7" />}
            <Tooltip cursor={{ fill: "rgba(28,27,26,0.04)" }} content={<ChartTooltip format={format} labels={Object.fromEntries(colored.map((s) => [s.key, s.name]))} />} />
            {colored.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId={stacked ? "stack" : undefined}
                fill={s.color}
                maxBarSize={24}
                stroke={stacked ? SURFACE : undefined}
                strokeWidth={stacked ? 2 : 0}
                radius={!stacked || i === colored.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Two or three measures of the same unit side by side per bucket (e.g. gross vs net profit). */
export function GroupedColumns({ data, series, format, height = 260 }: { data: Record<string, string | number | null>[]; series: SeriesDef[]; format: Format; height?: number }) {
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? SERIES[i % SERIES.length] }));
  return (
    <div>
      <Legend items={colored.map((s) => ({ name: s.name, color: s.color, kind: "rect" }))} />
      <div style={{ height }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v: number) => axisValue(v, format)} />
            <ReferenceLine y={0} stroke="#c3c2b7" />
            <Tooltip cursor={{ fill: "rgba(28,27,26,0.04)" }} content={<ChartTooltip format={format} labels={Object.fromEntries(colored.map((s) => [s.key, s.name]))} />} />
            {colored.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} maxBarSize={20} shape={<DataEndBar />} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
