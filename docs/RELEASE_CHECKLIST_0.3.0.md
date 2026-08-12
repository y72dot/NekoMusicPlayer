# NekoMusicPlayer 0.3.0 发布检查记录

> 准备日期：2026-08-13  
> 状态：本地发布候选准备完成，尚未推送、打标签或部署

## 版本与范围

- [x] `package.json` 版本更新为 `0.3.0`。
- [x] `package-lock.json` 根包版本与 `package.json` 一致。
- [x] Node.js 最低版本统一为 20。
- [x] `CHANGELOG.md` 已记录 0.1.0～0.3.0 的主要变更。
- [x] README 已覆盖当前数据源、缓存、设置、PWA、国际化和测试方式。

## 本地质量验证

- [x] `npm ci --ignore-scripts --dry-run` 通过。
- [x] `npm run typecheck` 通过。
- [x] `npm test` 通过：23 个测试文件、175 项测试。
- [x] `npm run build` 通过并生成 PWA 构建产物。
- [x] 稳定性收敛后完整 E2E 连续运行 3 次通过：每次 104/104。
- [x] 全部阶段提交后再次执行最终 E2E：104/104 通过。
- [x] 完整 E2E 在 4 workers 下约 1.3～1.4 分钟完成。
- [x] `git diff --check` 通过。

## CI 与部署准备

- [x] PR 质量工作流已创建。
- [x] 部署工作流要求类型、单测、构建和 E2E 通过。
- [x] 部署使用与验证提交一致的构建 Artifact。
- [x] Playwright 失败诊断配置为 Artifact。
- [x] SSH 密码不再直接插入命令行。
- [x] SSH 主机校验不再使用 `StrictHostKeyChecking=no`。

## 推送后必须完成

- [ ] 推送当前提交到远端分支。
- [ ] 配置 `SSH_KNOWN_HOSTS` Secret，值从可信渠道获取。
- [ ] 检查 `production` GitHub Environment，并建议启用人工审批。
- [ ] 为 `main` 启用分支保护和必需质量检查。
- [ ] 观察首次 GitHub Actions，确认 Node 20、Chromium 和 Ubuntu 环境通过。
- [ ] 执行或批准生产部署。
- [ ] 部署后验证导航、导入、播放、刷新恢复、歌单和设置保存。
- [ ] 创建带注释标签 `v0.3.0`。
- [ ] 创建 GitHub Release，并引用 `CHANGELOG.md` 的 0.3.0 内容。
- [ ] 确认上一稳定版本仍可用于回滚。

## 发布阻塞规则

出现下列任一情况时不得创建正式 Release：

- 类型检查、单元测试、构建或 E2E 在 CI 中失败。
- `SSH_KNOWN_HOSTS` 未配置或主机指纹来源不可信。
- 生产环境缺少必要 Secret、权限或回滚条件。
- 版本号、标签、Release 和部署提交不一致。
- 存在未说明的 P0/P1 问题。

## 建议发布命令

以下命令只应在远端 CI 通过、生产验证完成后执行：

```bash
git tag -a v0.3.0 -m "Release v0.3.0"
git push origin v0.3.0
```

正式发布前应再次确认当前 `HEAD` 正是 CI 和生产部署验证过的提交。
