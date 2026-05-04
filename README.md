# 康康助手

个人健康数据追踪与管理工具，纯客户端应用，无需后端数据库。内置 AI 健康顾问，基于 DeepSeek 大模型提供个性化健康分析。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router）+ React 19 |
| 语言 | TypeScript（strict 模式） |
| 样式 | Tailwind CSS v4 |
| 图表 | Recharts 3.x |
| Markdown 渲染 | react-markdown |
| AI 模型 | DeepSeek（deepseek-chat） |
| 数据持久化 | localStorage |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:3000）
npm run dev

# 生产构建
npm run build
```

如需使用 AI 顾问功能，需在项目根目录创建 `.env.local` 文件并配置 DeepSeek API Key：

```
DEEPSEEK_API_KEY=你的API密钥
```

也可以在设置页面通过请求头 `x-api-key` 传入密钥。

## 页面路由

| 路径 | 功能 |
|------|------|
| `/` | 仪表盘 — 最新数据概览 + 多维度趋势图表 |
| `/record` | 录入健康数据 |
| `/history` | 历史记录列表，支持编辑和删除 |
| `/advice` | AI 健康顾问 — 基于近 7 天数据的智能分析与建议 |
| `/settings` | 设置 — 测试 API Key 连接状态 |

## 健康数据模型

每次记录包含以下字段（全部可选）：

- **体重** (kg) / **身高** (cm) — BMI 自动计算，以中国标准分类（偏瘦/正常/偏胖/肥胖）
- **血压** — 收缩压 / 舒张压 (mmHg)
- **心率** (bpm)
- **步数**
- **睡眠** (小时)
- **饮水量** (ml)

## 项目结构

```
├── app/
│   ├── page.tsx              # 仪表盘
│   ├── layout.tsx            # 根布局（标题 + 底部导航）
│   ├── globals.css           # 全局样式 + Tailwind
│   ├── record/page.tsx       # 数据录入
│   ├── history/page.tsx      # 历史记录
│   ├── advice/page.tsx       # AI 健康顾问
│   ├── settings/page.tsx     # API Key 设置
│   └── api/chat/route.ts     # AI 聊天 API（DeepSeek 代理）
├── components/
│   ├── NavBar.tsx            # 底部导航栏（4 个标签页）
│   ├── DataCard.tsx          # 指标卡片组件
│   ├── RecordForm.tsx        # 健康数据表单（新建/编辑通用）
│   ├── MarkdownRenderer.tsx  # AI 回复的 Markdown 渲染器
│   └── charts/
│       ├── ChartCard.tsx     # 图表容器（时间范围选择 + 统计摘要）
│       ├── WeightChart.tsx   # 体重趋势折线图
│       ├── StepsChart.tsx    # 步数柱状图
│       ├── SleepChart.tsx    # 睡眠面积图
│       ├── HeartRateChart.tsx # 心率折线图（含正常范围参考区）
│       └── BloodPressureChart.tsx # 血压双线图（收缩压 + 舒张压）
├── types/health.ts           # TypeScript 类型定义
├── lib/
│   ├── storage.ts            # 健康数据 CRUD（localStorage）
│   ├── chat-storage.ts       # 聊天记录持久化
│   ├── advice-storage.ts     # AI 周报存储（最多 5 份）
│   ├── bmi.ts                # BMI 计算与分类
│   ├── ai.ts                 # AI 上下文构建工具
│   └── trend-utils.ts        # 趋势计算工具
└── postcss.config.mjs        # PostCSS + Tailwind v4 配置
```

## AI 健康顾问

- 基于最近 7 天的健康数据提供个性化分析
- 支持三个快捷操作：**生成周报**、**症状分析**、**健康总结**
- AI 回复支持 Markdown 格式渲染
- 周报以结构化 JSON 输出，包含体重/步数/睡眠均值统计、体重趋势、饮食/运动/睡眠建议
- 聊天记录自动保存，刷新页面后恢复
- 所有 AI 建议均为参考性质，不构成医疗诊断

## 其他说明

- 所有数据存储在浏览器 localStorage 中，清除浏览器数据会导致记录丢失
- 建议定期导出重要数据
- 本项目为个人使用工具，暂无多用户、云同步等功能
