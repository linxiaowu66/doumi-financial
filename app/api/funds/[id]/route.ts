import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    const body = await request.json();
    const { code, name, category, remark } = body;

    const fund = await prisma.fund.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        category,
        remark,
      },
    });

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

    await prisma.fund.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除基金失败:', error);
    return NextResponse.json({ error: '删除基金失败' }, { status: 500 });
  }
}
