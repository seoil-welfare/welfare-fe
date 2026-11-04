import { Checkbox } from "@/components/ui/checkbox";
import { FormSection } from "@/components/common/FormSection";
import type { ServiceUser } from "@/types";

/** 출력 화면 제목·안내 문구 (ExportPage의 KIND_META) */
export interface ExportMeta {
  title: string;
  description: string;
}

/** 출력 화면(일지 모아 출력·월간 기록)의 입력란·버튼 테두리. 지난 소식 보기 버튼과 같은 옅은 테두리 */
export const SOFT_BORDER = "border-input/40";

/** 대상 이용자 체크 목록 */
export function UserChecklist({
  users,
  selected,
  onChange,
}: {
  users: ServiceUser[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <FormSection title="대상 이용자" description={selected.length + "명 선택됨"}>
      <ul className="flex flex-col gap-1">
        {users.map((user) => (
          <li key={user.id}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-1 hover:bg-accent">
              <Checkbox
                checked={selected.includes(user.id)}
                onCheckedChange={(value) =>
                  onChange(value === true ? [...selected, user.id] : selected.filter((id) => id !== user.id))
                }
              />
              <span className="type-body">{user.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </FormSection>
  );
}
