"""한국어 사용자 매뉴얼의 페이지/내용/파일 크기를 검사하고 배포 PDF를 저장한다."""
import json
from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[2]
assets = root / "사용자매뉴얼" / "제작자료"
manifest = json.loads((assets / "manifest.json").read_text(encoding="utf-8"))
doc = fitz.open(assets / "manual-unoptimized.pdf")
assert len(doc) == manifest["expectedPages"], (len(doc), manifest["expectedPages"])
errors = []
for number, page in enumerate(doc, 1):
    text = page.get_text()
    if len(text.strip()) < 100:
        errors.append({"page": number, "error": "too little text"})
    if abs(page.rect.width - 595.28) > 2 or abs(page.rect.height - 841.89) > 2:
        errors.append({"page": number, "error": "not A4 portrait"})
    # Chromium은 그림자·배경도 이미지로 저장한다. 캡처 원본 크기로 실제 화면만 검사한다.
    pictures = [p for p in page.get_image_info() if (p["width"], p["height"]) == (540, 1170)]
    expected_images = 1 if number == 1 else 0 if number in [2, len(doc)] else 2
    if len(pictures) != expected_images:
        errors.append({"page": number, "error": "missing screenshot", "expected": expected_images})
    for picture in pictures:
        x0, y0, x1, y1 = picture["bbox"]
        if min(x0, y0) < -1 or x1 > page.rect.width + 1 or y1 > page.rect.height + 1:
            errors.append({"page": number, "error": "image outside page"})
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                box = span["bbox"]
                if min(box[0], box[1]) < -1 or box[2] > page.rect.width + 1 or box[3] > page.rect.height + 1:
                    errors.append({"page": number, "error": "text outside page", "text": span["text"]})
assert not errors, errors
doc.set_toc([[1, item["title"], item["page"]] for item in manifest["pages"]])
doc.set_metadata({"title": "케어로그 사용자 매뉴얼", "author": "케어로그", "subject": "모바일 화면으로 보는 일지 작성·통계·보고서 출력·관리 안내", "keywords": "케어로그, 사용자 매뉴얼, 일지, 통계, 보고서"})
final = root / "케어로그_사용자매뉴얼.pdf"
doc.save(final, garbage=4, deflate=True)
with fitz.open(final) as saved:
    assert len(saved.get_toc()) == len(manifest["pages"])
    assert len(saved[1].get_links()) == len(manifest["pages"]) - 2
result = {"pages": len(doc), "bytes": final.stat().st_size, "megabytes": round(final.stat().st_size / 1024**2, 2), "capturedScreenshots": manifest["screenshotCount"], "includedUniqueScreenshots": manifest["includedUniqueScreenshots"], "screenshotPlacements": manifest["screenshotPlacements"], "layoutErrors": errors, "file": final.name}
assert result["megabytes"] < 5, "PDF must be smaller than 5 MB"
(assets / "pdf-check.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
for number in [0, 2, 4, 5, 9, 14, 17, len(doc) - 1]:
    if number < len(doc):
        doc[number].get_pixmap(matrix=fitz.Matrix(1.25, 1.25)).save(assets / f"preview-{number + 1:02}.png")
print(json.dumps(result, ensure_ascii=False, indent=2))
doc.close()
(assets / "manual-unoptimized.pdf").unlink()
