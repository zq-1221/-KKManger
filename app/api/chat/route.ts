import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_BASE = 'https://api.deepseek.com';

const SYSTEM_PROMPT = `你是一位专业、温和的健康顾问，名字叫"康康"。你的职责是：

1. 结合用户提供的健康数据（如有），给出个性化分析和建议
2. 根据用户描述的症状，推断可能相关的健康问题，列出多种可能，但绝不做确定性诊断
3. 建议分层次给出：生活习惯调整 → 饮食营养建议 → 何时应就医
4. 检测到紧急症状（胸痛、呼吸困难、严重出血、突然剧烈头痛、意识模糊等）时，首先明确建议立即就医或拨打120
5. 如果用户请求生成周报，返回一份完整的健康周报

约束：
- 中文回复，语气温暖、专业、不制造焦虑
- 始终提醒用户"本建议仅供参考，不能替代专业医疗诊断"
- 如果用户健康数据不足，坦诚告知并给出通用建议
- 回复简洁有条理，避免过长段落

如果你判断用户在请求生成周报，请按以下 JSON 格式返回（不要包含markdown标记）：
{
  "weeklyReport": true,
  "summary": {
    "avgWeight": number|null, "avgSteps": number, "avgSleep": number,
    "avgWater": number, "weightTrend": "up"|"down"|"stable"
  },
  "diet": "饮食建议 2-4 句",
  "exercise": "运动建议 2-4 句",
  "sleep": "作息建议 2-4 句"
}`;

function getApiKey(request: NextRequest): string | null {
  return process.env.DEEPSEEK_API_KEY || request.headers.get('x-api-key') || null;
}

function buildHealthContextText(ctx: Record<string, unknown>): string {
  const hasData = ctx.hasData;
  if (!hasData) {
    return '用户暂无健康数据记录，请给出通用建议，并建议用户定期录入健康指标以获得更精准的分析。';
  }
  const parts: string[] = ['以下是用户最近的健康数据摘要：'];
  if (ctx.latestWeight != null) parts.push(`- 最近体重：${ctx.latestWeight} kg`);
  if (ctx.latestBMI != null) parts.push(`- 最近 BMI：${ctx.latestBMI}`);
  if (ctx.recentBP) {
    const bp = ctx.recentBP as { systolic: number; diastolic: number }[];
    if (bp.length > 0) {
      const latest = bp[bp.length - 1];
      parts.push(`- 最近血压：收缩压 ${latest.systolic} / 舒张压 ${latest.diastolic} mmHg`);
    }
  }
  if (ctx.avgSleep != null) parts.push(`- 近期平均睡眠：${ctx.avgSleep} 小时`);
  if (ctx.avgSteps != null) parts.push(`- 近期日均步数：${ctx.avgSteps} 步`);
  if (ctx.avgWater != null) parts.push(`- 近期平均饮水：${ctx.avgWater} ml`);
  parts.push('\n请在回答中引用相关数据，使建议更个性化。');
  return parts.join('\n');
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not configured' }, { status: 401 });
  }

  let messages: { role: string; content: string }[];
  let healthContext: Record<string, unknown>;
  try {
    const body = await request.json();
    messages = body.messages as { role: string; content: string }[];
    healthContext = (body.healthContext as Record<string, unknown>) || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const healthText = buildHealthContextText(healthContext);
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: healthText },
    ...messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ error: 'API Key 无效，请检查设置' }, { status: 401 });
      }
      return NextResponse.json({ error: `DeepSeek error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    // Check if AI returned a weekly report JSON
    let weeklyReport = null;
    const jsonMatch = content.match(/\{[\s\S]*"weeklyReport"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        weeklyReport = JSON.parse(jsonMatch[0]);
      } catch { /* not JSON, treat as regular reply */ }
    }

    return NextResponse.json({
      reply: {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
      },
      weeklyReport: weeklyReport?.weeklyReport ? weeklyReport : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Request failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not configured' }, { status: 401 });
  }
  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      return NextResponse.json({ status: 'ok' });
    }
    return NextResponse.json({ status: 'error', code: res.status }, { status: res.status });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Network error' }, { status: 500 });
  }
}
