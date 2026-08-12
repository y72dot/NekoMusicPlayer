# NekoMusicPlayer

一个基于 Vue 3 + TypeScript + Pinia 的现代化 Web 音乐播放器。

## 🌟 特性

- **现代化架构**：采用 Vue 3 Composition API 和 TypeScript 构建。
- **解耦设计**：核心播放引擎 (`PlayerEngine`) 与状态管理 (`Pinia`) 分离，通过事件桥接。
- **插件化数据源**：支持通过适配器模式轻松扩展新的音频来源（如本地文件、外部链接、流媒体服务）。
- **多来源导入**：支持本地文件、外部 URL、网易云音乐和 Bilibili。
- **持久化存储**：利用 IndexedDB 存储歌单，LocalStorage 存储偏好设置。
- **缓存与恢复**：缓存远端音频，刷新页面后可恢复本地文件队列和播放来源。
- **PWA 与国际化**：支持 PWA 安装以及中文、英文界面。
- **可测试性**：集成 Vitest 单元测试和 Playwright 端到端测试。

## 🛠️ 技术栈

- **框架**: [Vue 3](https://vuejs.org/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/) + `pinia-plugin-persistedstate`
- **路由**: [Vue Router](https://router.vuejs.org/)
- **测试**: [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/)
- **数据库**: Native IndexedDB (via wrapper)

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- npm 或 pnpm

### 安装依赖

```bash
npm ci
```

### 启动开发服务器

```bash
npm run dev
```

### 运行测试

```bash
# 单元测试（运行一次）
npm test

# 单元测试监听模式
npm run test:watch

# 端到端测试
npx playwright install chromium
npm run test:e2e

# 提交前检查：类型、单元测试、生产构建
npm run check

# 完整回归
npm run test:all
```

## 📂 项目结构

```
src/
├── adapters/              # 数据源适配器 (Source Adapters)
│   ├── externalLinkAdapter.ts
│   ├── fileSystemAdapter.ts
│   ├── neteaseAdapter.ts
│   ├── bilibiliAdapter.ts
│   ├── register.ts        # 适配器注册
│   ├── registry.ts        # 适配器注册表
│   └── types.ts           # 适配器接口定义
├── components/            # UI 组件
│   ├── ActionMenu.vue     # 歌曲操作菜单
│   ├── BatchActionBar.vue # 批量操作栏
│   ├── ControlBar.vue     # 播放控制栏
│   ├── CoverImage.vue     # 封面图（含占位符）
│   ├── ImportPanel.vue    # 导入面板
│   ├── SearchBar.vue      # 搜索框
│   ├── SidebarPlaylists.vue # 侧边栏歌单导航
│   ├── ToastContainer.vue # Toast 通知容器
│   ├── TrackDetailModal.vue # 曲目详细信息
│   ├── TrackCard.vue      # 歌曲卡片
│   └── TrackList.vue      # 歌曲列表
├── composables/           # Vue Composables
│   ├── useCoverUrl.ts     # 封面 URI 解析
│   ├── useKeyboardShortcuts.ts # 全局键盘快捷键
│   └── useTrackFilter.ts  # 歌曲搜索过滤
├── core/                  # 核心业务逻辑
│   ├── __tests__/
│   │   └── playerEngine.spec.ts
│   ├── playerEngine.ts    # 播放器引擎 (EventEmitter)
│   └── uriResolver.ts     # neko:// URI 解析
├── models/                # TypeScript 类型定义
│   ├── playlist.ts
│   ├── settings.ts
│   └── track.ts
├── pages/                 # 路由页面
│   ├── ImportPage.vue
│   ├── LibraryPage.vue
│   ├── PlayerPage.vue
│   ├── PlaylistsPage.vue
│   └── SettingsPage.vue
├── services/              # 基础设施服务
│   ├── db.ts              # IndexedDB 封装
│   ├── audioCache.ts      # 音频缓存、TTL 与 LRU
│   ├── neteaseClient.ts   # 网易云接口客户端
│   ├── bilibiliClient.ts  # Bilibili 接口客户端
│   ├── logger.ts          # 日志服务
│   └── playerBridge.ts    # 连接 Engine 和 Store 的桥接层
├── store/                 # Pinia 状态管理
│   ├── player.ts          # 播放状态与控制
│   ├── playlists.ts       # 歌单管理
│   ├── selection.ts       # 多选状态
│   ├── settings.ts        # 用户设置
│   └── toast.ts           # Toast 通知
├── App.vue
├── main.ts
└── router.ts
```

## 🧩 核心架构说明

### 播放引擎 (PlayerEngine)

位于 `src/core/playerEngine.ts`。这是一个不依赖 Vue/Pinia 的纯 TypeScript 类，继承自 `EventEmitter`。它负责：
- 管理 `HTMLAudioElement` 生命周期
- 处理播放、暂停、音量、进度等底层逻辑
- 发射 `timeupdate`, `ended`, `error` 等事件

### 状态管理与桥接

- **PlayerStore** (`src/store/player.ts`): 管理播放队列、播放模式、UI 状态。
- **PlayerBridge** (`src/services/playerBridge.ts`): 监听 `PlayerEngine` 事件并同步到 `PlayerStore`。

### 数据源适配器

位于 `src/adapters/`。当前注册了本地文件、外部 URL、网易云音乐和 Bilibili。要添加新的音乐来源，只需：
1. 实现 `SourceAdapter` 接口。
2. 在 `src/adapters/register.ts` 中注册适配器。

## 🔐 流媒体 Cookie 配置

网易云和 Bilibili 的部分资源需要登录 Cookie。可在“设置”页或导入面板中配置：

- 网易云：`MUSIC_U`，可选 `__csrf`。
- Bilibili：`SESSDATA`，可选 `bili_jct` 和 `buvid3`。

Cookie 会保存在当前浏览器的 LocalStorage 中。请只在可信设备和可信部署域名上使用，不要将 Cookie 写入源码、Issue、构建日志或测试报告。Cookie 过期后需要重新获取。

## 💾 存储与缓存

- 音乐库、歌单和本地文件 Blob 存于 IndexedDB。
- 播放队列和设置存于 LocalStorage。
- 远端音频缓存默认限制为 100 项或约 500 MB；非本地来源条目具有 7 天 TTL。
- 可在设置页查看缓存统计并清理音频缓存。
- 清理浏览器站点数据会删除本地音乐库、歌单、Cookie 设置和缓存，重要歌单请先导出 JSON。

## 🧯 常见问题

### 音频无法播放

- 确认浏览器允许用户交互后播放音频。
- 检查资源是否受版权、地区或登录状态限制。
- 尝试重新导入资源或在设置页清理音频缓存。

### 网易云或 Bilibili 导入失败

- 确认 Cookie 已配置且未过期。
- 检查开发服务器代理或生产反向代理是否允许对应 API/CDN 请求。
- 外部平台接口可能变化；保留错误信息并在 Issue 中说明输入类型，但不要附带 Cookie。

### 刷新后本地歌曲无法恢复

- 确认没有使用隐私模式或自动清理站点数据。
- 检查浏览器是否禁止 IndexedDB，或存储配额是否耗尽。
- 删除失效曲目后重新导入本地文件。

### PWA 未更新到最新版本

- 完全关闭并重新打开应用。
- 在浏览器站点设置中清理 Service Worker/缓存后重新加载。
- 清理全部站点数据前先导出重要歌单。

## 📝 更新日志

完整版本记录见 [CHANGELOG.md](./CHANGELOG.md)。

### v0.3.0

- 网易云和 Bilibili 数据源。
- 音频缓存、设置页和曲目详情。
- PWA 与中英文国际化。
- 175 项单元测试和 104 项端到端测试。
- 类型、测试、构建及部署质量门禁。

### v0.2.0

- **路径别名**: 配置 `@/` 路径别名，统一导入风格
- **Toast 通知系统**: 替换所有 `alert()` 调用，支持 success/error/warning/info 四种类型
- **搜索过滤**: 支持按标题、艺术家、专辑实时搜索过滤音乐库和歌单
- **键盘快捷键**: 全局快捷键支持（Space 播放/暂停、方向键控制、Escape 退出多选等）
- **Smart Play 完善**: 空队列时自动加载音乐库，库为空时提示用户导入
- **ID3 元数据解析**: 导入本地文件时自动提取标题/艺术家/专辑/封面图
- **封面图展示**: 歌曲列表展示封面图，无封面时显示占位符
- **多选模式优化**: Escape 键和空白区域点击退出多选模式
- **音量双向同步**: Engine volumechange 事件与 Store 双向同步
- **设计清理**: 移除调试注释，确认队列语义

### v0.1.0

- 核心播放功能（播放/暂停/上下曲/进度/音量）
- 播放模式（单曲循环/列表循环/随机）
- 歌单管理（创建/重命名/删除/添加歌曲）
- 本地文件导入和外部链接播放
- 拖拽排序和批量操作
- IndexedDB + LocalStorage 持久化存储

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📝 License

MIT
