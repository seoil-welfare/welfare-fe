import type PizZip from "pizzip";

/**
 * 기관 양식의 그래프 자리.
 * 담당자가 Word에서 아무 그림이나 넣고 그 그림의 '대체 텍스트'에 '그래프:요약' 또는 '그래프:항목별'을 적으면,
 * 출력할 때 그 그림을 월간 그래프로 바꿔 끼운다. 가로 크기는 양식 그대로 두고 세로만 그래프 비율에 맞춘다.
 * 대체 텍스트로 찾으니 로고 같은 다른 그림은 건드리지 않는다.
 * 브라우저 전용 기능을 쓰지 않아서 Node 검증 스크립트에서도 부를 수 있다.
 */

export type ChartSlot = "totals" | "chart";

/** 대체 텍스트에 적을 이름 */
export const CHART_SLOT_LABEL: Record<ChartSlot, string> = {
  totals: "그래프:요약",
  chart: "그래프:항목별",
};

export const CHART_SLOT_DESCRIPTION: Record<ChartSlot, string> = {
  totals: "그 달 발생한 도전적 행동과 총 횟수",
  chart: "행동 항목별 월간 누적 횟수 막대그래프",
};

const SLOTS = Object.keys(CHART_SLOT_LABEL) as ChartSlot[];
const DOCUMENT = "word/document.xml";
const RELS = "word/_rels/document.xml.rels";
const CONTENT_TYPES = "[Content_Types].xml";
const IMAGE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const DRAWING = /<w:drawing>[\s\S]*?<\/w:drawing>/g;

/** 양식에 있는 그래프 자리 (중복 없이, 요약 → 항목별 순) */
export function findChartSlots(zip: PizZip): ChartSlot[] {
  const xml = zip.file(DOCUMENT)?.asText() ?? "";
  const found = new Set<ChartSlot>();
  for (const drawing of xml.match(DRAWING) ?? []) {
    const slot = slotOf(drawing);
    if (slot) found.add(slot);
  }
  return SLOTS.filter((slot) => found.has(slot));
}

/** 그래프 자리 그림을 넘겨받은 PNG로 바꾼다. 자리가 없으면 아무것도 바꾸지 않는다 */
export function fillChartSlots(zip: PizZip, images: Record<ChartSlot, Uint8Array>): void {
  const xml = zip.file(DOCUMENT)?.asText();
  if (!xml) return;
  const used = new Set<ChartSlot>();
  const next = xml.replace(DRAWING, (drawing) => {
    const slot = slotOf(drawing);
    if (!slot || !/<a:blip\b[^>]*r:embed="/.test(drawing)) return drawing;
    used.add(slot);
    const size = pngSize(images[slot]);
    return drawing
      .replace(/(<a:blip\b[^>]*r:embed=")[^"]*"/, "$1" + relId(slot) + '"')
      .replace(/<(wp:extent|a:ext)\s[^>]*\/>/g, (tag) => (size ? keepRatio(tag, size) : tag));
  });
  if (used.size === 0) return;

  let rels = zip.file(RELS)?.asText() ?? "";
  for (const slot of used) {
    zip.file("word/media/" + mediaName(slot), images[slot]);
    if (!rels.includes('Id="' + relId(slot) + '"')) {
      rels = rels.replace(
        "</Relationships>",
        '<Relationship Id="' + relId(slot) + '" Type="' + IMAGE_REL + '" Target="media/' + mediaName(slot) + '"/></Relationships>',
      );
    }
  }
  zip.file(RELS, rels);
  zip.file(DOCUMENT, next);

  // png를 처음 쓰는 양식이면 파일 형식을 알려 준다 (jpg 그림만 있던 양식 등)
  const types = zip.file(CONTENT_TYPES)?.asText() ?? "";
  if (types && !/<Default\s+Extension="png"/i.test(types)) {
    zip.file(CONTENT_TYPES, types.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>'));
  }
}

function relId(slot: ChartSlot) {
  return "rIdCareLog" + slot;
}

function mediaName(slot: ChartSlot) {
  return "carelog-" + slot + ".png";
}

/** 그림의 대체 텍스트(설명·제목)로 그래프 자리인지 본다. 띄어쓰기와 콜론 모양은 따지지 않는다 */
function slotOf(drawing: string): ChartSlot | null {
  const docPr = /<wp:docPr\b[^>]*>/.exec(drawing)?.[0];
  if (!docPr) return null;
  const texts = [attr(docPr, "descr"), attr(docPr, "title")].map(normalize);
  return SLOTS.find((slot) => texts.includes(normalize(CHART_SLOT_LABEL[slot]))) ?? null;
}

function attr(tag: string, name: string): string {
  const value = new RegExp("\\s" + name + '="([^"]*)"').exec(tag)?.[1] ?? "";
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#xA;|&#10;/gi, " ");
}

function normalize(text: string): string {
  return text.replace(/\s+/g, "").replace(/：/g, ":");
}

/** 가로는 두고 세로를 그래프 비율에 맞춘다 */
function keepRatio(tag: string, size: { width: number; height: number }): string {
  const cx = Number(/\scx="(\d+)"/.exec(tag)?.[1]);
  if (!cx) return tag;
  const cy = Math.round((cx * size.height) / size.width);
  return tag.replace(/\scy="\d+"/, ' cy="' + cy + '"');
}

/** PNG 머리(IHDR)에서 가로·세로 픽셀 */
function pngSize(png: Uint8Array): { width: number; height: number } | null {
  if (png.length < 24 || png[0] !== 0x89 || png[1] !== 0x50) return null;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  return width && height ? { width, height } : null;
}
