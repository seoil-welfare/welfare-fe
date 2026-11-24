// 사용자가 제공한 예시 양식의 표·색·글꼴·페이지 크기를 재사용한다.
// 예시 본문을 복사하지 않고 실제 앱 데이터가 있는 칸만 남겨 템플릿을 생성한다.
// node scripts/build-report-templates.cjs
const fs = require("node:fs");
const path = require("node:path");
const PizZip = require("pizzip");
const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const serialize = (node) => new XMLSerializer().serializeToString(node);
const children = (node, name) => Array.from(node.childNodes).filter((n) => n.nodeType === 1 && (!name || n.localName === name));
const first = (node, name) => children(node, name)[0];
const all = (node, name) => Array.from(node.getElementsByTagNameNS(W, name));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function paragraph(value, { heading = false, page = false } = {}) {
  return `<w:p><w:pPr>${page ? "<w:pageBreakBefore/>" : ""}<w:spacing w:before="120" w:after="120"/>${heading ? "<w:keepNext/>" : ""}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕"/>${heading ? '<w:b/><w:color w:val="17376B"/>' : ""}<w:sz w:val="${heading ? 26 : 18}"/></w:rPr><w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p>`;
}

function setCell(cell, value) {
  const original = all(cell, "p")[0];
  const p = original.cloneNode(true);
  const props = first(p, "pPr")?.cloneNode(true);
  const runProps = all(p, "rPr")[0]?.cloneNode(true);
  while (p.firstChild) p.removeChild(p.firstChild);
  if (props) p.appendChild(props);
  const run = p.ownerDocument.createElementNS(W, "w:r");
  if (runProps) run.appendChild(runProps);
  const t = p.ownerDocument.createElementNS(W, "w:t");
  t.setAttribute("xml:space", "preserve");
  t.appendChild(p.ownerDocument.createTextNode(value));
  run.appendChild(t); p.appendChild(run);
  for (const n of children(cell).filter((n) => n.localName !== "tcPr")) cell.removeChild(n);
  cell.appendChild(p);
}

/** 칸 안 내용을 세로 가운데로 맞춘다 (가로 정렬은 그대로 둔다) */
function setVAlignCenter(cell) {
  let tcPr = first(cell, "tcPr");
  if (!tcPr) {
    tcPr = cell.ownerDocument.createElementNS(W, "w:tcPr");
    cell.insertBefore(tcPr, cell.firstChild);
  }
  let vAlign = first(tcPr, "vAlign");
  if (!vAlign) {
    vAlign = cell.ownerDocument.createElementNS(W, "w:vAlign");
    tcPr.appendChild(vAlign);
  }
  vAlign.setAttributeNS(W, "w:val", "center");
}

// 결재란 담당자 칸. '국 장' 등을 늘릴 때는 이 배열에 추가하면 된다.
const APPROVAL_ROLES = ["담 당", "팀 장"];
const NONE_BORDERS = ["top", "left", "bottom", "right"]
  .map((side) => `<w:${side} w:val="none" w:sz="0" w:space="0" w:color="auto"/>`).join("");
const SOLID_BORDERS = ["top", "left", "bottom", "right"]
  .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join("");

