# AI 健康建议 — 设计文档

**Date**: 2026-05-01
**Status**: Draft

## Context

康康助手目前只能记录和展示健康数据，缺少分析和建议能力。用户希望每累计 7 天新数据后，由 AI 自动分析并给出饮食、运动、作息三方面建议，帮助用户理解数据趋势并采取行动。

## Architecture

- **AI Provider**: DeepSeek（OpenAI 兼容 API）
- **API 调用方式**: Next.js Route Handler 代理（`/api/advice`），API Key 从请求 headers 传入，不暴露在服务端
- **存储**: localStorage，建议最多保留 5 条，滚动删除
- **触发**: 自动检测——Dashboard 加载时检查是否有 7 天新数据，自动触发

## Data Model

```typescript
// types/health.ts 新增

interface AIAdvice {
  id: string;
  startDate: string;          // 分析周期起始 ISO
  endDate: string;            // 分析周期结束 ISO
  createdAt: string;          // 建议生成时间 ISO
  summary: {
    avgWeight: number | null;
    avgSteps: number;
    avgSleep: number;
    avgWater: number;
    weightTrend: 'up' | 'down' | 'stable';
  };
  diet: string;               // 饮食建议
  exercise: string;           // 运动建议
  sleep: string;              // 作息建议
  rawResponse: string;        // DeepSeek 原始返回
}
```

## Files

### New

| File | Purpose |
|------|---------|
| `app/api/advice/route.ts` | Route Handler，调 DeepSeek chat/completions，返回 JSON |
| `app/advice/page.tsx` | 建议详情页，含历史切换 |
| `app/settings/page.tsx` | API Key 设置页 + 连接测试 |
| `lib/ai.ts` | 7 天周期检测 (`shouldGenerateAdvice`) + 生成调度 |
| `lib/advice-storage.ts` | 建议 localStorage CRUD，最多 5 条，超出删最旧 |
| `components/AdviceCard.tsx` | Dashboard AI 建议摘要卡片（含 loading/error/empty 态） |

### Modified

| File | Change |
|------|--------|
| `app/page.tsx` | 引入 AdviceCard，调用检测逻辑 |
| `components/NavBar.tsx` | 新增「建议🤖」tab 和「设置⚙️」入口 |
| `types/health.ts` | 新增 AIAdvice 类型 |

## Pages & States

### Dashboard AI 卡片

| State | Behavior |
|-------|----------|
| 无 API Key | 提示"配置 API Key"，有跳转设置链接 |
| 数据不足 7 天 | 显示"还需 X 天数据生成建议" + 进度 |
| 可生成 | 自动触发（防重复），loading 态骨架屏 |
| 有建议 | 显示三行摘要 + 「查看完整建议 →」链接 |
| 生成失败 | 红色提示 + 重试按钮 |

### 建议详情页 `/advice`

- 空状态（无任何建议）：引导文字
- 有建议：数据摘要 + 三色区（饮食/运动/作息）+ 历史周期下拉切换
- 最新建议展开，历史建议折叠，最多 5 条

### 设置页 `/settings`

- API Key 输入框（type=password，可切换显示）
- 保存到 localStorage key: `deepseek_api_key`
- 「测试连接」按钮，调 `/api/advice/test` 验证
- 首次使用：Dashboard 弹窗引导 + 跳转设置

## 7-Day Detection Logic

```
records[] → 找到最新 AIAdvice.endDate → 过滤之后的 records
→ 按日期去重计数 → >= 7 则触发
```

生成的 API 请求体取这 7 天的记录列表作为 context。

## Prompt Strategy

DeepSeek 返回纯 JSON：

```json
{
  "summary": { "avgSteps": 7200, "avgSleep": 6.8, "avgWater": 1800, "avgWeight": 65.0, "weightTrend": "stable" },
  "diet": "...",
  "exercise": "...",
  "sleep": "..."
}
```

解析后直接映射到 AIAdvice 字段，无需正则。

## Error Handling

| Layer | Error | Handling |
|-------|-------|----------|
| Route Handler | API Key 无效 | 401 → 前端提示重新配置 |
| Route Handler | DeepSeek 超时/不可用 | 502 → 前端重试按钮 |
| Route Handler | JSON 解析失败 | 500，保留 rawResponse 降级展示 |
| Frontend | 网络错误 | Toast 提示 + 重试 |
| Frontend | 并发生成 | 防重标志位，已在进行中不再触发 |

## Navigation

底部 Tab 更新为 4 个：`首页` `录入` `历史` `建议`，设置放在首页 header 或建议页的齿轮图标入口。

新建议未读时在「建议」tab 上显示红点，进入页面后消除。
