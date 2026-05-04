import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { createUser, getUserByEmail } from '@/lib/auth/user-dal';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少需要 6 位' }, { status: 400 });
    }

    if (name.length < 2) {
      return NextResponse.json({ error: '昵称至少需要 2 个字符' }, { status: 400 });
    }

    const existing = getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = createUser(email, passwordHash, name);

    await createSession(user.id);

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error('Register error:', e);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
