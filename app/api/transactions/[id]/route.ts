import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateActualAmountByFundId } from '@/lib/investment-direction';

// DELETE - 删除交易记录
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 先获取交易记录以获取 fundId
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      select: { fundId: true },
    });

    if (!transaction) {
      return NextResponse.json({ error: '交易记录不存在' }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id: parseInt(id) },
    });

    // 更新投资方向的实际投入金额
    await updateActualAmountByFundId(transaction.fundId);

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

    // 先获取交易记录以获取 fundId
    const oldTransaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      select: { fundId: true },
    });

    if (!oldTransaction) {
      return NextResponse.json({ error: '交易记录不存在' }, { status: 404 });
    }

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

    // 更新投资方向的实际投入金额
    await updateActualAmountByFundId(oldTransaction.fundId);

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('更新交易记录失败:', error);
    return NextResponse.json({ error: '更新交易记录失败' }, { status: 500 });
  }
}
