import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取分类目标列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const directionId = searchParams.get('directionId');

    const where = directionId ? { directionId: parseInt(directionId) } : {};

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
    return NextResponse.json({ error: '获取分类目标失败' }, { status: 500 });
  }
}

// POST - 创建或更新分类目标
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { directionId, categoryName, targetAmount } = body;

    if (!directionId || !categoryName || !targetAmount) {
      return NextResponse.json(
        { error: '投资方向、分类名称和目标金额不能为空' },
        { status: 400 }
      );
    }

    // 使用 upsert 创建或更新
    const target = await prisma.categoryTarget.upsert({
      where: {
        directionId_categoryName: {
          directionId: parseInt(directionId),
          categoryName,
        },
      },
      update: {
        targetAmount: parseFloat(targetAmount),
      },
      create: {
        directionId: parseInt(directionId),
        categoryName,
        targetAmount: parseFloat(targetAmount),
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
