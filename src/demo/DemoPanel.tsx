import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Separator, Switch } from "@/components/ui/misc";
import { SegmentedToggle } from "@/components/ui/toggle-group";
import { readDb } from "@/api/mock/mockDb";
import { useCurrentStaff } from "@/app/auth";
import { useDemo } from "@/demo/DemoContext";
import { MEMO_ACTIVITY_LIMIT } from "@/demo/flags";

/**
 * 개발용 데모 패널 (mock 모드 전용).
 * 운영 UI와 분리된 영역이며, 여기서 바꾸는 값은 모두 미확정 사항의 시연 선택지다 (지시서 0-7, 2장).
 */
export function DemoPanel() {
  const { flags, setFlags, switchStaff, resetDemo } = useDemo();
  const currentStaff = useCurrentStaff();
  const [open, setOpen] = useState(false);
  const staff = readDb().staff;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="compact"
          className="fixed right-3 top-3 z-40 border-brand-gold bg-card/95 shadow"
          aria-label="시연용 설정 패널 열기"
        >
          <FlaskConical aria-hidden />
          시연 설정
        </Button>
      </DialogTrigger>
      <DialogContent
        title="시연용 설정"
        description="회의에서 확정되지 않은 동작을 비교하기 위한 개발자 패널입니다. 여기의 기본값은 승인된 정책이 아닙니다."
      >
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2">
            <h3 className="type-body font-medium">가상 역할 전환</h3>
            <p className="type-caption text-muted-foreground">
              화면 차이를 보여 주기 위한 전환입니다. 실제 권한을 보장하는 코드가 아닙니다.
            </p>
            <div className="flex flex-col gap-1">
              {staff.map((member) => (
                <Button
                  key={member.id}
                  variant={currentStaff?.id === member.id ? "default" : "outline"}
                  size="dense"
                  className="justify-start"
                  onClick={() => void switchStaff(member.id)}
                >
                  {member.name} · {member.position}
                  {member.unconfirmedPosition ? " (U4 미확정 예시)" : ""}
                </Button>
              ))}
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-2">
            <h3 className="type-body font-medium">달력 날짜 지표</h3>
            <p className="type-caption text-muted-foreground">
              기본값은 이번 회의 제안안인 ‘완료 건수 N/3’입니다. 원형 게이지는 기존 가이드와 비교하기
              위한 선택지이며 채택된 방식이 아닙니다.
            </p>
            <SegmentedToggle
              label="달력 날짜 지표"
              value={flags.calendarIndicator}
              onValueChange={(value) => setFlags({ calendarIndicator: value })}
              options={[
                { value: "completion", label: "완료 건수" },
                { value: "gauge", label: "원형 게이지" },
              ]}
            />
          </section>

          <Separator />

          <section className="flex flex-col gap-1">
            <h3 className="type-body font-medium">미확정 동작 옵션</h3>
            <ToggleRow
              label="사전 지원 ‘없음’ 배타 선택"
              hint="계획서 FR-21에 정의되어 있으나 가이드 U2에서 재확인이 필요합니다."
              checked={flags.exclusiveNone}
              onChange={(value) => setFlags({ exclusiveNone: value })}
            />
            <ToggleRow
              label="행동 유형 필터가 상단 요약까지 갱신"
              hint="도전적 행동 상세 통계의 미확정 제안(FR-47)입니다."
              checked={flags.behaviorFilterUpdatesSummary}
              onChange={(value) => setFlags({ behaviorFilterUpdatesSummary: value })}
            />
          </section>

          <Separator />

          <section className="flex flex-col gap-1">
            <h3 className="type-body font-medium">관찰용 상태</h3>
            <ToggleRow
              label="오늘의 소식 0건"
              checked={flags.forceEmptyNews}
              onChange={(value) => setFlags({ forceEmptyNews: value })}
            />
            <ToggleRow
              label="통계 0건"
              checked={flags.forceEmptyStats}
              onChange={(value) => setFlags({ forceEmptyStats: value })}
            />
            <ToggleRow
              label="불러오기 실패"
              hint="모든 조회가 실패합니다. 실제 서버 오류가 아닙니다."
              checked={flags.forceLoadFailure}
              onChange={(value) => setFlags({ forceLoadFailure: value })}
            />
            <ToggleRow
              label="느린 응답 (3초)"
              hint="조회마다 로딩 Skeleton이 3초 동안 보입니다."
              checked={flags.slowLoading}
              onChange={(value) => setFlags({ slowLoading: value })}
            />
          </section>

          <Separator />

          <section className="flex flex-col gap-1">
            <h3 className="type-body font-medium">데모 데이터</h3>
            <ToggleRow
              label="새로고침 후에도 유지"
              hint="브라우저 localStorage에 데모 상태를 저장합니다. 공개 서비스의 데이터 저장이 아닙니다."
              checked={flags.persist}
              onChange={(value) => setFlags({ persist: value })}
            />
            <Button
              variant="outline"
              className="mt-2"
              block
              onClick={() => {
                resetDemo();
                setOpen(false);
              }}
            >
              데모 초기화
            </Button>
          </section>

          <Separator />

          <section className="flex flex-col gap-1">
            <h3 className="type-body font-medium">회의 대조 메모</h3>
            <p className="type-caption text-muted-foreground break-keep">{MEMO_ACTIVITY_LIMIT}</p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-1">
      <span className="flex min-w-0 flex-col">
        <span className="type-body">{label}</span>
        {hint ? <span className="type-caption text-muted-foreground break-keep">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
