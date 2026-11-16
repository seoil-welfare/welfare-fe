import Docxtemplater from "docxtemplater";
import InspectModule from "docxtemplater/js/inspect-module.js";
import PizZip from "pizzip";
import { knownTags, type ReportFormKind } from "@/services/reportFormFields";

/**
 * 기관 양식 파일(docx)을 올리기 전에 검사한다.
 * 막아야 하는 문제(errors)가 있으면 등록하지 않고, 경고(unknownTags)는 알려 주기만 한다.
 * 브라우저 전용 기능을 쓰지 않아서 Node 검증 스크립트에서도 그대로 부를 수 있다.
 */

/** 양식 파일 최대 크기. 서버도 같은 기준으로 막는다 */
export const REPORT_FORM_MAX_BYTES = 5 * 1024 * 1024;

export interface ReportFormCheck {
  /** 등록할 수 있는지 (errors가 없음) */
  ok: boolean;
  /** 등록을 막는 이유 */
  errors: string[];
  /** 앱이 채우는 칸 (양식에 적힌 이름 그대로, 반복 칸 안은 '반복.칸') */
  filled: string[];
  /** 앱이 모르는 칸. 출력하면 빈칸이 된다 */
  unknownTags: string[];
}

const OTHER_FORMATS: Record<string, string> = {
  hwp: "한글(hwp) 파일이에요. 한글에서 '다른 이름으로 저장' → 파일 형식 'Word 문서(*.docx)'로 바꿔 올려 주세요.",
  hwpx: "한글(hwpx) 파일이에요. 한글에서 '다른 이름으로 저장' → 파일 형식 'Word 문서(*.docx)'로 바꿔 올려 주세요.",
  doc: "옛 Word(doc) 파일이에요. Word에서 '다른 이름으로 저장' → 'Word 문서(*.docx)'로 바꿔 올려 주세요.",
  pdf: "PDF는 칸을 채울 수 없어요. 원본 Word(docx) 파일을 올려 주세요.",
};

const NOT_DOCX = "Word(docx) 파일이 아니에요. docx 파일만 올릴 수 있어요.";

export function checkReportForm(fileName: string, content: ArrayBuffer, kind: ReportFormKind): ReportFormCheck {
  const fail = (message: string): ReportFormCheck => ({ ok: false, errors: [message], filled: [], unknownTags: [] });

  // 1. 확장자
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "docx") return fail(OTHER_FORMATS[ext] ?? NOT_DOCX);

  // 2. 크기
  if (content.byteLength > REPORT_FORM_MAX_BYTES) return fail("파일이 너무 커요. 5MB 이하로 올려 주세요.");

  // 3. 속이 Word 문서인지 (docx는 zip 안에 word/document.xml이 있다)
  let zip: PizZip;
  try {
    zip = new PizZip(content);
  } catch {
    return fail(NOT_DOCX);
  }
  if (!zip.file("word/document.xml")) return fail(NOT_DOCX);

  // 4. 표시 문법 (출력할 때와 같은 설정으로 읽어 본다)
  const inspect = new InspectModule();
  try {
    new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, modules: [inspect], errorLogging: false }); // 오류는 아래에서 문장으로 바꿔 보여 준다
  } catch (error) {
    return { ok: false, errors: templateErrors(error), filled: [], unknownTags: [] };
  }

  // 5. 칸 이름 비교
  const known = knownTags(kind);
  const filled: string[] = [];
  const unknown: string[] = [];
  const tags = inspect.getAllTags() as TagTree;
  for (const [name, inner] of Object.entries(tags) as [string, TagTree][]) {
    const loopFields = known.loops.get(name);
    if (loopFields) {
      filled.push(name);
      // 반복 안에서는 반복 칸과 바깥 칸(이용자이름 등)을 모두 쓸 수 있다
      for (const child of Object.keys(inner)) {
        (loopFields.has(child) || known.top.has(child) ? filled : unknown).push(name + "." + child);
      }
    } else if (known.top.has(name) && Object.keys(inner).length === 0) {
      filled.push(name);
    } else {
      unknown.push(name);
    }
  }

  if (filled.length === 0) {
    return {
      ok: false,
      errors: ["앱이 채울 칸이 하나도 없어요. 값이 들어갈 자리에 {이용자이름}처럼 표시를 적어 주세요."],
      filled,
      unknownTags: unknown,
    };
  }
  return { ok: true, errors: [], filled, unknownTags: unknown };
}

interface TagTree {
  [name: string]: TagTree;
}

interface TemplateErrorLike {
  properties?: {
    id?: string;
    xtag?: string;
    openingtag?: string;
    closingtag?: string;
    errors?: TemplateErrorLike[];
  };
}

/** docxtemplater 오류를 담당자가 고칠 수 있는 문장으로 바꾼다 */
function templateErrors(error: unknown): string[] {
  const root = error as TemplateErrorLike;
  const list = root.properties?.errors?.length ? root.properties.errors : [root];
  const messages = list.map((e) => {
    const p = e.properties ?? {};
    const tag = p.xtag ? "‘" + p.xtag + "’" : "표시";
    switch (p.id) {
      case "unclosed_tag":
        return tag + "의 닫는 괄호 }가 없어요.";
      case "unopened_tag":
        return tag + "의 여는 괄호 {가 없어요.";
      case "duplicate_open_tag":
        return tag + " 앞에 여는 괄호 {가 두 번 있어요.";
      case "duplicate_close_tag":
        return tag + " 뒤에 닫는 괄호 }가 두 번 있어요.";
      case "unclosed_loop":
        return "{#" + (p.xtag ?? "") + "}의 짝 {/" + (p.xtag ?? "") + "}가 없어요.";
      case "unopened_loop":
        return "{/" + (p.xtag ?? "") + "}의 짝 {#" + (p.xtag ?? "") + "}가 없어요.";
      case "closing_tag_does_not_match_opening_tag":
        return "{#" + (p.openingtag ?? "") + "}와 {/" + (p.closingtag ?? "") + "}의 이름이 달라요.";
      case "loop_position_invalid":
        return tag + " 반복 표시의 위치가 잘못됐어요. 여는 표시와 닫는 표시를 같은 표 줄 또는 같은 문단 사이에 두세요.";
      default:
        return "양식의 표시를 읽지 못했어요. {이름} 모양이 맞는지 확인해 주세요.";
    }
  });
  return [...new Set(messages)];
}
