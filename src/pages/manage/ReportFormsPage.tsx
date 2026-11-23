import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { ListRowButton } from "@/components/common/ListRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/misc";
import { SegmentedToggle } from "@/components/ui/toggle-group";
import { useReportForms } from "@/api/queries";
import type { ReportForm } from "@/api/types";
import { formatDateTime } from "@/lib/utils";
import { REPORT_FORM_KIND_LABEL, type ReportFormKind } from "@/services/reportFormFields";
import { FormDetailDialog, type SelectedForm } from "@/pages/manage/reportForms/FormDetailDialog";
import { FormGuide } from "@/pages/manage/reportForms/FormGuide";
import { UploadDialog } from "@/pages/manage/reportForms/UploadDialog";

/**
 * 출력 양식 관리 (팀장·국장).
 * 기관 양식 파일(docx)을 올리고, 숨기거나 다시 사용한다. 지우는 기능은 없다 (숨긴 양식으로 지난 기록을 다시 출력할 수 있게).
 * 기본 양식은 앱에 들어 있어 항상 쓸 수 있고 숨길 수 없다.
 *
 * 양식 상세·올리기·만드는 법은 reportForms/ 아래 파일에 있다.
 */

const KIND_OPTIONS = (["daily", "monthly"] as const).map((value) => ({ value, label: REPORT_FORM_KIND_LABEL[value] }));

export function ReportFormsPage() {
  const [kind, setKind] = useState<ReportFormKind>("daily");
  const formsQuery = useReportForms();
  const [selected, setSelected] = useState<SelectedForm | null>(null);
  const [uploading, setUploading] = useState(false);
  const forms = (formsQuery.data ?? []).filter((form) => form.kind === kind);
  const hiddenCount = forms.filter((form) => !form.active).length;

  const formRow = (form: ReportForm) => (
    <li key={form.id}>
      <ListRowButton
        leading={<FileText className="size-5 text-primary" aria-hidden />}
        title={form.name}
        subtitle={formatDateTime(form.uploadedAt) + " · " + form.uploadedBy}
        trailing={
          !form.active ? (
            <Badge variant="soft" tone="neutral">
              숨김
            </Badge>
          ) : undefined
        }
        onClick={() => setSelected({ type: "uploaded", form })}
      />
    </li>
  );

  return (
    <AppShell header={<AppHeader title="출력 양식 관리" backTo="/mypage" />} width="form">
      <div className="flex flex-col gap-3">
        <SegmentedToggle label="양식 종류" value={kind} onValueChange={setKind} options={KIND_OPTIONS} />

        <section className="flex flex-col gap-2">
          <p className="px-1 tnum type-caption text-muted-foreground">
            {REPORT_FORM_KIND_LABEL[kind]} 양식 {forms.length + 1}개{hiddenCount > 0 ? " · 숨김 " + hiddenCount + "개" : ""}
          </p>
          <Card variant="list">
            <ul className="divide-y divide-border">
              <li>
                <ListRowButton
                  leading={<FileText className="size-5 text-primary" aria-hidden />}
                  title="기본 양식"
                  subtitle="앱에 들어 있는 양식이에요"
                  trailing={
                    <Badge variant="soft" tone="primary">
                      기본
                    </Badge>
                  }
                  onClick={() => setSelected({ type: "default" })}
                />
              </li>
              {forms.map(formRow)}
              {formsQuery.isPending ? (
                <li className="flex justify-center px-4 py-3 type-body text-muted-foreground">
                  <Spinner label="올린 양식을 불러오는 중…" />
                </li>
              ) : null}
              {formsQuery.isError ? (
                <li className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="type-body text-muted-foreground">올린 양식을 불러오지 못했어요.</span>
                  <Button variant="outline" size="compact" onClick={() => void formsQuery.refetch()}>
                    다시 시도
                  </Button>
                </li>
              ) : null}
            </ul>
          </Card>
          <p className="px-1 type-caption break-keep text-muted-foreground">
            숨긴 양식은 출력할 때 고를 수 없어요. 다시 사용하면 지난 기록도 그 양식으로 출력할 수 있어요.
          </p>
        </section>

        <Button variant="dashed" onClick={() => setUploading(true)}>
          <Upload aria-hidden />
          {REPORT_FORM_KIND_LABEL[kind]} 양식 올리기
        </Button>

        <FormGuide kind={kind} />
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? <FormDetailDialog kind={kind} selected={selected} onDone={() => setSelected(null)} /> : null}
      </Dialog>

      <Dialog open={uploading} onOpenChange={setUploading}>
        {uploading ? <UploadDialog kind={kind} onDone={() => setUploading(false)} /> : null}
      </Dialog>
    </AppShell>
  );
}
