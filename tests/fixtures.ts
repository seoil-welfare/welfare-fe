import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use();
    expect(errors, "브라우저의 처리되지 않은 런타임 오류").toEqual([]);
  }, { auto: true }],
});
export { expect };
