import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth-scope';

// GET - 获取计划买入列表
export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');
    const status = searchParams.get('status');

    const where: {
      fundId?: number;
      status?: string;
    } = {};
    if (fundId) where.fundId = parseInt(fundId);
    if (status) where.status = status;
    const plans = await prisma.plannedPurchase.findMany({
      where: { ...where, fund: { direction: { userId } } },
      include: { fund: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('获取计划买入失败:', error);
    return NextResponse.json({ error: '获取计划买入失败' }, { status: 500 });
  }
}

// POST - 创建计划买入
export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const body = await request.json();
    const { fundId, plannedAmount } = body;

    if (!fundId || !plannedAmount) {
      return NextResponse.json(
        { error: '基金ID和计划金额不能为空' },
        { status: 400 }
      );
    }

    const owner = await prisma.fund.findFirst({ where: { id: parseInt(fundId), direction: { userId } }, select: { id: true } });
    if (!owner) return NextResponse.json({ error: '基金不存在' }, { status: 404 });
    const plan = await prisma.plannedPurchase.create({
      data: {
        fundId: parseInt(fundId),
        plannedAmount: parseFloat(plannedAmount),
        status: 'PENDING',
      },
      include: {
        fund: true,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('创建计划买入失败:', error);
    return NextResponse.json({ error: '创建计划买入失败' }, { status: 500 });
  }
}
