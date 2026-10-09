import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth-scope';

// GET - 获取单个投资方向
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { id } = await params;
    const direction = await prisma.investmentDirection.findUnique({
      where: { id: parseInt(id), userId },
      include: {
        householdMember: true,
        funds: {
          include: {
            _count: {
              select: {
                transactions: true,
                plannedPurchases: {
                  where: { status: 'PENDING' },
                },
                pendingTransactions: {
                  where: { status: 'WAITING' },
                },
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
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const { name, expectedAmount, householdMemberId: rawMemberId } = body;
    const householdMemberId = rawMemberId ? Number(rawMemberId) : null;
    const existing = await prisma.investmentDirection.findFirst({ where: { id: parseInt(id), userId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: '投资方向不存在' }, { status: 404 });
    }
    if (householdMemberId !== null && !await prisma.householdMember.findFirst({ where: { id: householdMemberId, userId } })) {
      return NextResponse.json({ error: '家庭成员不存在' }, { status: 400 });
    }

    const direction = await prisma.investmentDirection.update({
      where: { id: parseInt(id) },
      data: {
        userId,
        householdMemberId,
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
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { id } = await params;

    const result = await prisma.investmentDirection.deleteMany({
      where: { id: parseInt(id), userId },
    });
    if (!result.count) return NextResponse.json({ error: '投资方向不存在' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除投资方向失败:', error);
    return NextResponse.json({ error: '删除投资方向失败' }, { status: 500 });
  }
}
