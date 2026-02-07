import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfYear, endOfYear, format } from 'date-fns';

// GET - 获取指定年份的节假日/调休配置
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get('year');

    let where = {};
    if (yearStr) {
      const year = parseInt(yearStr);
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      where = {
        date: {
          gte: start,
          lte: end,
        },
      };
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(holidays);
  } catch (error) {
    console.error('获取节假日配置失败:', error);
    return NextResponse.json({ error: '获取节假日配置失败' }, { status: 500 });
  }
}

// POST - 新增或更新节假日配置
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, type, remark } = body;

    if (!date || !type) {
      return NextResponse.json(
        { error: '日期和类型不能为空' },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);
    // 只保留日期部分，忽略时间
    dateObj.setHours(0, 0, 0, 0);

    // 使用 upsert，如果是同一天则更新类型
    const holiday = await prisma.holiday.upsert({
      where: {
        date: dateObj,
      },
      update: {
        type,
        remark,
      },
      create: {
        date: dateObj,
        type,
        remark,
      },
    });

    return NextResponse.json(holiday);
  } catch (error) {
    console.error('保存节假日配置失败:', error);
    return NextResponse.json({ error: '保存节假日配置失败' }, { status: 500 });
  }
}

// DELETE - 删除节假日配置（恢复为默认）
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) {
      return NextResponse.json({ error: '日期不能为空' }, { status: 400 });
    }

    const dateObj = new Date(dateStr);
    dateObj.setHours(0, 0, 0, 0);

    await prisma.holiday.delete({
      where: {
        date: dateObj,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // 如果记录不存在，delete 会抛错，但这不算错误，直接返回成功即可
    if ((error as any).code === 'P2025') {
       return NextResponse.json({ success: true });
    }
    console.error('删除节假日配置失败:', error);
    return NextResponse.json({ error: '删除节假日配置失败' }, { status: 500 });
  }
}
