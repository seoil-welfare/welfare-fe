import { FieldLabel } from "@/components/ui/field";

/** 시·분을 각각 선택하며, 종료에만 24:00을 허용한다. */
export function ActivityTimeSelect({ label, id, value, onChange, end = false, invalid = false }: {
  label: string; id: string; value?: string; onChange: (value: string | undefined) => void;
  end?: boolean; invalid?: boolean;
}) {
  const [hour = "", minute = "00"] = value?.split(":") ?? [];
  const control = "h-12 min-w-0 flex-1 rounded-control border border-input bg-card px-3 type-input";
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <FieldLabel htmlFor={id + "-hour"}>{label}</FieldLabel>
      <div className="flex gap-2">
        <select id={id + "-hour"} aria-label={label + " 시"} className={control} value={hour}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next ? next + ":" + (next === "24" ? "00" : minute) : undefined);
          }}>
          <option value="">시</option>
          {Array.from({ length: end ? 25 : 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}시</option>)}
        </select>
        <select id={id + "-minute"} aria-label={label + " 분"} className={control} value={minute}
          disabled={hour === "24"} aria-invalid={invalid || undefined}
          onChange={(event) => onChange((hour || "00") + ":" + event.target.value)}>
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => <option key={m} value={m}>{m}분</option>)}
        </select>
      </div>
    </div>
  );
}
