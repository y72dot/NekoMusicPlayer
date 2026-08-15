# NekoMusicPlayer 生产部署与回滚

## 1. 架构约定

- 静态站点：`/var/www/nekomusic/current`。
- 版本目录：`/var/www/nekomusic/releases/<GitHub run id>`。
- 通用 Nginx 样例：`ops/nginx/nekomusic.conf.example`；当前生产配置：`ops/nginx/music.72dot.cn.conf`。
- 浏览器仅访问同源 `/api/*`，Nginx 再代理到固定上游。
- 网易云和 Bilibili 凭据通过 `X-Neko-Upstream-Cookie` 到达同源 Nginx，再转换为上游 `Cookie`；该请求头不得进入访问日志。
- Bilibili CDN 只允许 `*.bilivideo.com` 和 `*.hdslb.com` 的 HTTPS 子域名。

## 2. 首次服务器配置

1. `music.72dot.cn` 直接安装 `ops/nginx/music.72dot.cn.conf`；其他域名复制通用样例并替换域名、TLS 与证书路径。
2. 如服务器不能使用样例中的公共 DNS resolver，将其替换为可信的系统/内网 DNS。
3. 确认部署用户可以写入 `/var/www/nekomusic`，但不授予无关系统目录权限。
4. 执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl --fail http://127.0.0.1/healthz
```

5. 为公网域名 `https://music.72dot.cn` 配置 HTTPS。

## 3. GitHub 配置

在 `production` Environment 中配置：

- `SSH_HOST`
- `SSH_USER`
- `SSH_PASSWORD`（后续建议迁移为受限 SSH Key）
当前部署不要求额外配置 `SSH_KNOWN_HOSTS` 或 `PUBLIC_URL`：域名固定为 `https://music.72dot.cn`，服务器 Ed25519 主机公钥已从服务器控制台取得并固定在工作流中。服务器重装或主机密钥轮换时，需要通过可信控制台更新仓库中的公钥。

同时：

- 为 `production` 增加审批人，仅允许 `main` 部署。
- 将质量检查和 E2E 设置为 `main` 必需检查。
- 确认 Nginx access log 格式没有记录请求头。

## 4. 自动部署行为

1. CI 安装依赖、类型检查、运行单测/E2E并构建。
2. 已验证的 `dist` 上传到新的版本目录。
3. `manage-release.sh activate` 原子切换 `current`，并保存上一版本位置。
4. GitHub Runner 要求 `https://music.72dot.cn/healthz` 返回 HTTP 200 且正文精确为 `ok`，随后检查站点首页。
5. 检查失败时执行 `rollback`；成功时执行 `finalize` 并只保留最近五个版本。

## 5. 人工烟雾检查

自动检查成功后验证：

- 首页、路由刷新、静态资源和 PWA 更新。
- 本地文件导入、播放、切歌和刷新恢复。
- 网易云与 Bilibili 各执行一次脱敏测试导入；浏览器网络面板中不应出现跨域失败。
- 设置保存、缓存统计与清理。
- 日志和 Actions 附件中不存在 Cookie、Token 或完整签名参数。

## 6. 人工回滚

如自动回滚未执行，选择上一个已验证目录并原子切换：

```bash
ln -sfn /var/www/nekomusic/releases/<previous-run-id> /var/www/nekomusic/current
sudo nginx -t
sudo systemctl reload nginx
curl --fail https://your-domain.example/healthz
```

不要删除失败版本，直到诊断完成且确认其中不含敏感信息。
