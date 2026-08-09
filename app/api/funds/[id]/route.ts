import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateInvestmentDirectionActualAmount } from '@/lib/investment-direction';

// GET - 获取基金详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fund = await prisma.fund.findUnique({
      where: { id: parseInt(id) },
      include: {
        direction: true,
        transactions: {
          orderBy: { date: 'desc' },
        },
        plannedPurchases: {
          orderBy: { createdAt: 'desc' },
        },
        pendingTransactions: {
          where: { status: 'WAITING' },
          orderBy: { applyDate: 'desc' },
        },
      },
    });

    if (!fund) {
      return NextResponse.json({ error: '基金不存在' }, { status: 404 });
    }

    return NextResponse.json(fund);
  } catch (error) {
    console.error('获取基金详情失败:', error);
    return NextResponse.json({ error: '获取基金详情失败' }, { status: 500 });
  }
}

// PUT - 更新基金
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fundId = parseInt(id);
    const body = await request.json();
    const {
      code,
      name,
      category,
      remark,
      confirmDays,
      defaultBuyFee,
      defaultSellFee,
      dividendReinvest,
      alertThreshold,
      takeProfitTrigger,
      takeProfitDrawdown,
      takeProfitSellPercent,
      directionId,
    } = body;

    const optionalRules = { alertThreshold, takeProfitTrigger, takeProfitDrawdown, takeProfitSellPercent };
    if (Object.values(optionalRules).some((value) => value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100))) {
      return NextResponse.json({ error: '涨跌预警比例必须在 0 到 100 之间' }, { status: 400 });
    }

    const oldFund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { directionId: true },
    });

    if (!oldFund) {
      return NextResponse.json({ error: '基金不存在' }, { status: 404 });
    }

    const fund = await prisma.fund.update({
      where: { id: fundId },
      data: {
        code,
        name,
        category,
        remark,
        confirmDays: confirmDays ? parseInt(confirmDays) : undefined,
        defaultBuyFee,
        defaultSellFee,
        dividendReinvest: dividendReinvest === undefined ? undefined : dividendReinvest === true,
        alertThreshold: alertThreshold === undefined ? undefined : Number(alertThreshold),
        takeProfitTrigger: takeProfitTrigger === undefined ? undefined : Number(takeProfitTrigger),
        takeProfitDrawdown: takeProfitDrawdown === undefined ? undefined : Number(takeProfitDrawdown),
        takeProfitSellPercent: takeProfitSellPercent === undefined ? undefined : Number(takeProfitSellPercent),
        ...(directionId !== undefined && { directionId: parseInt(directionId) }),
      },
    });

    if (oldFund.directionId !== fund.directionId) {
      await Promise.all([
        updateInvestmentDirectionActualAmount(oldFund.directionId),
        updateInvestmentDirectionActualAmount(fund.directionId),
      ]);
    }

    return NextResponse.json(fund);
  } catch (error) {
    console.error('更新基金失败:', error);
    return NextResponse.json({ error: '更新基金失败' }, { status: 500 });
  }
}

// DELETE - 删除基金
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fundId = parseInt(id);

    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { directionId: true },
    });

    if (!fund) {
      return NextResponse.json({ error: '基金不存在' }, { status: 404 });
    }

    await prisma.fund.delete({
      where: { id: fundId },
    });

    await updateInvestmentDirectionActualAmount(fund.directionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除基金失败:', error);
    return NextResponse.json({ error: '删除基金失败' }, { status: 500 });
  }
}
