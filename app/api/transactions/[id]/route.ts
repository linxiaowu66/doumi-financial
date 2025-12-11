import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE - 删除交易记录
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.transaction.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除交易记录失败:', error);
    return NextResponse.json({ error: '删除交易记录失败' }, { status: 500 });
  }
}

// PUT - 更新交易记录
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, amount, shares, price, fee, date, dividendReinvest, remark } =
      body;

    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: {
        type,
        amount: parseFloat(amount),
        shares: parseFloat(shares),
        price: parseFloat(price),
        fee: fee ? parseFloat(fee) : 0,
        date: new Date(date),
        dividendReinvest: dividendReinvest || false,
        remark,
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('更新交易记录失败:', error);
    return NextResponse.json({ error: '更新交易记录失败' }, { status: 500 });
  }
}
