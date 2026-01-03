import { NextResponse } from 'next/server';

// 检查注册功能是否可用
export async function GET() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  return NextResponse.json({
    enabled: !isProduction,
    environment: nodeEnv,
  });
}

