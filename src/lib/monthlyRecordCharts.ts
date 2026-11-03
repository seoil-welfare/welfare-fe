import { MAX_CHART_BEHAVIORS, type BehaviorTotal } from "@/services/monthlyRecordService";

/**
 * 월간 기록 양식 안의 그림 2개를 캔버스로 그려 PNG로 돌려준다.
 * 크기와 색은 원본 양식(monthly-record.docx)의 그림과 같게 맞췄다. 화면 토큰이 아니라 문서 양식 색이다.
 * 실제로 발생한 행동만 많은 순으로 최대 5개 그린다 (양식 안내). 없으면 '발생한 도전적 행동 없음'을 적는다.
 */

const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const FORM_COLORS = {
  text: "#1F2937",
  muted: "#334155",
  panelBorder: "#94A3B8",
  panelHeader: "#E8F1FA",
  divider: "#94A3B8",
  bar: "#1F77B4",
  axis: "#111111",
};
const EMPTY_TEXT = "이번 달 발생한 도전적 행동 없음";

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("그림을 그릴 수 없는 브라우저예요.");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  return { canvas, ctx };
}

async function toPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("그림을 만들지 못했어요.");
  return new Uint8Array(await blob.arrayBuffer());
}

/** 칸 너비를 넘는 이름은 줄여 '…'을 붙인다 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + "…").width > maxWidth) cut = cut.slice(0, -1);
  return cut + "…";
}

/** 월간 발생 행동 및 총횟수 (1800×250): 머리띠 + 항목별 이름·밑줄·횟수 */
export async function drawBehaviorTotals(totals: readonly BehaviorTotal[]): Promise<Uint8Array> {
  const width = 1800;
  const height = 250;
  const header = 58;
  const { canvas, ctx } = createCanvas(width, height);

  ctx.beginPath();
  ctx.roundRect(4, 4, width - 8, height - 8, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = FORM_COLORS.panelHeader;
  ctx.fillRect(0, 0, width, header);
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = FORM_COLORS.panelBorder;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = FORM_COLORS.text;
  ctx.font = "bold 28px " + FONT;
  ctx.fillText("월간 발생 행동 및 총횟수", 30, header / 2 + 2);

  const items = totals.slice(0, MAX_CHART_BEHAVIORS);
  ctx.textAlign = "center";
  if (items.length === 0) {
    ctx.fillStyle = FORM_COLORS.muted;
    ctx.font = "30px " + FONT;
    ctx.fillText(EMPTY_TEXT, width / 2, (header + height) / 2);
    return toPng(canvas);
  }

  const slot = width / items.length;
  items.forEach((item, i) => {
    const x = slot * i + slot / 2;
    ctx.fillStyle = FORM_COLORS.muted;
    ctx.font = "30px " + FONT;
    ctx.fillText(fitText(ctx, item.label, Math.min(slot - 40, 360)), x, 110);
    ctx.fillStyle = FORM_COLORS.divider;
    ctx.fillRect(x - 100, 141, 200, 3);
    ctx.fillStyle = FORM_COLORS.text;
    ctx.font = "bold 30px " + FONT;
    ctx.fillText(item.count + "회", x, 182);
  });
  return toPng(canvas);
}

/** 행동 항목별 월간 누적 횟수 세로 막대그래프 (2045×813) */
export async function drawBehaviorChart(totals: readonly BehaviorTotal[]): Promise<Uint8Array> {
  const width = 2045;
  const height = 813;
  const { canvas, ctx } = createCanvas(width, height);
  const baseline = 733;
  const top = 250; // 가장 긴 막대의 꼭대기
  const left = 20;
  const right = width - 20;

  ctx.fillStyle = FORM_COLORS.axis;
  ctx.font = "46px " + FONT;
  ctx.fillText("행동 항목별 월간 누적 횟수", width / 2, 45);

  ctx.fillRect(left, baseline, right - left, 2);

  const items = totals.slice(0, MAX_CHART_BEHAVIORS);
  if (items.length === 0) {
    ctx.fillStyle = FORM_COLORS.muted;
    ctx.font = "38px " + FONT;
    ctx.fillText(EMPTY_TEXT, width / 2, (top + baseline) / 2);
    return toPng(canvas);
  }

  const max = Math.max(...items.map((item) => item.count));
  const slot = (right - left) / items.length;
  const barWidth = Math.min(slot * 0.5, 360);
  items.forEach((item, i) => {
    const x = left + slot * i + slot / 2;
    const barHeight = ((baseline - top) * item.count) / max;
    ctx.fillStyle = FORM_COLORS.bar;
    ctx.fillRect(x - barWidth / 2, baseline - barHeight, barWidth, barHeight);
    ctx.fillStyle = FORM_COLORS.axis;
    ctx.font = "36px " + FONT;
    ctx.fillText(item.count + "회", x, baseline - barHeight - 30);
    ctx.fillRect(x - 1, baseline, 2, 12); // 눈금
    ctx.fillText(fitText(ctx, item.label, slot - 30), x, baseline + 42);
  });
  return toPng(canvas);
}
