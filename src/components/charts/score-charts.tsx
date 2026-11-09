"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_INFO } from "@/components/questions/category-badge";
import type { Category } from "@/types";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex justify-between gap-4 text-muted-foreground">
          {row.label} <span className="font-mono font-semibold text-foreground tabular-nums">{row.value}</span>
        </p>
      ))}
    </div>
  );
}

export interface CategoryBarDatum {
  category: Category;
  score: number;
  threshold: number;
  max: number;
}

/** Skor tiap kategori berdampingan dengan ambang batasnya, pada satu skala poin. */
export function CategoryScoreChart({ data }: { data: CategoryBarDatum[] }) {
  return (
    <div>
      <div className="h-64" role="img" aria-label={data.map((d) => `${d.category}: skor ${d.score}, ambang ${d.threshold}`).join("; ")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 8, left: -18, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="category" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 225]} ticks={[0, 75, 150, 225]} tick={AXIS} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.5 }}
              content={({ active, payload }) => {
                const datum = payload?.[0]?.payload as CategoryBarDatum | undefined;
                if (!active || !datum) return null;
                return (
                  <TooltipBox
                    title={`${datum.category} - ${CATEGORY_INFO[datum.category].name}`}
                    rows={[
                      { label: "Skor", value: `${datum.score}/${datum.max}` },
                      { label: "Ambang batas", value: String(datum.threshold) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="score" name="Skor Anda" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.category} fill={CATEGORY_INFO[d.category].fill} />
              ))}
              <LabelList dataKey="score" position="top" style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }} />
            </Bar>
            <Bar dataKey="threshold" name="Ambang batas" fill="var(--chart-neutral)" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
              <LabelList dataKey="threshold" position="top" style={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="flex gap-0.5" aria-hidden>
            <span className="h-3 w-1.5 rounded-sm bg-chart-twk" />
            <span className="h-3 w-1.5 rounded-sm bg-chart-tiu" />
            <span className="h-3 w-1.5 rounded-sm bg-chart-tkp" />
          </span>
          Skor Anda
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: "var(--chart-neutral)" }} aria-hidden />
          Ambang batas acuan
        </li>
      </ul>
    </div>
  );
}

export interface TrendDatum {
  label: string;
  packageId: string;
  date: string;
  score: number;
}

/** Perkembangan total skor simulasi; garis putus-putus adalah total ambang batas. */
export function ScoreTrendChart({ data, threshold }: { data: TrendDatum[]; threshold: number }) {
  return (
    <div className="h-64" role="img" aria-label={`Skor simulasi: ${data.map((d) => `${d.label} ${d.score}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 550]} ticks={[0, 110, 220, 330, 440, 550]} tick={AXIS} axisLine={false} tickLine={false} />
          <ReferenceLine
            y={threshold}
            stroke="var(--chart-neutral)"
            strokeDasharray="4 4"
            label={{ value: `Ambang ${threshold}`, position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            cursor={{ stroke: "var(--chart-neutral)" }}
            content={({ active, payload }) => {
              const datum = payload?.[0]?.payload as TrendDatum | undefined;
              if (!active || !datum) return null;
              return (
                <TooltipBox
                  title={`Simulasi ${datum.label}`}
                  rows={[
                    { label: "Paket", value: datum.packageId },
                    { label: "Tanggal", value: datum.date },
                    { label: "Skor", value: `${datum.score}/550` },
                  ]}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface PerformanceDatum {
  category: Category;
  percent: number;
  answered: number;
}

/** Capaian per kategori pada soal yang dijawab, dalam persen. */
export function CategoryPerformanceChart({ data }: { data: PerformanceDatum[] }) {
  return (
    <div className="h-48" role="img" aria-label={data.map((d) => `${d.category} ${Math.round(d.percent)} persen`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: -12, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" />
          <YAxis type="category" dataKey="category" tick={AXIS} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={({ active, payload }) => {
              const datum = payload?.[0]?.payload as PerformanceDatum | undefined;
              if (!active || !datum) return null;
              return (
                <TooltipBox
                  title={CATEGORY_INFO[datum.category].name}
                  rows={[
                    { label: "Capaian", value: `${Math.round(datum.percent)}%` },
                    { label: "Soal dijawab", value: String(datum.answered) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="percent" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.category} fill={CATEGORY_INFO[d.category].fill} />
            ))}
            <LabelList
              dataKey="percent"
              position="right"
              formatter={(value: unknown) => `${Math.round(Number(value))}%`}
              style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
