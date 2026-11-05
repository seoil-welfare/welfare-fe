import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { CreatedStaff } from "@/api/types";

/**
 * 임시 비밀번호 팝업. 계정 추가와 임시 비밀번호 다시 발급에서 함께 쓴다.
 * 아이디와 임시 비밀번호를 보여 주고, 임시 비밀번호만 복사할 수 있다.
 * 닫으면 비밀번호를 다시 볼 수 없으므로(서버에는 해시만 있음) 바깥을 눌러 닫히지 않게 한다.
 */
export function TemporaryPasswordDialog({
  account,
  title,
  onClose,
}: {
  account: CreatedStaff | null;
  title: string;
  onClose: () => void;
}) {
  async function copy() {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.temporaryPassword);
      toast.success("임시 비밀번호를 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요. 화면을 보고 직접 전달해 주세요.");
    }
  }

  return (
    <Dialog
      open={account !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        title={title}
        description="아이디와 임시 비밀번호를 본인에게 전달해 주세요. 이 창을 닫으면 임시 비밀번호를 다시 볼 수 없어요."
        onInteractOutside={(event) => event.preventDefault()}
      >
        {account ? (
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col gap-3 rounded-control bg-secondary px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="type-body text-muted-foreground">아이디</dt>
                <dd className="type-body font-medium break-all">{account.loginId}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="type-body text-muted-foreground">임시 비밀번호</dt>
                <dd className="tnum type-heading tracking-wider select-all">
                  {account.temporaryPassword}
                </dd>
              </div>
            </dl>
            <p className="type-caption text-muted-foreground">
              처음 로그인한 뒤 마이페이지 › 비밀번호 변경에서 바꾸도록 안내해 주세요.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" block onClick={copy}>
                <Copy aria-hidden />
                비밀번호 복사
              </Button>
              <Button block onClick={onClose}>
                확인
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
