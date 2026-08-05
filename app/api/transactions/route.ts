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
      pendingTransactionId,
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

    // 对于现金分红，price可以为0（因为不需要净值）
    // 对于其他类型，price必须有效
    let finalPrice = 0;
    if (type === 'DIVIDEND' && !dividendReinvest) {
      // 现金分红：price设为0
      finalPrice = 0;
    } else {
      // 其他类型：price必须有效
      if (price === undefined || price === null) {
        return NextResponse.json(
          { error: '净值不能为空' },
          { status: 400 }
        );
      }
      finalPrice = parseFloat(price);
      if (isNaN(finalPrice) || finalPrice <= 0) {
        return NextResponse.json(
          { error: '净值必须大于0' },
          { status: 400 }
        );
      }
    }

    const parsedFundId = parseInt(fundId);
    const transactionData = {
      fundId: parsedFundId,
      type,
      amount: parseFloat(amount),
      shares: parseFloat(shares),
      price: finalPrice,
      fee: fee ? parseFloat(fee) : 0,
      date: new Date(date),
      dividendReinvest: dividendReinvest || false,
      remark,
    };
    const pendingId = pendingTransactionId ? parseInt(pendingTransactionId) : null;

    if (pendingId) {
      const pending = await prisma.pendingTransaction.findFirst({
        where: { id: pendingId, fundId: parsedFundId, type: "DIVIDEND", status: "WAITING" },
        select: { id: true },
      });
      if (!pending || type !== "DIVIDEND") {
        return NextResponse.json({ error: "待确认分红不存在或已处理" }, { status: 400 });
      }
    }

    const transaction = pendingId
      ? await prisma.$transaction(async (tx) => {
          const claimed = await tx.pendingTransaction.updateMany({
            where: { id: pendingId, status: "WAITING" },
            data: { status: "CONFIRMED" },
          });
          if (claimed.count !== 1) throw new Error("待确认分红已处理");
          return tx.transaction.create({ data: transactionData, include: { fund: true } });
        })
      : await prisma.transaction.create({
          data: transactionData,
          include: { fund: true },
        });

    // 更新投资方向的实际投入金额
    await updateActualAmountByFundId(parsedFundId);

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
