import { useRef, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { errorMessage } from "@/api/errors";
import { useUploadReportForm } from "@/api/queries";
import { CHART_SLOT_LABEL } from "@/lib/export/chartSlots";
import type { ReportFormCheck } from "@/lib/export/reportFormCheck";
import { REPORT_FORM_KIND_LABEL, type ReportFormKind } from "@/services/reportFormFields";

/** 양식 올리기: 파일을 고르면 바로 검사하고, 통과하면 등록한다 */
export function UploadDialog({ kind, onDone }: { kind: ReportFormKind; onDone: () => void }) {
  const upload = useUploadReportForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<ReportFormCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function pick(next: File | undefined) {
    if (!next) return;
    setFile(next);
    setCheck(null);
    setError(null);
    setSubmitError(null);
    if (!name.trim()) setName(next.name.replace(/\.[^.]+$/, "").slice(0, 30));
    setChecking(true);
    try {
      // 검사 라이브러리는 양식을 올릴 때만 필요해서 이때 불러온다
      const { checkReportForm } = await import("@/lib/export/reportFormCheck");
      setCheck(checkReportForm(next.name, await next.arrayBuffer(), kind));
    } catch {
      setCheck({ ok: false, errors: ["파일을 읽지 못했어요. 다시 골라 주세요."], filled: [], unknownTags: [], chartSlots: [] });
    } finally {
      setChecking(false);
    }
  }

  function submit() {
    if (!file || !check?.ok) return;
    if (!name.trim()) {
      setError("양식 이름을 입력해 주세요.");
      return;
    }
    setError(null);
    setSubmitError(null);
    upload.mutate(
      { kind, name: name.trim(), file },
      {
        onSuccess: (created) => {
          toast.success("'" + created.name + "' 양식을 올렸어요.", {
            description: "목록에서 양식을 눌러 샘플 받기로 출력 모양을 확인해 보세요.",
          });
          onDone();
        },
        // 이름 칸 문제가 아니라 서버 쪽 실패라 버튼 위에 따로 보여 준다
        onError: (err) => setSubmitError(errorMessage(err, "양식을 올리지 못했어요. 다시 시도해 주세요.")),
      },
    );
  }

  return (
    <DialogContent title={REPORT_FORM_KIND_LABEL[kind] + " 양식 올리기"} description="Word(docx) 파일만 올릴 수 있어요. 올리기 전에 양식을 검사해요.">
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="report-form-file">양식 파일</FieldLabel>
          <input
            ref={inputRef}
            id="report-form-file"
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(event) => void pick(event.target.files?.[0])}
          />
          <Button variant="outline" block className="justify-start" onClick={() => inputRef.current?.click()}>
            <Upload aria-hidden />
            <span className="truncate">{file ? file.name : "파일 고르기"}</span>
          </Button>
        </Field>

        {checking ? <Spinner label="양식을 검사하는 중…" /> : null}
        {check ? <CheckResult kind={kind} check={check} /> : null}

        <Field>
          <FieldLabel htmlFor="report-form-name">양식 이름</FieldLabel>
          <Input
            id="report-form-name"
            value={name}
            maxLength={30}
            placeholder="예: 우리 기관 일지"
            aria-invalid={error ? true : undefined}
            onChange={(event) => setName(event.target.value)}
          />
          <FieldDescription>출력할 때 이 이름으로 골라요.</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
      </div>

      {submitError ? (
        <p role="alert" className="mt-4 flex gap-2 rounded-control bg-destructive-soft px-3 py-2.5 type-body text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {submitError}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <DialogClose asChild>
          <Button variant="outline" block>
            취소
          </Button>
        </DialogClose>
        <Button block disabled={!check?.ok || upload.isPending} onClick={submit}>
          {upload.isPending ? "올리는 중…" : "올리기"}
        </Button>
      </div>
    </DialogContent>
  );
}

/** 검사 결과: 막는 이유, 채워지는 칸 수, 앱이 모르는 칸, (월별) 그래프 자리 */
function CheckResult({ kind, check }: { kind: ReportFormKind; check: ReportFormCheck }) {
  if (!check.ok) {
    return (
      <div role="alert" className="flex gap-2 rounded-control bg-destructive-soft px-3 py-3 type-body text-destructive">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <ul className="flex flex-col gap-1 break-keep">
          {check.errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 rounded-control bg-accent px-3 py-2.5 type-body text-accent-foreground">
        <CircleCheck className="size-4 shrink-0" aria-hidden />
        올릴 수 있어요 · 채워지는 칸 {check.filled.length}개
      </p>
      {check.unknownTags.length > 0 ? (
        <div className="flex gap-2 rounded-control bg-warning-soft px-3 py-2.5 type-body text-warning-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="break-keep">
            앱에 없는 칸 {check.unknownTags.length}개는 빈칸으로 출력돼요:{" "}
            {check.unknownTags.map((tag) => "{" + tag + "}").join(", ")}
          </p>
        </div>
      ) : null}
      {kind === "monthly" ? (
        <p className="break-keep px-1 type-body text-muted-foreground">
          {check.chartSlots.length > 0
            ? "그래프가 들어가는 자리: " + check.chartSlots.map((slot) => CHART_SLOT_LABEL[slot]).join(", ")
            : "그래프 자리가 없어서 그래프 없이 출력돼요. 넣으려면 아래 '양식 만드는 법'을 보세요."}
        </p>
      ) : null}
    </div>
  );
}
