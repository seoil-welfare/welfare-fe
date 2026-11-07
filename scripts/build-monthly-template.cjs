const path = require("node:path");
const { buildMonthly } = require("./build-report-templates.cjs");
const dir = path.resolve(__dirname, "../src/assets/forms");
const [src = path.join(dir, "monthly-record.docx"), out = path.join(dir, "monthly-record.template.docx")] = process.argv.slice(2);
buildMonthly(src, out);