function approvalParagraph(value) {
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="맑은 고딕" w:eastAsia="맑은 고딕"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p>`;
}

function approvalTcPr({ width, shade = false, vMerge = null }) {
  const vMergeXml = vMerge ? `<w:vMerge w:val="${vMerge}"/>` : "";
  const shd = shade ? '<w:shd w:val="clear" w:color="auto" w:fill="D9D9D9"/>' : "";
  return `<w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${vMergeXml}<w:tcBorders>${SOLID_BORDERS}</w:tcBorders>${shd}<w:vAlign w:val="center"/></w:tcPr>`;
}

/** 결재란: 왼쪽 '결/재' 병합 칸 + 담당자 수만큼 머리글·서명 칸. 너비는 dxa(twips) 단위. */
function approvalTable(roles) {
  const labelWidth = 567; // 1cm
  const roleWidth = 1134; // 2cm
  const width = labelWidth + roleWidth * roles.length;
  const grid = [labelWidth, ...roles.map(() => roleWidth)].map((w) => `<w:gridCol w:w="${w}"/>`).join("");
  const headerRow =
    `<w:tr>` +
    `<w:tc>${approvalTcPr({ width: labelWidth, vMerge: "restart" })}${approvalParagraph("결")}${approvalParagraph("재")}</w:tc>` +
    roles.map((role) => `<w:tc>${approvalTcPr({ width: roleWidth, shade: true })}${approvalParagraph(role)}</w:tc>`).join("") +
    `</w:tr>`;
  const signRow =
    `<w:tr><w:trPr><w:trHeight w:val="1020" w:hRule="atLeast"/></w:trPr>` +
    `<w:tc>${approvalTcPr({ width: labelWidth, vMerge: "continue" })}<w:p/></w:tc>` +
    roles.map(() => `<w:tc>${approvalTcPr({ width: roleWidth })}<w:p/></w:tc>`).join("") +
    `</w:tr>`;
  const xml = `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblBorders>${SOLID_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${headerRow}${signRow}</w:tbl>`;
  return { xml, width };
}

/** 본문 영역 너비(dxa) = 용지 너비 - 왼쪽/오른쪽 여백 */
function contentWidth(section) {
  const pgSz = first(section, "pgSz");
  const pgMar = first(section, "pgMar");
  const pageWidth = Number(pgSz.getAttributeNS(W, "w"));
  const left = Number(pgMar.getAttributeNS(W, "left"));
  const right = Number(pgMar.getAttributeNS(W, "right"));
  return pageWidth - left - right;
}

/** 제목(왼쪽)과 결재란(오른쪽)을 한 줄에 두기 위해 테두리 없는 1행 2칸 표로 감싼다. */
function titleWithApproval(text, section) {
  const approval = approvalTable(APPROVAL_ROLES);
  const total = contentWidth(section);
  const titleWidth = total - approval.width;
  // 왼쪽 여백을 0으로 둬서 제목이 표 밖 본문 문단과 같은 선에서 시작하게 한다.
  const titleCell = `<w:tc><w:tcPr><w:tcW w:w="${titleWidth}" w:type="dxa"/><w:tcBorders>${NONE_BORDERS}</w:tcBorders><w:tcMar><w:left w:w="0" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${paragraph(text, { heading: true })}</w:tc>`;
  const approvalCell = `<w:tc><w:tcPr><w:tcW w:w="${approval.width}" w:type="dxa"/><w:tcBorders>${NONE_BORDERS}</w:tcBorders><w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${approval.xml}</w:tc>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${NONE_BORDERS}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${titleWidth}"/><w:gridCol w:w="${approval.width}"/></w:tblGrid><w:tr>${titleCell}${approvalCell}</w:tr></w:tbl>`;
}

/** 불필요한 열을 제거하고 원래 너비 비율로 나머지 열을 배분한다. */
function table(source, keep, headers, fields, loop) {
  const tbl = source.cloneNode(true);
  const rows = children(tbl, "tr");
  if (rows.length < 2) throw new Error("반복할 데이터 행이 있는 표가 필요합니다.");
  for (const row of rows.slice(2)) tbl.removeChild(row);
  const grid = first(tbl, "tblGrid");
  const columns = children(grid, "gridCol");
  const total = columns.reduce((n, c) => n + Number(c.getAttributeNS(W, "w")), 0);
  const retained = keep.reduce((n, i) => n + Number(columns[i].getAttributeNS(W, "w")), 0);
  const widths = keep.map((i) => Math.round(Number(columns[i].getAttributeNS(W, "w")) * total / retained));
  widths[widths.length - 1] += total - widths.reduce((a, b) => a + b, 0);
  for (const c of columns) grid.removeChild(c);
  for (const width of widths) {
    const c = tbl.ownerDocument.createElementNS(W, "w:gridCol"); c.setAttributeNS(W, "w:w", String(width)); grid.appendChild(c);
  }
  for (let r = 0; r < 2; r++) {
    const row = rows[r];
    if (r === 0) {
      let props = first(row, "trPr");
      if (!props) { props = row.ownerDocument.createElementNS(W, "w:trPr"); row.insertBefore(props, row.firstChild); }
      if (!first(props, "tblHeader")) props.appendChild(row.ownerDocument.createElementNS(W, "w:tblHeader"));
    }
    const cells = children(row, "tc");
    if (cells.length <= Math.max(...keep)) throw new Error("양식 표의 열 수가 예상과 달라요.");
    cells.forEach((cell, index) => { if (!keep.includes(index)) row.removeChild(cell); });
    children(row, "tc").forEach((cell, index) => {
      const tcw = all(cell, "tcW")[0];
      if (tcw) tcw.setAttributeNS(W, "w:w", String(widths[index]));
      const value = r === 0 ? headers[index]
        : (index === 0 ? "{#" + loop + "}" : "") + "{" + fields[index] + "}" + (index === fields.length - 1 ? "{/" + loop + "}" : "");
      setCell(cell, value);
      setVAlignCenter(cell);
    });
    // 사용자 기록이 길어져도 고정 행 높이로 잘리지 않게 한다.
    for (const height of all(row, "trHeight")) height.setAttributeNS(W, "w:hRule", "atLeast");
    if (r === 1) for (const cant of all(row, "cantSplit")) cant.parentNode.removeChild(cant);
  }
  return serialize(tbl);
}

function load(src) {
  const zip = new PizZip(fs.readFileSync(src));
  const doc = new DOMParser().parseFromString(zip.file("word/document.xml").asText(), "application/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  const tables = children(body, "tbl");
  const section = first(body, "sectPr");
  if (!section || tables.length !== 2) throw new Error("두 표와 페이지 설정이 있는 최신 양식이 필요해요.");
  return { zip, doc, body, tables, section };
}

function save(source, out, bodyXml) {
  const { zip, doc, section } = source;
  const original = serialize(doc);
  const begin = original.indexOf("<w:body>") + "<w:body>".length;
  const end = original.lastIndexOf("</w:body>");
  if (begin < 8 || end < begin) throw new Error("문서 본문을 찾을 수 없어요.");
  const xml = original.slice(0, begin) + bodyXml + serialize(section) + original.slice(end);
  // 예시 값은 본문·그림 외의 문서 설명에도 남기지 않는다.
  zip.file("word/document.xml", xml);
  // 원본의 미사용 머리말·꼬리말에도 평가/계획 및 고정 쪽 번호가 남지 않게 한다.
  for (const file of zip.file(/^word\/(?:header|footer)\d*\.xml$/)) {
    const tag = file.name.includes("header") ? "hdr" : "ftr";
    zip.file(file.name, `<w:${tag} xmlns:w="${W}"><w:p/></w:${tag}>`);
  }
  zip.file("docProps/core.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>케어로그 활동일지</dc:title><dc:creator>케어로그</dc:creator></cp:coreProperties>');
  fs.writeFileSync(out, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(path.basename(out) + " — 실제 기록 필드만 포함");
}

function buildDaily(src, out) {
  const source = load(src);
  const activity = table(source.tables[0], [0, 1, 2, 3, 4, 5],
    ["시간", "참여 활동", "활동 내용", "사전 지원", "이용자 반응", "긍정행동지원"],
    ["time", "participation", "detail", "preSupport", "reaction", "positiveSupport"], "activities");
  const behaviors = table(source.tables[1], [0, 2, 3],
    ["활동 시간", "도전적 행동 선택 기록", "기록된 지원 방법"], ["time", "behaviors", "support"], "behaviorRecords");
  save(source, out, [
    titleWithApproval("일별활동일지", source.section),
    paragraph("이용자: {clientName}    작성일: {year}년 {month}월 {day}일 {weekday}요일    작성자: {authorName}"),
    paragraph("날씨: {weather}    온도: {temperature}    컨디션: {condition}"),
    paragraph("시간대별 활동 기록", { heading: true }), activity,
    // 특이사항은 활동 기록 바로 아래에 둔다 (복지관 요청)
    paragraph("특이사항", { heading: true }), paragraph("{notes}"),
    paragraph("도전적 행동", { heading: true, page: true }),
    paragraph("이용자: {clientName}    작성일: {year}년 {month}월 {day}일"),
    paragraph("도전적 행동 선택 기록 {behaviorCount}건"), behaviors,
  ].join(""));
}

function imageParagraph(source, index) {
  const drawings = Array.from(source.doc.getElementsByTagNameNS(A, "blip"));
  const blip = drawings[index];
  if (!blip) throw new Error("월별 양식의 그림 2개를 찾을 수 없어요.");
  let container = blip;
  while (container && !["anchor", "inline"].includes(container.localName)) container = container.parentNode;
  const extent = container.getElementsByTagNameNS(WP, "extent")[0];
  const cx = extent.getAttribute("cx"), cy = extent.getAttribute("cy");
  const graphic = container.getElementsByTagNameNS(A, "graphic")[0];
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="${WP}" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${index + 100}" name="실제 기록 집계 ${index + 1}"/>${serialize(graphic)}</wp:inline></w:drawing></w:r></w:p>`;
}

function buildMonthly(src, out) {
  const source = load(src);
  const headers = ["일", "컨디션", "대표 활동", "주요 지원", "전반 반응", "특이사항 / 도전적 행동", "선택 건수"];
  const fields = ["day", "condition", "activity", "support", "reaction", "remarks", "count"];
  const half = (index, loop) => table(source.tables[index], [0, 1, 2, 3, 4, 6, 7], headers, fields, loop);
  const header = paragraph("이용자: {clientName}    작성월: {year}년 {month}월    작성자: {authorNames}");
  save(source, out, [
    titleWithApproval("월별활동일지 · 1~16일", source.section), header,
    paragraph("작성 완료된 일지의 대표 선택 항목과 직접 입력한 특이사항을 요약합니다. 행동 수는 선택 기록 건수입니다."), half(0, "firstHalf"),
    paragraph("월별활동일지 · 17일~말일", { heading: true, page: true }), header, half(1, "secondHalf"),
    paragraph("월간 기록 요약", { heading: true, page: true }),
    paragraph("주요 참여 활동", { heading: true }), paragraph("{summaryParticipation}"),
    paragraph("기록된 지원 방법", { heading: true }), paragraph("{summarySupport}"),
    paragraph("특이사항 및 도전적 행동 기록", { heading: true }), paragraph("{summaryNotes}"),
    paragraph("도전적 행동 선택 기록 집계", { heading: true }), imageParagraph(source, 0), imageParagraph(source, 1),
  ].join(""));
}

module.exports = { buildDaily, buildMonthly };
if (require.main === module) {
  const dir = path.resolve(__dirname, "../src/assets/forms");
  buildDaily(path.join(dir, "daily-record.docx"), path.join(dir, "daily-record.template.docx"));
  buildMonthly(path.join(dir, "monthly-record.docx"), path.join(dir, "monthly-record.template.docx"));
}
