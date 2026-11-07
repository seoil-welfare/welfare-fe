import { test, expect } from "./fixtures";
import { mockApi } from "./support";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const prepare = resolve("scripts/prepare.mjs");
for (const kind of ["zip", "spaces", "korean", "repo", "parentRepo", "brokenGitFile", "brokenGitDir", "noGit", "oldHook", "worktree"]) {
  test(`12-02 prepare ${kind}`, () => {
    const root = mkdtempSync(join(tmpdir(), "carelog-prepare-"));
    let cwd = root;
    const git = (...args: string[]) => {
      const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
      expect(result.status, result.stderr).toBe(0);
      return result.stdout;
    };
    try {
      if (kind === "spaces" || kind === "korean") { cwd = join(root, kind === "spaces" ? "zip folder" : "설치 폴더"); mkdirSync(cwd); }
      if (["repo", "oldHook", "parentRepo", "worktree"].includes(kind)) git("init", "--quiet");
      if (kind === "oldHook") git("config", "core.hooksPath", "old-hooks");
      if (kind === "parentRepo") { cwd = join(root, "zip"); mkdirSync(cwd); }
      if (kind === "brokenGitFile") writeFileSync(join(root, ".git"), "gitdir: missing-directory");
      if (kind === "brokenGitDir") mkdirSync(join(root, ".git"));
      if (kind === "noGit") mkdirSync(join(root, ".git"));
      if (kind === "worktree") {
        git("-c", "user.name=QA", "-c", "user.email=qa@example.test", "commit", "--allow-empty", "--no-verify", "-m", "test");
        cwd = join(root, "linked");
        git("worktree", "add", "--detach", cwd, "HEAD");
      }
      const result = spawnSync(process.execPath, [prepare], { cwd, windowsHide: true, encoding: "utf8",
        env: kind === "noGit" ? { ...process.env, PATH: "" } : process.env });
      expect(result.status, result.stderr).toBe(0);
      if (["repo", "oldHook", "worktree"].includes(kind)) expect(git("config", "core.hooksPath").trim()).toBe(".githooks");
      if (kind === "parentRepo") expect(spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8", windowsHide: true }).status).toBe(1);
      const pkg = JSON.parse(readFileSync("package.json", "utf8"));
      expect(pkg.devDependencies.esbuild).toBeTruthy();
    } finally {
      const safe = resolve(root);
      if (safe.startsWith(resolve(tmpdir()) + sep) && safe.includes("carelog-prepare-")) rmSync(safe, { recursive: true, force: true, maxRetries: 3 });
    }
  });
}

for (const path of ["/home", "/news", "/calendar", "/stats", "/stats/activities", "/stats/reaction", "/users", "/staff/1", "/settings/participation", "/mypage"]) {
  test(`12-03 공용 컴포넌트 정리 후 ${path} 실행`, async ({ page }) => {
    await mockApi(page, { role: "teamLead" });
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도", exact: true })).toHaveCount(0);
  });
}
