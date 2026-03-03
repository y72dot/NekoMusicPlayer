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
├── adapters/          # 数据源适配器 (Source Adapters)
│   ├── registry.ts    # 适配器注册表
│   └── types.ts       # 适配器接口定义
├── components/        # UI 组件
├── core/              # 核心业务逻辑
│   └── playerEngine.ts # 播放器引擎 (EventEmitter)
├── models/            # TypeScript 类型定义
├── services/          # 基础设施服务
│   ├── db.ts          # IndexedDB 封装
│   ├── logger.ts      # 日志服务
│   └── playerBridge.ts # 连接 Engine 和 Store 的桥接层
├── store/             # Pinia 状态管理
│   ├── player.ts      # 播放状态与控制
│   └── playlists.ts   # 歌单管理
└── pages/             # 路由页面
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

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📝 License

MIT
