<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MosDNS UI

一个现代化的 MosDNS DNS 服务器管理面板，集成了 AI 智能分析功能。

[查看 AI Studio 应用](https://ai.studio/apps/drive/1B-59c3s75TN-o581SzWMnIjfQIU7vwNs)

## ✨ 功能特性

- 📊 **实时仪表盘** - 监控 DNS 查询统计、缓存命中率、响应延迟等关键指标
- 🌐 **上游服务器管理** - 查看和管理 DNS 上游服务器状态
- 📝 **日志查看** - 实时查看 DNS 请求日志和查询记录
- ⚙️ **配置编辑** - 可视化编辑 MosDNS YAML 配置文件
- 🤖 **AI 智能助手** - 基于 Gemini AI 的配置分析、规则解释和问题诊断
- 🎨 **现代化界面** - 基于 React + TailwindCSS 的美观用户界面

## 🚀 快速开始

### 前置要求

- Node.js (推荐 v18+)
- npm 或 yarn
- MosDNS 服务器 (可选，用于连接真实 API)

### 本地运行

1. **安装依赖**
   ```bash
   npm install
   ```

2. **配置环境变量**
   
   创建 `.env.local` 文件并设置你的 Gemini API 密钥：
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   
   打开浏览器访问 `http://localhost:5173`

### 生产构建

```bash
npm run build
npm run preview
```

## 🔧 配置说明

### 连接 MosDNS 服务器

在应用界面的设置中，可以配置 MosDNS API 地址：

- **API 地址**: 默认为 `http://localhost:5335`
- **实例名称**: 自定义你的 MosDNS 实例名称

### API 端点

应用期望 MosDNS 提供以下 API 端点：

| 端点 | 描述 |
|------|------|
| `/api/v1/stats` | 获取统计信息 |
| `/api/v1/history` | 获取查询历史 |
| `/api/v1/top_domains` | 获取热门域名 |
| `/api/v1/upstreams` | 获取上游服务器列表 |
| `/api/v1/logs` | 获取日志数据 |
| `/api/v1/config` | 获取/保存配置文件 |
| `/health` | 健康检查 |

> 💡 **注意**: 如果无法连接到 MosDNS API，应用会自动使用模拟数据进行演示。

## 🤖 AI 功能

需要 Gemini API 密钥才能使用 AI 相关功能：

1. 获取 [Gemini API 密钥](https://makersuite.google.com/app/apikey)
2. 在 `.env.local` 文件中配置 `GEMINI_API_KEY`
3. 重启开发服务器

### AI 功能包括：

- **配置分析**: 自动分析 YAML 配置并提供优化建议
- **规则解释**: 用简单语言解释复杂的 MosDNS 规则
- **智能问答**: 基于当前系统状态回答技术问题

## 📁 项目结构

```
├── App.tsx              # 主应用组件
├── index.tsx            # 应用入口
├── index.html           # HTML 模板
├── types.ts             # TypeScript 类型定义
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
├── package.json         # 项目依赖
├── services/
│   ├── api.ts           # API 调用服务
│   └── geminiService.ts # Gemini AI 服务
└── public/              # 静态资源
```

## 🛠️ 技术栈

- **前端框架**: React 18
- **开发工具**: Vite, TypeScript
- **UI 库**: TailwindCSS, Lucide React 图标
- **图表**: Recharts
- **AI 集成**: @google/genai

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<div align="center">
  <sub>使用 ❤️ 构建 by AI Studio</sub>
</div>
