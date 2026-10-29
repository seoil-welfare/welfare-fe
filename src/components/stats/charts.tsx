import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { DONUT_ORDER, behaviorTypeLabel, behaviorTypeMeta } from "@/data/catalog";
import { EmptyState } from "@/components/common/states";
import type { BehaviorType, CountItem } from "@/types";
import type { TrendPoint } from "@/services/statsService";
import { cn } from "@/lib/utils";

/**
 * 차트 규칙 (가이드 2-3 4~5번).
 * - 값이 0이면 막대 길이도 0, 라벨은 '0건'을 유지한다
 * - 조각·막대마다 항목명·값·단위를 직접 표기한다 (범례만으로 구분시키지 않는다)
 * - 도넛 조각 사이 흰색 2px, chart-3/chart-4에는 chart-2 색 1px 외곽선
 * - 도넛 고정 대응: 자해=chart-1, 타해=chart-2, 파괴행동=chart-3, 기타=chart-4
 * - 월별 추이는 선택 기간만 진하게, 단위는 '회'가 아니라 '건'
 */

/** 가로 막대 — 항목별 순위 강조 (FR-38~FR-42, FR-48, FR-54~FR-56) */
export function HorizontalBars({
  items,
  tone = "primary",
  maxVisible,
  onSelect,
  emptyMessage = "기록이 없어요",
}: {
  items: readonly CountItem[];
  tone?: "primary" | "behavior";
  maxVisible?: number;
  onSelect?: (label: string) => void;
  emptyMessage?: string;
}) {
  const visible = maxVisible ? items.slice(0, maxVisible) : items;
  if (visible.length === 0) return <EmptyState message={emptyMessage} />;
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <ul className="flex flex-col gap-3">
      {visible.map((item, index) => {
        const percent = (item.count / max) * 100;
        // 순위 강조 목적의 단일 계열 차트에만 값에 따른 명도를 쓴다
        const shade =
          tone === "behavior"
            ? "var(--behavior)"
            : ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"][Math.min(index, 2)];

        const row = (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate type-body text-foreground">{item.label}</span>
              <span className="tnum shrink-0 type-body font-medium text-foreground">
                {item.count}건
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-[width] duration-150"
                style={{
                  width: percent + "%",
                  backgroundColor: shade,
                }}
              />
            </div>
          </>
        );

        return (
          <li key={item.label}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(item.label)}
                className="w-full rounded-control p-1 text-left transition-colors duration-150 hover:bg-accent"
              >
                {row}
              </button>
            ) : (
              <div className="p-1">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 기간 추이 막대 (FR-35). 각 구간에 기록 건수와 기간 정보를 표시한다 */
export function TrendBars({ points }: { points: readonly TrendPoint[] }) {
  const hasAny = points.some((p) => p.count > 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points as TrendPoint[]} margin={{ top: 20, right: 4, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false} label={renderBarLabel}>
              {points.map((point) => (
                <Cell
                  key={point.label}
                  fill={point.isCurrent ? "var(--chart-1)" : "var(--chart-4)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="type-caption text-muted-foreground">단위: 건 (세부 행동 선택 건수)</p>
      {!hasAny ? <p className="type-caption text-muted-foreground">이 구간에는 기록이 없어요.</p> : null}
    </div>
  );
}

function renderBarLabel(props: {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  value?: string | number | (string | number)[];
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const value = Array.isArray(props.value) ? props.value[0] : props.value;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={12}
      fill="var(--foreground)"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {String(value ?? 0)}건
    </text>
  );
}

/** 유형별 도넛 (FR-36) */
export function BehaviorDonut({
  counts,
  className,
}: {
  counts: Record<BehaviorType, number>;
  className?: string;
}) {
  const total = DONUT_ORDER.reduce((sum, type) => sum + counts[type], 0);
  const data = DONUT_ORDER.map((type) => ({
    type,
    label: behaviorTypeLabel(type),
    count: counts[type],
    color: behaviorTypeMeta(type).chartVar,
  }));
  // 0건 조각은 그리지 않는다. 남겨 두면 그 자리에 틈 선만 그어진다
  const slices =
    total > 0
      ? data.filter((entry) => entry.count > 0)
      : [{ label: "기록 없음", count: 1, color: "var(--secondary)" }];

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center", className)}>
      <div className="h-40 w-40 shrink-0 self-center">
        {/* 0건일 때의 도넛 표시 방식은 미확정(FR-36). 시연에서는 회색 빈 고리로 보여 준다 */}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="label"
              innerRadius={44}
              outerRadius={74}
              // 조각 사이 틈은 카드 배경색 테두리로 낸다. paddingAngle은 각도라서
              // 바깥은 넓고 안쪽은 좁은 쐐기 모양 틈이 된다. 테두리는 어디서나 같은 폭이다
              stroke="var(--card)"
              // 조각이 하나면 고리 전체라 틈이 없다 (테두리를 그리면 이음새 선이 생긴다)
              strokeWidth={slices.length > 1 ? 3 : 0}
              strokeLinejoin="round"
              isAnimationActive={false}
            >
              {slices.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* 범례만으로 구분시키지 않도록 항목명·값·비율을 직접 적는다 */}
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {data.map((entry) => (
          <li key={entry.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="min-w-0 flex-1 truncate type-body">{entry.label}</span>
            <span className="tnum shrink-0 type-body font-medium">{entry.count}건</span>
            <span className="tnum w-12 shrink-0 text-right type-caption text-muted-foreground">
              {total > 0 ? Math.round((entry.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
