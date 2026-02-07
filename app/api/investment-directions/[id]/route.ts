import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取单个投资方向
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const direction = await prisma.investmentDirection.findUnique({
      where: { id: parseInt(id) },
      include: {
        funds: {
          include: {
            _count: {
              select: {
                transactions: true,
                plannedPurchases: true,
                pendingTransactions: true,
              }
            }
          }
        },
      },
    });

    if (!direction) {
      return NextResponse.json({ error: '投资方向不存在' }, { status: 404 });
    }

    return NextResponse.json(direction);
  } catch (error) {
    console.error('获取投资方向失败:', error);
    return NextResponse.json({ error: '获取投资方向失败' }, { status: 500 });
  }
}

// PUT - 更新投资方向
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, expectedAmount } = body;

    const direction = await prisma.investmentDirection.update({
      where: { id: parseInt(id) },
      data: {
        name,
        expectedAmount: parseFloat(expectedAmount),
      },
    });

    return NextResponse.json(direction);
  } catch (error) {
    console.error('更新投资方向失败:', error);
    return NextResponse.json({ error: '更新投资方向失败' }, { status: 500 });
  }
}

// DELETE - 删除投资方向
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.investmentDirection.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除投资方向失败:', error);
    return NextResponse.json({ error: '删除投资方向失败' }, { status: 500 });
  }
}
