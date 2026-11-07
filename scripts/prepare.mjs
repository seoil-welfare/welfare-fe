import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

// zip 배포본이나 Git이 없는 환경에서도 의존성 설치를 막지 않는다. 워크트리의 .git 파일도 허용한다.
if (existsSync(".git")) {
  const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "inherit", windowsHide: true });
  if (result.error || result.status !== 0) console.warn("Git hook 설정을 건너뛰었어요. 의존성 설치는 계속합니다.");
}
