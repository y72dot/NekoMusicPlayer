# 播放链路修复与自动化验收方案

## 1. 背景与结论

2026-08-15 至 2026-08-20 的三份浏览器日志暴露了三个连续但不同的问题：

1. 网易云播放地址 API 出现连续超时，播放器曾对队列内歌曲形成重复请求风暴。
2. 客户端把网易云返回的原始 HTTP 签名地址强制改成 HTTPS，导致 CDN 校验签名后返回 403。
3. 回退到 `6e71451` 后，清空站点数据会删除音频 Blob 和凭据；旧客户端又试图直接设置浏览器禁止的 `Cookie` 请求头，最终把认证失败误报为“版权限制”。

仅检查首页、静态资源和 `/healthz` 无法证明播放器可用。发布验收必须从全新缓存状态走完“凭据转发 → 获取签名地址 → 保留协议和查询参数 → Range 获取媒体内容”的完整链路。

## 2. 修复目标

- 浏览器不直接发送受保护的 `Cookie` 请求头，而使用同源 `X-Neko-Upstream-Cookie`，由 Nginx 转换为上游 Cookie。
- 签名媒体地址保留网易云返回的原始 `http` 或 `https` 协议、主机、路径和查询参数。
- 冷缓存首次播放不预下载整首歌曲，直接交给 `HTMLMediaElement` 通过同源代理流式播放。
- Nginx 透传 `Range`、`If-Range`，使用 HTTP/1.1，并允许可靠的分段响应。
- Service Worker 不缓存通用媒体 Range 响应，避免旧响应、部分响应和完整响应互相污染。
- 上游短暂超时或 5xx 只重试一次；认证失败和确定性 4xx 不重试。
- 发布后真实播放验收失败时，在清理旧版本前自动回滚。

## 3. 分层验收架构

### 阶段 A：静态和单元门禁

每次提交执行：

```bash
npm run typecheck
npm run test:unit
npm run build
node scripts/validate-production.mjs
```

覆盖内容：

- Cookie 只能通过 `X-Neko-Upstream-Cookie` 发送。
- HTTP 和 HTTPS 媒体地址生成不同且正确的同源代理路径。
- 非 `*.music.126.net` 地址被拒绝。
- 冷缓存时适配器返回流式 URL，不调用整曲 `fetch`。
- 暂时性超时或 5xx 最多重试一次。
- Nginx 模板必须包含认证代理、媒体 allowlist、Range 路由和部署回滚标记。

### 阶段 B：确定性冷缓存浏览器验收

CI 自动运行 `e2e/specs/netease-cold-cache-playback.spec.ts`。该测试：

1. 创建新的 Chromium 上下文并阻止 Service Worker。
2. 删除 localStorage 和 IndexedDB，确保不存在旧音频 Blob。
3. 通过真实 UI 保存测试 Cookie、导入歌曲并点击播放。
4. 使用 Playwright 模拟网易云元数据和签名地址响应。
5. 断言请求携带自定义凭据头，不依赖浏览器 `Cookie` 头。
6. 断言 HTTP 签名没有被升级成 HTTPS，完整查询参数得到保留。
7. 断言媒体请求只访问同源 `/api/netease-media/...`，并能返回 200 或 206 音频内容。
8. 断言播放器没有产生错误 Toast。

本层不使用真实账号，结果稳定，可在每个 Pull Request 和 `main` 推送中执行。

### 阶段 C：真实生产播放验收

`scripts/accept-production-playback.mjs` 使用只读验收账号调用生产域名：

1. 从权限受限文件读取 `MUSIC_U`，不从命令行参数或仓库读取秘密。
2. 向生产 `/api/netease/weapi/song/enhance/player/url/v1` 发起加密请求。
3. 验证返回的是 allowlist 内的媒体主机。
4. 按原协议生成同源媒体代理地址。
5. 使用 `Range: bytes=0-65535` 请求媒体。
6. 接受 HTTP 200 或 206，验证音频 Content-Type，并至少读取一个非空数据块。
7. 输出只包含状态码、Content-Type 和首块大小；不输出 Cookie 或签名 URL。

手动执行示例：

```bash
npm run accept:production-playback -- \
  --base-url https://music.72dot.cn \
  --cookie-file /etc/nekomusic/netease-acceptance.cookie \
  --track-id 347230
```

### 阶段 D：发布门禁与自动回滚

服务器部署脚本在新版本激活后、旧版本清理前执行阶段 C。推荐生产使用强制模式：

