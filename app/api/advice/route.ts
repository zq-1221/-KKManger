import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_BASE = 'https://api.deepseek.com';

const SYSTEM_PROMPT = `你是一位专业的健康顾问。请分析以下最近7天的健康数据，给出饮食、运动、作息三方面的建议。

要求：
1. 返回纯 JSON，不要包含 markdown 代码块标记
2. summary 字段：根据数据计算平均值和体重趋势
3. diet/exercise/sleep 字段：各 2-4 句建议，用中文，语气温和鼓励
4. 如果某项数据缺失则对应的建议可以简短或注明"数据不足"

返回 JSON 格式：
{
  "summary": {
    "avgWeight": number|null, "avgSteps": number, "avgSleep": number,
    "avgWater": number, "weightTrend": "up"|"down"|"stable"
  },
  "diet": "string",
  "exercise": "string",
  "sleep": "string"
}`;

function getApiKey(request: NextRequest): string | null {
  return process.env.DEEPSEEK_API_KEY || request.headers.get('x-api-key') || null;
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not configured' }, { status: 401 });
  }

  let records: Record<string, unknown>[];
  try {
    const body = await request.json();
    records = body.records as Record<string, unknown>[];
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const dataSummary = records.map((r) => ({
    date: r.date,
    weight: r.weight,
    steps: r.steps,
    sleepHours: r.sleepHours,
    waterIntake: r.waterIntake,
    systolic: r.systolic,
    diastolic: r.diastolic,
    heartRate: r.heartRate,
  }));

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(dataSummary) },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401) {
        return NextResponse.json(
          { error: 'API Key 无效，请检查设置' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `DeepSeek error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonStr = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({ advice: parsed });
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
    return NextResponse.json(
      { status: 'error', code: res.status },
      { status: res.status }
    );
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Network error' },
      { status: 500 }
    );
  }
}
