import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 直接返回成功，不做任何操作
  return NextResponse.json({
    message: '注册成功',
  });
}
