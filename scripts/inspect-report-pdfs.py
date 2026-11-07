"""로컬 렌더러로 만든 PDF를 검사하고 페이지 PNG/검토용 시트를 만든다."""
import json
import re
import sys
from pathlib import Path

import fitz
from PIL import Image, ImageDraw

root = Path(sys.argv[1]).resolve()
previews = root / "previews"
previews.mkdir(exist_ok=True)
compact = lambda value: re.sub(r"\s+", "", value)
def contains_in_order(expected, actual):
    # 페이지가 바뀌면 같은 행의 다른 셀이나 반복 머리글이 사이에 끼어 추출될 수 있다.
    iterator = iter(actual)
    return all(any(candidate == char for candidate in iterator) for char in expected)
results = []
thumbs = []
for pdf in sorted(root.glob("*.pdf")):
    source = json.loads(pdf.with_suffix(".json").read_text(encoding="utf-8"))
    doc = fitz.open(pdf)
    full_text = compact("\n".join(page.get_text() for page in doc))
    missing = []
    for diary in source["entries"]:
        if not contains_in_order(compact(diary["notes"]), full_text):
            missing.append(diary["date"] + ": notes")
        if source["kind"] == "daily":
            for activity in diary["activities"]:
                if not contains_in_order(compact(activity["detail"]), full_text):
                    missing.append(diary["date"] + ": " + activity["id"])
    outside, empty, bad_sizes, images = [], [], [], 0
    for number, page in enumerate(doc, 1):
        if not page.get_text().strip() and not page.get_images():
            empty.append(number)
        if abs(page.rect.width - 842) > 2 or abs(page.rect.height - 595) > 2:
            bad_sizes.append(number)
        for picture in page.get_image_info():
            images += 1
            x0, y0, x1, y1 = picture["bbox"]
            if min(x0, y0) < -1 or x1 > page.rect.width + 1 or y1 > page.rect.height + 1:
                outside.append({"page": number, "image": True, "box": list(picture["bbox"])})
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    x0, y0, x1, y1 = span["bbox"]
                    if min(x0, y0) < -1 or x1 > page.rect.width + 1 or y1 > page.rect.height + 1:
                        outside.append({"page": number, "text": span["text"], "box": list(span["bbox"])})
        image_path = previews / f"{pdf.stem}-{number:03}.png"
        page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(image_path)
        if number <= 3 or (number == len(doc) and len(doc) > 3):
            thumbs.append((image_path, f"{pdf.stem} / {number} of {len(doc)}"))
    results.append({"file": pdf.name, "case": source["label"], "pages": len(doc), "missing": missing,
                    "outside": outside, "blank_pages": empty, "bad_page_sizes": bad_sizes, "images": images})

for group in range(0, len(thumbs), 12):
    part = thumbs[group:group + 12]
    sheet = Image.new("RGB", (1680, ((len(part) + 2) // 3) * 325), "#d8dee8")
    draw = ImageDraw.Draw(sheet)
    for index, (image_path, label) in enumerate(part):
        image = Image.open(image_path)
        image.thumbnail((546, 290))
        x, y = (index % 3) * 560, (index // 3) * 325
        draw.text((x + 10, y + 4), label, fill="black")
        sheet.paste(image, (x + 7, y + 25))
    sheet.save(root / f"contact-{group // 12 + 1:02}.png")

(root / "pdf-inspection.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(results, ensure_ascii=False, indent=2))
sys.exit(1 if len(results) != 20 or any(r["missing"] or r["outside"] or r["blank_pages"] or r["bad_page_sizes"] for r in results) else 0)
