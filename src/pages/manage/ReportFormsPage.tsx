import { useRef, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, CircleCheck, FileSearch, FileText, TriangleAlert, Upload } from "lucide-react";
import dailyTemplateUrl from "@/assets/forms/daily-record.template.docx?url";
import monthlyTemplateUrl from "@/assets/forms/monthly-record.template.docx?url";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { ListRowButton } from "@/components/common/ListRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Spinner } from "@/components/ui/misc";
import { SegmentedToggle } from "@/components/ui/toggle-group";
import { api } from "@/api";
import { errorMessage } from "@/api/errors";
import { useReportForms, useSetReportFormActive, useUploadReportForm } from "@/api/queries";
import type { ReportForm } from "@/api/types";
import { CHART_SLOT_DESCRIPTION, CHART_SLOT_LABEL, type ChartSlot } from "@/lib/export/chartSlots";
import { DEFAULT_FORM } from "@/lib/export/reportTemplate";
import { saveBlob } from "@/lib/export/saveBlob";
import type { ReportFormCheck } from "@/lib/export/reportFormCheck";
import { formatDateTime } from "@/lib/utils";
import { REPORT_FIELDS, type ReportFormKind } from "@/services/reportFormFields";

/**
 * 출력 양식 관리 (팀장·국장).
 * 기관 양식 파일(docx)을 올리고, 숨기거나 다시 사용한다. 지우는 기능은 없다 (숨긴 양식으로 지난 기록을 다시 출력할 수 있게).
 * 기본 양식은 앱에 들어 있어 항상 쓸 수 있고 숨길 수 없다.
 */

const KIND_OPTIONS = [
  { value: "daily", label: "일별활동일지" },
  { value: "monthly", label: "월별활동일지" },
] as const;

const KIND_LABEL: Record<ReportFormKind, string> = { daily: "일별활동일지", monthly: "월별활동일지" };
const DEFAULT_TEMPLATE_URL: Record<ReportFormKind, string> = { daily: dailyTemplateUrl, monthly: monthlyTemplateUrl };

/** 목록에서 고른 양식. 기본 양식은 서버 목록에 없어 따로 표시한다 */
type Selected = { type: "default" } | { type: "uploaded"; form: ReportForm };

