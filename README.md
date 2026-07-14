# NekoMusicPlayer

一个基于 Vue 3 + TypeScript + Pinia 的现代化 Web 音乐播放器。

## 🌟 特性

- **现代化架构**：采用 Vue 3 Composition API 和 TypeScript 构建。
- **解耦设计**：核心播放引擎 (`PlayerEngine`) 与状态管理 (`Pinia`) 分离，通过事件桥接。
- **插件化数据源**：支持通过适配器模式轻松扩展新的音频来源（如本地文件、外部链接、流媒体服务）。
- **持久化存储**：利用 IndexedDB 存储歌单，LocalStorage 存储偏好设置。
- **可测试性**：集成了 Vitest 进行单元测试。

## 🛠️ 技术栈

- **框架**: [Vue 3](https://vuejs.org/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **状态管理**: [Pinia](https://pinia.vuejs.org/) + `pinia-plugin-persistedstate`
- **路由**: [Vue Router](https://router.vuejs.org/)
- **测试**: [Vitest](https://vitest.dev/)
- **数据库**: Native IndexedDB (via wrapper)

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 运行测试

```bash
npm test
```

## 📂 项目结构

```
src/
├── adapters/              # 数据源适配器 (Source Adapters)
│   ├── externalLinkAdapter.ts
│   ├── fileSystemAdapter.ts
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
│   └── PlaylistsPage.vue
├── services/              # 基础设施服务
│   ├── db.ts              # IndexedDB 封装
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

位于 `src/adapters/`。要添加新的音乐来源（例如网易云音乐解析），只需：
1. 实现 `SourceAdapter` 接口。
2. 在 `src/adapters/register.ts` 中注册适配器。

## 📝 更新日志

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
