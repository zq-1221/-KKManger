import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserById } from '@/lib/auth/user-dal';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const user = getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 401 });
  }

  return NextResponse.json(user);
}
