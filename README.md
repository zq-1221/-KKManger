# 康康助手

个人健康数据追踪与管理工具。内置 AI 健康顾问，基于 DeepSeek 大模型提供个性化健康分析。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router）+ React 19 |
| 语言 | TypeScript（strict 模式） |
| 样式 | Tailwind CSS v4 |
| 图表 | Recharts 3.x |
| Markdown 渲染 | react-markdown |
| AI 模型 | DeepSeek（deepseek-chat） |
| 数据库 | SQLite（better-sqlite3） |
| 认证 | JWT 会话（jose）+ bcryptjs 密码哈希 |
| ORM | Drizzle ORM（仅 schema 定义） |

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库（创建表结构）
npx tsx db/migrate.ts

# 启动开发服务器（http://localhost:3000）
npm run dev

# 生产构建
npm run build
```

### 环境变量

在项目根目录创建 `.env.local`：

```env
# JWT 签名密钥（必填）
JWT_SECRET=你的随机密钥

# DeepSeek API Key（使用 AI 顾问功能时需要）
DEEPSEEK_API_KEY=sk-your-key-here
```

## 页面路由

| 路径 | 功能 | 说明 |
|------|------|------|
| `/` | 仪表盘 | 最新数据概览 + 多维度趋势图表 |
| `/record` | 录入数据 | 健康数据录入表单 |
| `/history` | 历史记录 | 历史记录列表，支持编辑和删除 |
| `/advice` | AI 顾问 | 基于近 7 天数据的智能分析与建议 |
| `/settings` | 个人中心 | 个人信息、修改密码、AI 服务配置 |
| `/login` | 登录 | 用户登录 |
| `/register` | 注册 | 用户注册 |

未登录用户访问内部页面会被自动重定向到 `/login`。

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
│   ├── page.tsx                  # 仪表盘
│   ├── layout.tsx                # 根布局（AuthProvider + HeaderBar + NavBar）
│   ├── record/page.tsx           # 数据录入
│   ├── history/page.tsx          # 历史记录
│   ├── advice/page.tsx           # AI 健康顾问
│   ├── settings/page.tsx         # 个人中心
│   ├── login/page.tsx            # 登录
│   ├── register/page.tsx         # 注册
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts    # POST 登录
│       │   ├── register/route.ts # POST 注册
│       │   ├── logout/route.ts   # POST 退出
│       │   ├── me/route.ts       # GET 当前用户信息
│       │   ├── profile/route.ts  # PUT 更新用户名
│       │   └── password/route.ts # PUT 修改密码
│       ├── chat/route.ts         # AI 聊天 API（DeepSeek 代理）
│       ├── records/route.ts      # GET 列表 / POST 创建
│       ├── records/[id]/route.ts # PUT 更新 / DELETE 删除
│       └── migrate/route.ts      # POST localStorage → SQLite 迁移
├── components/
│   ├── AuthProvider.tsx          # 认证上下文（useAuth hook）
│   ├── HeaderBar.tsx             # 顶部导航栏
│   ├── NavBar.tsx                # 底部导航栏（5 个标签页）
│   ├── DataCard.tsx              # 指标卡片组件
│   ├── RecordForm.tsx            # 健康数据表单（新建/编辑通用）
│   ├── MarkdownRenderer.tsx      # AI 回复的 Markdown 渲染器
│   └── charts/
│       ├── ChartCard.tsx         # 图表容器（时间范围选择 + 统计摘要）
│       ├── WeightChart.tsx       # 体重趋势折线图
│       ├── StepsChart.tsx        # 步数柱状图
│       ├── SleepChart.tsx        # 睡眠面积图
│       ├── HeartRateChart.tsx    # 心率折线图（含正常范围参考区）
│       └── BloodPressureChart.tsx # 血压双线图（收缩压 + 舒张压）
├── db/
│   ├── schema.ts                 # Drizzle ORM 表结构定义
│   ├── migrate.ts                # 数据库迁移脚本
│   └── index.ts                  # 数据库连接
├── lib/
│   ├── auth/
│   │   ├── session.ts            # JWT 会话创建/验证/删除
│   │   ├── password.ts           # bcryptjs 密码哈希/验证
│   │   └── user-dal.ts           # 用户 CRUD（SQLite）
│   ├── api-client.ts             # 客户端 API 请求封装
│   ├── storage.ts                # 健康数据 localStorage CRUD（旧版兼容）
│   ├── chat-storage.ts           # 聊天记录持久化（按用户划分）
│   ├── advice-storage.ts         # AI 周报存储（按用户划分，最多 5 份）
│   ├── bmi.ts                    # BMI 计算与分类
│   ├── ai.ts                     # AI 上下文构建工具
│   └── trend-utils.ts            # 趋势计算工具
├── types/health.ts               # TypeScript 类型定义
├── proxy.ts                      # 路由保护中间件
└── postcss.config.mjs            # PostCSS + Tailwind v4 配置
```

## AI 健康顾问

- 基于最近 7 天的健康数据提供个性化分析
- 支持三个快捷操作：**生成周报**、**症状分析**、**健康总结**
- AI 回复支持 Markdown 格式渲染
- 周报以结构化 JSON 输出，包含体重/步数/睡眠均值统计、体重趋势、饮食/运动/睡眠建议
- 聊天记录按用户自动保存，不同用户数据隔离
- 所有 AI 建议均为参考性质，不构成医疗诊断

## 认证系统

- 基于 JWT 的会话管理，httpOnly cookie 存储，7 天有效期
- bcryptjs 密码哈希（10 轮）
- 路由保护中间件，未登录自动重定向
- 登录/注册页为公开路由

## 数据存储

- 健康记录存储在服务端 SQLite 数据库中，按用户隔离
- 首次登录时自动迁移 localStorage 中的旧数据
- AI 聊天记录和周报存储在浏览器 localStorage 中，按用户 ID 命名空间隔离
- 退出登录时自动清除当前用户的本地聊天数据
