import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE - 删除计划买入
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.plannedPurchase.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除计划买入失败:', error);
    return NextResponse.json({ error: '删除计划买入失败' }, { status: 500 });
  }
}

// PUT - 更新计划买入（标记为已完成）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const plan = await prisma.plannedPurchase.update({
      where: { id: parseInt(id) },
      data: {
        status: body.status || 'COMPLETED',
        purchasedAt: body.status === 'COMPLETED' ? new Date() : null,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('更新计划买入失败:', error);
    return NextResponse.json({ error: '更新计划买入失败' }, { status: 500 });
  }
}

// POST - 执行计划买入（转为实际交易）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { price, fee, date } = body;

    if (!price || !date) {
      return NextResponse.json(
        { error: '净值和日期不能为空' },
        { status: 400 }
      );
    }

    // 获取计划
    const plan = await prisma.plannedPurchase.findUnique({
      where: { id: parseInt(id) },
    });

    if (!plan) {
      return NextResponse.json({ error: '计划不存在' }, { status: 404 });
    }

    // 计算份额
    const netAmount = parseFloat(plan.plannedAmount.toString()) - (fee || 0);
    const shares = netAmount / parseFloat(price);

    // 创建交易记录
    const transaction = await prisma.transaction.create({
      data: {
        fundId: plan.fundId,
        type: 'BUY',
        amount: parseFloat(plan.plannedAmount.toString()),
        shares,
        price: parseFloat(price),
        fee: fee || 0,
        date: new Date(date),
        remark: `执行计划买入 #${id}`,
      },
    });

    // 标记计划为已完成
    await prisma.plannedPurchase.update({
      where: { id: parseInt(id) },
      data: {
        status: 'COMPLETED',
        purchasedAt: new Date(date),
      },
    });

    return NextResponse.json({ transaction, plan });
  } catch (error) {
    console.error('执行计划买入失败:', error);
    return NextResponse.json({ error: '执行计划买入失败' }, { status: 500 });
  }
}
