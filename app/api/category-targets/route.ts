import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth-scope';

// GET - 获取分类目标列表
export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const directionId = searchParams.get('directionId');

    const where = directionId
      ? { directionId: parseInt(directionId), direction: { userId } }
      : { direction: { userId } };

    const targets = await prisma.categoryTarget.findMany({
      where,
      include: {
        direction: true,
      },
      orderBy: {
        categoryName: 'asc',
      },
    });

    return NextResponse.json(targets);
  } catch (error) {
    console.error('获取分类目标失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '获取分类目标失败', message: errorMessage },
      { status: 500 }
    );
  }
}

// POST - 创建或更新分类目标
export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await request.json();
    const { directionId, categoryName, targetPercent } = body;
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!directionId || !categoryName || targetPercent === undefined || targetPercent === null) {
      return NextResponse.json(
        { error: '投资方向、分类名称和目标仓位百分比不能为空' },
        { status: 400 }
      );
    }

    const percentValue = parseFloat(targetPercent);
    if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 100) {
      return NextResponse.json(
        { error: '目标仓位百分比必须在 0-100 之间' },
        { status: 400 }
      );
    }

    // 使用 upsert 创建或更新
    const ownsDirection = await prisma.investmentDirection.findFirst({ where: { id: parseInt(directionId), userId }, select: { id: true } });
    if (!ownsDirection) return NextResponse.json({ error: '投资方向不存在' }, { status: 404 });
    const target = await prisma.categoryTarget.upsert({
      where: {
        directionId_categoryName: {
          directionId: parseInt(directionId),
          categoryName,
        },
      },
      update: {
        targetPercent: percentValue,
        minPercent: percentValue,
        maxPercent: percentValue,
      },
      create: {
        directionId: parseInt(directionId),
        categoryName,
        targetPercent: percentValue,
        minPercent: percentValue,
        maxPercent: percentValue,
      },
    });

    return NextResponse.json(target);
  } catch (error) {
    console.error('创建/更新分类目标失败:', error);
    return NextResponse.json(
      { error: '创建/更新分类目标失败' },
      { status: 500 }
    );
  }
}
