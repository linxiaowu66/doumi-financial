import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateActualAmountByFundId } from '@/lib/investment-direction';

// POST - 创建交易记录
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fundId,
      type,
      amount,
      shares,
      price,
      fee,
      date,
      dividendReinvest,
      remark,
    } = body;

    if (!fundId || !type || !date) {
      return NextResponse.json(
        { error: '基金ID、交易类型和日期不能为空' },
        { status: 400 }
      );
    }

    // 验证交易类型
    if (!['BUY', 'SELL', 'DIVIDEND'].includes(type)) {
      return NextResponse.json(
        { error: '交易类型必须是 BUY、SELL 或 DIVIDEND' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        fundId: parseInt(fundId),
        type,
        amount: parseFloat(amount),
        shares: parseFloat(shares),
        price: parseFloat(price),
        fee: fee ? parseFloat(fee) : 0,
        date: new Date(date),
        dividendReinvest: dividendReinvest || false,
        remark,
      },
      include: {
        fund: true,
      },
    });

    // 更新投资方向的实际投入金额
    await updateActualAmountByFundId(parseInt(fundId));

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('创建交易记录失败:', error);
    return NextResponse.json({ error: '创建交易记录失败' }, { status: 500 });
  }
}

// GET - 获取交易记录列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');

    const where = fundId ? { fundId: parseInt(fundId) } : {};

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        fund: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('获取交易记录失败:', error);
    return NextResponse.json({ error: '获取交易记录失败' }, { status: 500 });
  }
}
