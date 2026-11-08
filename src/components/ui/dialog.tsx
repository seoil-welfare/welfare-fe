import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Dialog: 최대 폭 480px, padding 24px (가이드 6장) */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlayClass =
  "fixed inset-0 z-50 bg-[rgb(21_46_99_/_0.35)] data-[state=open]:animate-in data-[state=closed]:animate-out";

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    title: string;
    description?: string;
    /** false면 오른쪽 위 닫기 버튼을 숨긴다 (꼭 끝내야 하는 창) */
    closable?: boolean;
  }
>(({ className, children, title, description, closable = true, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={overlayClass} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2",
        "rounded-card bg-popover p-6 text-popover-foreground shadow-xl",
        "max-h-[85vh] overflow-y-auto",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <DialogPrimitive.Title className="type-title">{title}</DialogPrimitive.Title>
        {closable ? (
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" aria-label="닫기" className="-mr-2 -mt-2 shrink-0">
              <X aria-hidden />
            </Button>
          </DialogPrimitive.Close>
        ) : null}
      </div>
      {description ? (
        <DialogPrimitive.Description className="mt-2 type-body-long text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
      )}
      <div className="mt-4">{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

/** 모바일 바텀시트 — 기간 선택 등 (가이드 6장 Drawer/Sheet) */
export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string }
>(({ className, children, title, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={overlayClass} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[560px]",
        "rounded-t-card bg-popover p-4 pb-safe text-popover-foreground shadow-xl",
        "max-h-[85vh] overflow-y-auto",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4 pb-2">
        <DialogPrimitive.Title className="type-heading">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close asChild>
          <Button variant="ghost" size="icon" aria-label="닫기" className="-mr-2 shrink-0">
            <X aria-hidden />
          </Button>
        </DialogPrimitive.Close>
      </div>
      <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

/**
 * AlertDialog — 이용 종결처럼 주의가 필요한 동작의 확인 (가이드 6장).
 * 제목에 대상과 동작, 본문에 결과. 확정 버튼은 동작 이름 ('확인'·'예'를 쓰지 않는다).
 * cancelLabel에 null을 주면 취소 버튼 없이 확정 버튼 하나만 둔다.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "취소",
  onConfirm,
  tone = "destructive",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string | null;
  onConfirm: () => void;
  tone?: "destructive" | "default";
}) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlayClass} />
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2",
            "rounded-card bg-popover p-6 text-popover-foreground shadow-xl",
          )}
        >
          <AlertDialogPrimitive.Title className="type-title">{title}</AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 type-body-long text-muted-foreground">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="mt-6 flex gap-3">
            {cancelLabel !== null ? (
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="outline" block>
                  {cancelLabel}
                </Button>
              </AlertDialogPrimitive.Cancel>
            ) : null}
            <AlertDialogPrimitive.Action asChild>
              <Button variant={tone === "destructive" ? "destructive" : "default"} block onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
