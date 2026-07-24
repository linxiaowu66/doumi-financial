import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取投资方向的所有AI分析历史记录
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const directionId = parseInt(id);

    const analyses = await prisma.investmentDirectionAnalysis.findMany({
      where: { directionId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        content: true,
      }
    });

    return NextResponse.json(analyses);
  } catch (error: unknown) {
    console.error('获取AI分析历史记录失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '获取AI分析历史记录失败', message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const directionId = Number(id);
    const body = await request.json();
    if (!Number.isInteger(directionId) || typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: '分析报告内容不能为空' }, { status: 400 });
    }

    const analysis = await prisma.investmentDirectionAnalysis.create({
      data: { directionId, content: body.content },
      select: { id: true, createdAt: true, content: true },
    });
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error('保存AI分析历史记录失败:', error);
    return NextResponse.json({ error: '保存AI分析历史记录失败' }, { status: 500 });
  }
}
