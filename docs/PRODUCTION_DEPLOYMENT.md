# NekoMusicPlayer 生产部署与回滚

## 1. 架构约定

- 静态站点：`/var/www/nekomusic/current`。
- 版本目录：`/var/www/nekomusic/releases/<UTC 发布时间>`，目录内 `COMMIT` 记录精确 Git 提交。
- 通用 Nginx 样例：`ops/nginx/nekomusic.conf.example`；当前生产配置：`ops/nginx/music.72dot.cn.conf`。
- 浏览器仅访问同源 `/api/*`，Nginx 再代理到固定上游。
- 网易签名音频通过 `/api/netease-media/<http|https>/<host>/...` 保留原协议转发，仅允许 `*.music.126.net` 子域，避免混合内容、CORS 和签名失效。
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

## 3. 服务器端发布仓库

GitHub Actions 不再拥有服务器凭据，也不执行生产部署。`.github/workflows/ci.yml` 只在 Pull Request、`main` 推送或人工触发时运行质量检查。

在服务器上准备一个仅用于构建的仓库副本，例如 `/opt/nekomusic-src`，并确保部署用户：

- 能从 `origin` 读取代码，但不需要仓库写权限。
- 已安装 Git、Node.js 20、npm、curl 和 tar。
- 能写入 `/var/www/nekomusic/releases`、`current` 与 `deploy-state`。
- 应保持部署仓库干净，以便通过 fast-forward 更新部署脚本；应用构建本身通过 `git archive` 从远端提交创建隔离目录。

首次准备示例：

```bash
sudo git clone <repository-url> /opt/nekomusic-src
sudo chown -R ubuntu:ubuntu /opt/nekomusic-src /var/www/nekomusic
cd /opt/nekomusic-src
```

私有仓库应配置只读 Deploy Key；不要在脚本、Shell 历史或仓库文件中保存访问令牌。

## 4. 手动部署行为

在服务器仓库内显式执行：

```bash
cd /opt/nekomusic-src
git switch main
git pull --ff-only origin main
bash ops/deploy/deploy-from-server.sh main
```

脚本按以下顺序执行：

1. 从 `origin` 获取指定分支并解析远端精确提交，不直接修改服务器仓库工作树。
2. 在 `mktemp` 隔离目录中导出该提交，执行 `npm ci`、类型检查、全部单元测试、生产构建和生产资产结构校验。
3. 将已验证的 `dist` 复制到新的时间戳版本目录，并记录 `COMMIT`。
4. `manage-release.sh activate` 原子切换 `current`，并保存上一版本位置。
5. 要求 `https://music.72dot.cn/healthz` 返回 HTTP 200 且正文精确为 `ok`，随后检查站点首页。
6. 检查失败时自动 `rollback`；成功时 `finalize`，只保留最近五个版本。

默认发布 `main`，也可以传入其他明确分支。`PUBLIC_URL` 和 `DEPLOY_ROOT` 可通过环境变量覆盖；生产环境通常保持默认值。

## 5. 人工烟雾检查

部署脚本成功后验证：

- 首页、路由刷新、静态资源和 PWA 更新。
- 本地文件导入、播放、切歌和刷新恢复。
- 网易云与 Bilibili 各执行一次脱敏测试导入；浏览器网络面板中不应出现跨域失败。
- 设置保存、缓存统计与清理。
- 浏览器日志和服务器日志中不存在 Cookie、Token 或完整签名参数。

## 6. 手动回滚

如果需要回退已经成功发布的版本，先读取各版本的 `COMMIT`，选择上一个已验证目录并原子切换：

```bash
ln -sfn /var/www/nekomusic/releases/<previous-release-id> /var/www/nekomusic/current
sudo nginx -t
sudo systemctl reload nginx
curl --fail https://your-domain.example/healthz
```

不要删除失败版本，直到诊断完成且确认其中不含敏感信息。
