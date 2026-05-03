# AI 健康聊天机器人设计说明

**日期**: 2026-05-03
**状态**: 已确认

## 概述

在康康助手现有项目中新增 AI 健康顾问聊天机器人，用户通过自然对话描述症状和健康问题，AI 结合用户健康数据给出个性化分析、可能病症推断、解决方案和生活建议。同时整合现有的 AI 周报生成功能。

## 技术方案

**方案**: 自由对话 + 健康数据注入

每次发送消息时，前端从 localStorage 读取用户近期健康数据摘要，连同最近 N 轮对话历史一起发送给 `/api/chat`。API 路由将健康数据拼入 system prompt，转发给 DeepSeek，返回 AI 回复。

与现有 `/api/advice` 的区别：现有接口是"提交数据 → 返回结构化周报"，新接口是"提交消息历史＋健康上下文 → 返回对话回复"。

## 数据模型

### 新增类型 (`types/health.ts`)

```ts
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;       // ISO
  isWeeklyReport?: boolean; // 周报消息标记，用于特殊卡片渲染
}

interface ChatSession {
  id: string;
  title: string;           // 首条用户消息的前30字
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
```

### localStorage

- `chat_sessions`: `ChatSession[]`，上限 10 个会话，每会话上限 50 条消息
- `ai_advices`: 保留现有 key，周报数据继续使用 `AIAdvice` 类型存储

## API 设计

### `POST /api/chat`（新建）

```
Request:
{
  messages: ChatMessage[],    // 最近 20 条历史
  healthContext: {
    latestWeight?: number,
    latestBMI?: number,
    recentBP?: { systolic: number, diastolic: number }[],
    avgSleep?: number,
    avgSteps?: number,
    avgWater?: number,
    hasData: boolean           // 是否有任何健康数据
  }
}

Response:
{
  reply: {
    id: string,
    role: 'assistant',
    content: string,
    createdAt: string
  }
}
```

### System Prompt

角色设定为专业健康顾问，要求：
- 结合用户提供的健康数据给出个性化建议
- 推断可能病症时列出多种可能，不做确定性诊断
- 建议分层次：生活习惯调整 → 饮食建议 → 何时应就医
- 检测到紧急症状关键词（胸痛、呼吸困难、严重出血等）时优先建议立即就医
- 中文回复，语气温和专业
- 如果数据不足，坦诚告知并给出通用建议

### 现有 `/api/advice` 路由 → 删除，周报生成逻辑合并到 `/api/chat`

周报生成方式：用户点击"生成周报"快捷按钮，前端发送系统指令消息，API 识别后返回结构化周报。

## 文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `types/health.ts` | 修改 | 新增 `ChatMessage`、`ChatSession`；保留 `AIAdvice` |
| `app/api/chat/route.ts` | **新建** | 聊天 API，处理对话 + 周报生成 |
| `app/api/advice/route.ts` | **删除** | 功能合并到 `/api/chat` |
| `app/advice/page.tsx` | **重写** | 聊天界面，替换现有建议页 |
| `components/AdviceCard.tsx` | **删除** | 首页不再需要独立 advice card |
| `components/NavBar.tsx` | 修改 | label "建议" → "AI 顾问"；路径保持 `/advice` |
| `app/page.tsx` | 修改 | 移除 AdviceCard 相关状态和渲染 |
| `lib/chat-storage.ts` | **新建** | 聊天记录 CRUD |
| `lib/advice-storage.ts` | **保留** | 周报数据仍用此存储 |
| `lib/ai.ts` | 修改 | 移除 `shouldGenerateAdvice`（不再自动检测7天生成），保留 `getRecent7DaysRecords`、`generateId` |

## UI 设计

### 页面布局（自上而下）

1. **页面标题区**：「AI 健康顾问」+ 副标题 + DeepSeek 标签
2. **免责提示**：浅暖黄圆角卡片，带 ℹ️ 图标，文字"AI 顾问提供的内容仅供参考..."
3. **快捷操作**：三个 pill 按钮 — 📊 生成周报（主色）、💊 分析症状、📋 健康摘要
4. **聊天消息区**：可滚动，消息气泡 + 时间戳
5. **底部输入区**：fixed 定位，圆角输入框 + 发送按钮

### 消息类型

- **用户消息**：右对齐，emerald 渐变背景，白色文字，右下角小尖角
- **AI 普通回复**：左对齐，白底灰边框，圆角气泡
- **周报消息**：独立卡片 — 绿底头部 + 4 列数据统计 + 饮食/运动/作息三段建议
- **AI 回复中**：三个跳动圆点（typing indicator）

### 空态

首次进入显示：浮动动画 AI 头像 + 欢迎语 + 3 条输入建议示例

### 交互

- 点击快捷 pill 自动填充预设指令
- 回车或点击发送按钮发送消息
- 发送后显示 typing indicator，收到回复后追加消息

### 配色

延续项目 emerald 绿色系 + 暖奶油色背景 + 柔和灰，非临床温暖感。
参考 mockup: `mockups/chat-mockup.html`

## 注意事项

- 聊天记录和健康数据均存储在 localStorage，清除浏览器数据会丢失
- DeepSeek API Key 存储在服务端环境变量 `DEEPSEEK_API_KEY`
- 医疗免责声明常驻展示，不可关闭
- 不需增加新的 npm 依赖