export function ReportFormsPage() {
  const [kind, setKind] = useState<ReportFormKind>("daily");
  const formsQuery = useReportForms();
  const [selected, setSelected] = useState<Selected | null>(null);
  const [uploading, setUploading] = useState(false);
  const forms = (formsQuery.data ?? []).filter((form) => form.kind === kind);
  const hiddenCount = forms.filter((form) => !form.active).length;

  return (
    <AppShell header={<AppHeader title="출력 양식 관리" backTo="/mypage" />} width="form">
      <div className="flex flex-col gap-3">
        <SegmentedToggle label="양식 종류" value={kind} onValueChange={setKind} options={KIND_OPTIONS} />

        <section className="flex flex-col gap-2">
          <p className="px-1 tnum type-caption text-muted-foreground">
            {KIND_LABEL[kind]} 양식 {forms.length + 1}개{hiddenCount > 0 ? " · 숨김 " + hiddenCount + "개" : ""}
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
              {forms.map((form) => (
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
              ))}
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
          {KIND_LABEL[kind]} 양식 올리기
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

/** 양식 하나: 파일 받기, 숨기기·다시 사용하기 */
function FormDetailDialog({ kind, selected, onDone }: { kind: ReportFormKind; selected: Selected; onDone: () => void }) {
  const setActive = useSetReportFormActive();
  const [downloading, setDownloading] = useState(false);
  const [sampling, setSampling] = useState(false);
  const form = selected.type === "uploaded" ? selected.form : null;

  /** 가상 일지로 채운 샘플을 내려받는다. Word로 열어 실제 출력 모양을 확인한다 */
  async function downloadSample() {
    setSampling(true);
    try {
      const { downloadReportSample } = await import("@/lib/export/downloadReportSample");
      await downloadReportSample(kind, form ? { type: "uploaded", id: form.id } : DEFAULT_FORM, form ? form.name : KIND_LABEL[kind] + " 기본 양식");
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
      if (form) {
        saveBlob(new Blob([await api.reportForms.file(form.id)]), form.fileName);
      } else {
        const response = await fetch(DEFAULT_TEMPLATE_URL[kind]);
        if (!response.ok) throw new Error();
        saveBlob(await response.blob(), KIND_LABEL[kind] + "_기본양식.docx");
      }
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

/** 양식 올리기: 파일을 고르면 바로 검사하고, 통과하면 등록한다 */
function UploadDialog({ kind, onDone }: { kind: ReportFormKind; onDone: () => void }) {
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
    <DialogContent title={KIND_LABEL[kind] + " 양식 올리기"} description="Word(docx) 파일만 올릴 수 있어요. 올리기 전에 양식을 검사해요.">
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

/** 양식 만드는 법과 쓸 수 있는 칸 목록 */
function FormGuide({ kind }: { kind: ReportFormKind }) {
  const set = REPORT_FIELDS[kind];
  const loop = set.loops[0];
  return (
    <Card variant="list">
      <Accordion type="single" collapsible>
        <AccordionItem value="guide">
          <AccordionTrigger>
            <span className="type-heading">양식 만드는 법</span>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="flex list-decimal flex-col gap-2 pl-5 type-body-long break-keep">
              <li>Word에서 기관 양식을 열고, 값이 들어갈 자리에 아래 칸 이름을 {"{이용자이름}"}처럼 중괄호로 적어요.</li>
              <li>
                {kind === "daily" ? "활동" : "날짜"}마다 줄이 늘어나야 하는 표는, 그 줄 첫 칸 맨 앞에 {"{#" + loop.label + "}"}, 마지막
                칸 맨 뒤에 {"{/" + loop.label + "}"}를 적어요.
              </li>
              {kind === "monthly" ? (
                <li>
                  그래프를 넣을 자리에 아무 그림이나 넣고, 그림을 오른쪽 클릭 → '대체 텍스트 편집'에 아래 그래프 이름을 적어요. 출력할 때 그
                  그림이 그래프로 바뀌어요. 그림의 가로 크기는 그대로, 세로는 그래프 비율에 맞춰져요.
                </li>
              ) : null}
              <li>docx로 저장해 올려요. 한글(hwp)은 '다른 이름으로 저장'에서 'Word 문서(*.docx)'로 바꿔요.</li>
              <li>올리면 앱이 바로 검사해서, 앱에 없는 칸이나 잘못 적은 표시를 알려 줘요.</li>
            </ol>

            <h3 className="mt-4 type-body font-bold">쓸 수 있는 칸</h3>
            <FieldTable rows={set.fields.map((f) => ["{" + f.label + "}", f.description])} />
            {set.loops.map((l) => (
              <div key={l.key} className="mt-3">
                <h3 className="type-body font-bold">
                  {"{#" + l.label + "} … {/" + l.label + "}"}
                  <span className="ml-1 font-normal text-muted-foreground">{l.description}</span>
                </h3>
                <FieldTable rows={l.fields.map((f) => ["{" + f.label + "}", f.description])} />
              </div>
            ))}
            {kind === "monthly" ? (
              <div className="mt-3">
                <h3 className="type-body font-bold">그래프 (그림의 대체 텍스트에 적기)</h3>
                <FieldTable rows={(Object.keys(CHART_SLOT_LABEL) as ChartSlot[]).map((slot) => [CHART_SLOT_LABEL[slot], CHART_SLOT_DESCRIPTION[slot]])} />
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

function FieldTable({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 type-body">
      {rows.map(([tag, description]) => (
        <div key={tag} className="contents">
          <dt className="font-medium text-primary">{tag}</dt>
          <dd className="break-keep text-muted-foreground">{description}</dd>
        </div>
      ))}
    </dl>
  );
}
