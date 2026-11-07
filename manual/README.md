# 사용자 매뉴얼 제작 도구

제품 코드를 바꾸지 않고 실제 FE 화면에서 사용자 절차를 실행·캡처해 PDF를 만든다.

- Chromium의 모바일 브라우저 재현: 360×780, 터치 입력, 배율 1.5. S22급 화면을 기준으로 삼았으며 실제 갤럭시/Android OS 에뮬레이터 검증은 아니다.
- Android SDK·가상 기기 이미지는 설치하지 않는다. 기존 Playwright Chromium을 사용한다.
- 캡처의 이용자·직원·일지는 모두 명시적으로 만든 가상 데이터다. 운영 서버/DB를 읽거나 수정하지 않는다.
- 실제 UI의 버튼·선택·입력·확인창·다운로드를 실행하고 처리되지 않은 브라우저 오류와 가로 넘침을 검사한다. 서버의 인증/저장 로직 검증과는 구분한다.
- JPEG 캡처를 사용하고 PDF 글꼴을 포함한다. 완성 파일은 5MB 미만이어야 하며 목차·책갈피·A4 크기·글자 범위를 검사한다.

FE 폴더에서 실행:

```powershell
npx tsc -p tsconfig.manual.json
npx playwright test --config playwright.manual.config.ts
node manual/build.mjs
python manual/finish_pdf.py
```

Python은 이 환경에 이미 있는 PyMuPDF(`fitz`)를 사용한다. 최종 PDF는 상위 작업 폴더의 `케어로그_사용자매뉴얼.pdf`, 캡처와 검사 결과는 `사용자매뉴얼/제작자료/`에 저장한다. PDF 생성 후 중간 PDF는 지우고 HTML은 JPEG를 참조해 중복 용량을 줄인다.

일반 회귀 검사와 캡처 검사를 분리하기 위해 별도 Playwright 설정을 사용한다. `npm run test:qa`의 기존 케이스 수를 변경하지 않는다.