```bash
REQUIRE_PLAYBACK_ACCEPTANCE=1 \
PLAYBACK_ACCEPTANCE_COOKIE_FILE=/etc/nekomusic/netease-acceptance.cookie \
PLAYBACK_ACCEPTANCE_TRACK_ID=347230 \
bash ops/deploy/deploy-from-server.sh main
```

若真实播放验收失败，脚本进入现有 `ERR` trap，恢复 `current` 到上一发布目录。只有真实验收成功才执行 `finalize`。

未配置 Cookie 文件且未开启强制模式时，脚本会明确打印跳过警告；生产环境不应长期使用这种模式。

## 4. 验收凭据配置

使用专门的低权限网易云账号，不复用个人主账号。凭据只需部署用户可读：

```bash
sudo install -d -m 0750 -o root -g ubuntu /etc/nekomusic
read -rsp 'MUSIC_U: ' NEKO_ACCEPTANCE_COOKIE
printf '%s' "$NEKO_ACCEPTANCE_COOKIE" | sudo tee /etc/nekomusic/netease-acceptance.cookie >/dev/null
unset NEKO_ACCEPTANCE_COOKIE
sudo chown root:ubuntu /etc/nekomusic/netease-acceptance.cookie
sudo chmod 0640 /etc/nekomusic/netease-acceptance.cookie
```

如验收账号必须使用 `__csrf`，将其写入另一个同权限文件，并设置 `PLAYBACK_ACCEPTANCE_CSRF_FILE`。脚本不会记录文件内容。

验收歌曲必须满足：账号当前可播放、体积适中、ID 稳定。若歌曲下架，应先更换 `PLAYBACK_ACCEPTANCE_TRACK_ID`，不能通过关闭门禁绕过长期故障。

## 5. 通过标准

| 门禁 | 通过条件 | 失败含义 |
| --- | --- | --- |
| 类型与单元测试 | 全部通过 | 客户端契约或错误恢复回归 |
| 冷缓存 E2E | 自定义凭据头、原协议代理、媒体请求和无错误 Toast 全部满足 | 浏览器端首次播放回归 |
| Nginx 结构校验 | allowlist、Cookie 转换、Range 和部署标记存在 | 生产配置与前端不匹配 |
| 真实 API | HTTP 200 且返回非空签名 URL | Cookie、账号、上游或 API 代理异常 |
| 真实媒体 | HTTP 200/206、音频类型、非空首块 | 签名、协议、DNS、Range 或 CDN 代理异常 |
| 发布完成 | 阶段 C 成功后才 finalize | 否则自动回滚上一版本 |

## 6. 故障分类

- API 401/403：Cookie 失效或 Nginx 未转换凭据头。
- API 200 但 URL 为空：账号无权限、歌曲不可用或凭据未被上游接受。
- API 超时/5xx：服务器到 `music.163.com` 的网络或上游异常；一次重试后仍失败则阻止发布。
- 媒体 403：签名协议、主机或查询参数被修改。
- 媒体 404 且 Content-Type 为 HTML：Nginx 未安装媒体 location，或者前后端版本不匹配。
- 媒体超时：DNS、CDN 连接或代理缓冲问题。
- 浏览器成功但真实脚本失败：浏览器命中了旧音频缓存，应以冷缓存和真实脚本结果为准。

## 7. 推进阶段

1. **本地修复**：完成流式播放、重试边界、PWA 缓存和 Nginx Range 修复。
2. **自动测试**：单元测试与冷缓存 E2E 全部通过。
3. **服务器准备**：安装低权限验收 Cookie 文件，只进行权限和可读性检查。
4. **候选发布**：激活新版本但不清理上一版本，执行真实验收。
5. **自动决策**：验收成功后 finalize；失败立即 rollback 并保留失败版本供诊断。
6. **观察期**：至少进行一次普通窗口和一次无痕窗口人工播放，确认没有扩展程序或旧 Service Worker 干扰。

## 8. 当前执行状态

- [x] 根因复盘完成。
- [x] 冷缓存流式播放实现完成。
- [x] Cookie 安全转发和原协议代理保持完成。
- [x] 单次重试策略完成。
- [x] Workbox 媒体缓存移除完成。
- [x] 冷缓存 Playwright 验收完成。
- [x] 真实生产验收脚本完成。
- [x] 部署失败自动回滚接入完成。
- [x] 全量单元测试、构建和全部 E2E 完成（205 项单元测试、107 项 E2E）。
- [ ] 服务器验收凭据配置完成。
- [ ] 新版本生产部署与真实播放验收完成。
