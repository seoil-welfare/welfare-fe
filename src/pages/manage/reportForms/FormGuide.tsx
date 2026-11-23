import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/misc";
import { CHART_SLOT_DESCRIPTION, CHART_SLOT_LABEL, type ChartSlot } from "@/lib/export/chartSlots";
import { REPORT_FIELDS, type ReportFormKind } from "@/services/reportFormFields";

/** 양식 만드는 법과 쓸 수 있는 칸 목록 */
export function FormGuide({ kind }: { kind: ReportFormKind }) {
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
