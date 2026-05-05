import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUserPasswordHash, updateUserPassword } from '@/lib/auth/user-dal';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '请填写当前密码和新密码' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: '新密码至少需要6个字符' }, { status: 400 });
  }

  const currentHash = getUserPasswordHash(session.userId);
  if (!currentHash) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  const ok = await verifyPassword(currentPassword, currentHash);
  if (!ok) {
    return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  updateUserPassword(session.userId, newHash);

  return NextResponse.json({ ok: true });
}
