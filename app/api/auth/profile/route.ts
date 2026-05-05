import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserById, updateUserName } from '@/lib/auth/user-dal';

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  const name = body.name?.trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: '名称至少需要2个字符' }, { status: 400 });
  }

  if (name.length > 32) {
    return NextResponse.json({ error: '名称不能超过32个字符' }, { status: 400 });
  }

  const user = getUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  updateUserName(session.userId, name);

  return NextResponse.json({ id: session.userId, email: user.email, name });
}
