import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE - 删除待确认交易
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.pendingTransaction.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除待确认交易失败:', error);
    return NextResponse.json({ error: '删除待确认交易失败' }, { status: 500 });
  }
}
