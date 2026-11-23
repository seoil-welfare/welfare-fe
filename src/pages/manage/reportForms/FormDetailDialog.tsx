import { useState } from "react";
import { toast } from "sonner";
import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent } from "@/components/ui/dialog";
import { errorMessage } from "@/api/errors";
import { useSetReportFormActive } from "@/api/queries";
import type { ReportForm } from "@/api/types";
import { DEFAULT_FORM, loadReportTemplate, type ReportFormChoice } from "@/lib/export/reportTemplate";
import { saveBlob } from "@/lib/export/saveBlob";
import { formatDateTime } from "@/lib/utils";
import { REPORT_FORM_KIND_LABEL, type ReportFormKind } from "@/services/reportFormFields";

/** 목록에서 고른 양식. 기본 양식은 서버 목록에 없어 따로 표시한다 */
export type SelectedForm = { type: "default" } | { type: "uploaded"; form: ReportForm };

/** 양식 하나: 파일 받기, 숨기기·다시 사용하기 */
export function FormDetailDialog({ kind, selected, onDone }: { kind: ReportFormKind; selected: SelectedForm; onDone: () => void }) {
  const setActive = useSetReportFormActive();
  const [downloading, setDownloading] = useState(false);
  const [sampling, setSampling] = useState(false);
  const form = selected.type === "uploaded" ? selected.form : null;
  const choice: ReportFormChoice = form ? { type: "uploaded", id: form.id } : DEFAULT_FORM;

  /** 가상 일지로 채운 샘플을 내려받는다. Word로 열어 실제 출력 모양을 확인한다 */
  async function downloadSample() {
    setSampling(true);
    try {
      const { downloadReportSample } = await import("@/lib/export/downloadReportSample");
      await downloadReportSample(kind, choice, form ? form.name : REPORT_FORM_KIND_LABEL[kind] + " 기본 양식");
      toast.success("샘플을 내려받았어요. Word로 열어 확인해 보세요.");
    } catch (error) {
      toast.error(errorMessage(error, "샘플을 만들지 못했어요. 양식을 다시 확인해 주세요."));
    } finally {
      setSampling(false);
    }
  }

  async function download() {
    setDownloading(true);
    try {
      const content = await loadReportTemplate(kind, choice);
      saveBlob(new Blob([content]), form ? form.fileName : REPORT_FORM_KIND_LABEL[kind] + "_기본양식.docx");
    } catch (error) {
      toast.error(errorMessage(error, "양식 파일을 받지 못했어요."));
    } finally {
      setDownloading(false);
    }
  }

  function toggleActive() {
    if (!form) return;
    const next = !form.active;
    setActive.mutate(
      { id: form.id, active: next },
      {
        onSuccess: () => {
          toast.success(next ? "'" + form.name + "'을 다시 사용해요." : "'" + form.name + "'을 숨겼어요.");
          onDone();
        },
        onError: (error) => toast.error(errorMessage(error, "바꾸지 못했어요. 다시 시도해 주세요.")),
      },
    );
  }

  return (
    <DialogContent
      title={form ? form.name : "기본 양식"}
      description={
        form
          ? formatDateTime(form.uploadedAt) + " · " + form.uploadedBy + " 올림 · " + form.fileName
          : "앱에 들어 있는 양식이에요. 숨길 수 없어요. 받아서 기관 양식을 만들 때 참고할 수 있어요."
      }
    >
      {form ? (
        <p className="type-body">
          지금 상태: <strong>{form.active ? "사용 중" : "숨김"}</strong>
          <span className="mt-1 block type-caption text-muted-foreground">
            {form.active
              ? "숨기면 출력할 때 고를 수 없어요. 파일은 지워지지 않아요."
              : "다시 사용하면 출력할 때 이 양식을 고를 수 있어요."}
          </span>
        </p>
      ) : null}
      <div className="mt-4 rounded-control bg-muted px-3 py-3">
        <Button variant="secondary" block disabled={sampling} onClick={() => void downloadSample()}>
          <FileSearch aria-hidden />
          {sampling ? "샘플 만드는 중…" : "샘플 받기"}
        </Button>
        <p className="mt-2 type-caption break-keep text-muted-foreground">
          가상 일지로 채운 파일을 받아요. Word로 열면 실제 출력 모양 그대로 확인할 수 있어요.
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" block disabled={downloading} onClick={() => void download()}>
          {downloading ? "받는 중…" : "파일 받기"}
        </Button>
        {form ? (
          <Button block disabled={setActive.isPending} onClick={toggleActive}>
            {form.active ? "숨기기" : "다시 사용하기"}
          </Button>
        ) : (
          <DialogClose asChild>
            <Button block>닫기</Button>
          </DialogClose>
        )}
      </div>
    </DialogContent>
  );
}
