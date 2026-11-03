// 월별활동일지 원본 양식(monthly-record.docx)에서 앱이 채우는 템플릿(monthly-record.template.docx)을 만든다.
// 원본 양식이 바뀌었을 때만 돌린다. welfare-fe 폴더에서:
//   node scripts/build-monthly-template.cjs src/assets/forms/monthly-record.docx src/assets/forms/monthly-record.template.docx
// 원본의 예시 글자(김OO, 예시 문장 등)를 찾아 자리표시자로 바꾸는 방식이라, 양식 문구가 바뀌면 아래 찾는 글자도 고쳐야 한다.
// 만든 뒤 npm run check:data 로 확인한다 (check-monthly-record.ts).
const fs = require("fs");
const PizZip = require("pizzip");

const [src, out] = process.argv.slice(2);
const zip = new PizZip(fs.readFileSync(src));
let xml = zip.file("word/document.xml").asText();

const T_RE = /(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** 문단(또는 칸) 안 글자 조각을 texts 배열 순서대로 바꾼다. 남는 조각은 비운다 */
function setRuns(fragment, texts) {
  let i = 0;
  return fragment.replace(T_RE, (_, open, __, close) => {
    const text = i < texts.length ? texts[i] : "";
    i++;
    return '<w:t xml:space="preserve">' + esc(text) + close;
  });
}
const runsOf = (fragment) => [...fragment.matchAll(T_RE)].map((m) => m[2]);

/** 글자 조각이 정확히 runs와 같은 가장 안쪽 문단을 모두 찾아 바꾼다 (글상자는 Word 호환용으로 두 벌 있다) */
function replaceParagraphs(runs, makeTexts, expected) {
  let count = 0;
  xml = xml.replace(/<w:p[ >](?:(?!<w:p[ >])[\s\S])*?<\/w:p>/g, (p) => {
    if (JSON.stringify(runsOf(p)) !== JSON.stringify(runs)) return p;
    count++;
    return setRuns(p, makeTexts(runs));
  });
  if (count !== expected) throw new Error(runs.join("") + ": " + count + "곳 (예상 " + expected + ")");
}

// 머리말: 원본은 글자 길이에 기대 탭 칸을 맞춰서, 이름 길이가 바뀌면 뒤 칸이 밀려 줄이 넘친다.
// 탭 하나가 항상 정해진 위치 하나로 가도록 다시 짠다. 작성자·담당·팀장은 손으로 쓰는 밑줄 칸
const HEADER_RUNS = ["이용자", "  ", "김", "OO", "작성월", "  2026", "년", " 9", "월", "작성자", "  ", "박", "OO", "담당", " ", "팀장"];
const HEADER_TABS = [3800, 7400, 10600, 11200, 13000, 13400, 15200]; // 들여쓰기(200) 기준 twips
let headerCount = 0;
xml = xml.replace(/<w:p[ >](?:(?!<w:p[ >])[\s\S])*?<\/w:p>/g, (p) => {
  if (JSON.stringify(runsOf(p)) !== JSON.stringify(HEADER_RUNS)) return p;
  headerCount++;
  const open = p.match(/^<w:p[^>]*>/)[0];
  const pPr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)[0]
    .replace(/<w:tabs>[\s\S]*?<\/w:tabs>/, "<w:tabs>" + HEADER_TABS.map((pos) => '<w:tab w:val="left" w:pos="' + pos + '"/>').join("") + "</w:tabs>");
  const runs = [...p.matchAll(/<w:r>[\s\S]*?<\/w:r>/g)].map((m) => m[0]);
  const rPr = runs[0].match(/<w:rPr>[\s\S]*?<\/w:rPr>/)[0]; // 굵게 7.5pt
  const lineRPr = runs.find((r) => r.includes('w:u w:val="thick"')).match(/<w:rPr>[\s\S]*?<\/w:rPr>/)[0]; // 굵은 밑줄
  const text = (t) => "<w:r>" + rPr + '<w:t xml:space="preserve">' + t + "</w:t></w:r>";
  const tab = "<w:r>" + rPr + "<w:tab/></w:r>";
  const line = "<w:r>" + lineRPr + "<w:tab/></w:r>"; // 밑줄 그은 빈 칸
  const body = [
    text("이용자  {clientName}"), tab,
    text("작성월  {year}년 {month}월"), tab,
    text("작성자  "), line, tab,
    text("담당 "), line, tab,
    text("팀장 "), line,
  ].join("");
  return open + pPr + body + "</w:p>";
});
if (headerCount !== 2) throw new Error("머리말 " + headerCount + "곳");

// 월간 요약 5칸: 본문 문단 하나를 자리표시자로
const summaries = [
  ["선호활동", "{summaryParticipation}"],
  ["활동안내", "{summarySupport}"],
  ["활동", "{summaryNotes}", "간헐적으로"],
  ["활동", "{summaryCaution}", "신호가"],
  ["전반적으로", "{summaryOverall}"],
];
for (const [first, tag, contains] of summaries) {
  let count = 0;
  xml = xml.replace(/<w:p[ >](?:(?!<w:p[ >])[\s\S])*?<\/w:p>/g, (p) => {
    const runs = runsOf(p);
    if (runs[0] !== first || runs.length < 10) return p;
    if (contains && !runs.includes(contains)) return p;
    count++;
    return setRuns(p, [tag]);
  });
  if (count !== 2) throw new Error(tag + ": " + count + "곳");
}

// 일별 표 2개: 머리글 줄 + 반복할 줄 하나만 남긴다
const FIELDS = ["day", "condition", "activity", "support", "reaction", "result", "behaviors", "count"];
for (const loop of ["firstHalf", "secondHalf"]) {
  const start = xml.indexOf("<w:tbl>", loop === "firstHalf" ? 0 : xml.indexOf("</w:tbl>") + 1);
  const end = xml.indexOf("</w:tbl>", start);
  const table = xml.slice(start, end);
  const rows = [...table.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)];
  const proto = rows[1][0];
  const cells = [...proto.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((m) => m[0]);
  if (cells.length !== FIELDS.length) throw new Error("칸 수 " + cells.length);
  let row = proto;
  cells.forEach((cell, i) => {
    let tag = "{" + FIELDS[i] + "}";
    if (i === 0) tag = "{#" + loop + "}" + tag;
    if (i === cells.length - 1) tag = tag + "{/" + loop + "}";
    row = row.replace(cell, setRuns(cell, [tag]));
  });
  const before = table.slice(0, rows[1].index);
  const lastRow = rows[rows.length - 1];
  const after = table.slice(lastRow.index + lastRow[0].length);
  xml = xml.slice(0, start) + before + row + after + xml.slice(end);
}

zip.file("word/document.xml", xml);
fs.writeFileSync(out, zip.generate({ type: "nodebuffer", compression: "DEFLATE" }));
const tags = [...xml.matchAll(/\{[#/]?[a-zA-Z]+\}/g)].map((m) => m[0]);
console.log("자리표시자", tags.length + "개:", [...new Set(tags)].join(" "));
