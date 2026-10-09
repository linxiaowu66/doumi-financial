import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth-scope';

// DELETE - 删除待确认交易
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { id } = await params;
    const result = await prisma.pendingTransaction.deleteMany({
      where: { id: parseInt(id), fund: { direction: { userId } } },
    });
    if (!result.count) return NextResponse.json({ error: '待确认交易不存在' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除待确认交易失败:', error);
    return NextResponse.json({ error: '删除待确认交易失败' }, { status: 500 });
  }
}
