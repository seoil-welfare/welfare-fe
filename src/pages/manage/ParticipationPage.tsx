import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { FormSection } from "@/components/common/FormSection";
import { ListRowButton } from "@/components/common/ListRow";
import { QueryGate } from "@/components/common/QueryGate";
import { errorMessage, isApiError } from "@/api/errors";
import {
  combineQueries,
  useAddParticipation,
  useCategories,
  useUpdateParticipation,
} from "@/api/queries";
import type { CategoryItem } from "@/api/types";

/**
 * 참여 활동 관리 (팀장·국장). 마이페이지 > 일지 항목 관리에서 들어온다.
 * 추가 POST /categories/participation, 이름 변경·숨기기 PUT /categories/participation/:code.
 * 지우지 않고 숨긴다. 숨긴 활동은 새 일지에서만 빠지고 지난 일지·통계에는 남는다.
 * 화면은 역할 가드, 저장 권한은 서버가 검사한다.
 */

/** 백엔드 activity_type.name 길이와 같다 */
const MAX_LABEL = 30;

export function ParticipationPage() {
  const categoriesQuery = useCategories();

  return (
    <AppShell header={<AppHeader title="참여 활동 관리" backTo="/mypage" />} width="form">
      <QueryGate state={combineQueries([categoriesQuery])}>
        {() => <ParticipationList items={categoriesQuery.data!.participation} />}
      </QueryGate>
    </AppShell>
  );
}

function ParticipationList({ items }: { items: CategoryItem[] }) {
  const [editing, setEditing] = useState<CategoryItem | null>(null); // 수정 창에 띄운 활동
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const hiddenCount = items.filter((item) => !item.active).length;

  return (
    <div className="flex flex-col gap-3">
      <AddParticipationForm />

      <section className="flex flex-col gap-2">
        <p className="px-1 tnum type-caption text-muted-foreground">
          참여 활동 {items.length}개{hiddenCount > 0 ? " · 숨김 " + hiddenCount + "개" : ""}
        </p>
        <Card variant="list">
          <ul className="divide-y divide-border">
            {sorted.map((item) => (
              <li key={item.code}>
                <ListRowButton
                  title={item.label}
                  subtitle={item.etc ? "직접 입력 · 숨길 수 없어요" : undefined}
                  trailing={
                    !item.active ? (
                      <Badge variant="soft" tone="neutral">
                        숨김
                      </Badge>
                    ) : undefined
                  }
                  onClick={() => setEditing(item)}
                />
              </li>
            ))}
          </ul>
        </Card>
        <p className="px-1 type-caption break-keep text-muted-foreground">
          숨긴 활동은 새 일지에서 고를 수 없어요. 지난 일지와 통계에는 그대로 남아요.
        </p>
      </section>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <EditParticipationDialog
            key={editing.code}
            item={editing}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function AddParticipationForm() {
  const addParticipation = useAddParticipation();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string>();

  function submit() {
    if (addParticipation.isPending) return;
    if (!label.trim()) {
      setError("추가할 활동 이름을 입력해 주세요.");
      return;
    }
    addParticipation.mutate(label.trim(), {
      onSuccess: (created) => {
        toast.success("'" + created.label + "'을 추가했어요.");
        setLabel("");
        setError(undefined);
      },
      // 이름 중복(409)·형식 오류(400)는 입력란에, 그 밖에는 알림으로
      onError: (err) => {
        if (isApiError(err) && (err.status === 409 || err.status === 400)) {
          setError(errorMessage(err));
          return;
        }
        toast.error("참여 활동을 추가하지 못했어요.", { description: errorMessage(err) });
      },
    });
  }

  return (
    <FormSection title="활동 추가">
      <Field>
        <FieldLabel htmlFor="participation-new" className="sr-only">
          추가할 활동 이름
        </FieldLabel>
        <div className="flex gap-2">
          <Input
            id="participation-new"
            value={label}
            maxLength={MAX_LABEL}
            placeholder="예: 원예활동"
            aria-invalid={error ? true : undefined}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) submit(); // 한글 조합 중 Enter는 무시
            }}
          />
          <Button className="shrink-0" onClick={submit} disabled={addParticipation.isPending}>
            {addParticipation.isPending ? "추가 중…" : "추가"}
          </Button>
        </div>
        <FieldError>{error}</FieldError>
        <FieldDescription>'기타' 바로 앞에 추가돼요.</FieldDescription>
      </Field>
    </FormSection>
  );
}

function EditParticipationDialog({ item, onDone }: { item: CategoryItem; onDone: () => void }) {
  const update = useUpdateParticipation();
  const [label, setLabel] = useState(item.label);
  const [error, setError] = useState<string>();

  function save(input: { label?: string; active?: boolean }, doneMessage: string) {
    if (update.isPending) return;
    update.mutate(
      { code: item.code, input },
      {
        onSuccess: () => {
          toast.success(doneMessage);
          onDone();
        },
        onError: (err) => {
          if (isApiError(err) && (err.status === 409 || err.status === 400)) {
            setError(errorMessage(err));
            return;
          }
          toast.error("참여 활동을 바꾸지 못했어요.", { description: errorMessage(err) });
        },
      },
    );
  }

  function saveLabel() {
    const next = label.trim();
    if (!next) {
      setError("활동 이름을 입력해 주세요.");
      return;
    }
    if (next === item.label) {
      onDone();
      return;
    }
    save({ label: next }, "이름을 '" + next + "'(으)로 바꿨어요.");
  }

  return (
    <DialogContent
      title="참여 활동 수정"
      description="이름을 바꿔도 지난 일지와 통계는 이어져요."
    >
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="participation-label">활동 이름</FieldLabel>
          <Input
            id="participation-label"
            value={label}
            maxLength={MAX_LABEL}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setLabel(event.target.value)}
          />
          <FieldError>{error}</FieldError>
        </Field>

        <div className="flex gap-3">
          {/* '기타'는 목록에 없는 활동을 적는 칸이라 숨길 수 없다 */}
          {!item.etc ? (
            <Button
              variant="outline"
              block
              disabled={update.isPending}
              onClick={() =>
                item.active
                  ? save({ active: false }, "'" + item.label + "'을 숨겼어요.")
                  : save({ active: true }, "'" + item.label + "'을 다시 보이게 했어요.")
              }
            >
              {item.active ? "숨기기" : "다시 보이기"}
            </Button>
          ) : null}
          <Button block disabled={update.isPending} onClick={saveLabel}>
            {update.isPending ? "저장 중…" : "이름 저장"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
