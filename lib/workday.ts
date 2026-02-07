import { addDays, isWeekend, format } from 'date-fns';
import prisma from '@/lib/prisma';

/**
 * 异步获取下一个工作日
 * 考虑数据库中的节假日/调休配置
 * @param date 当前日期
 */
export async function getNextWorkday(date: Date): Promise<Date> {
  // 从明天开始查找
  let currentDate = new Date(date);
  
  // 预加载接下来一段时间的节假日配置（例如30天）
  // 注意：applyDate本身不算第一天，确认日是 T+N
  // 因为这是计算 *下一个* 工作日，所以从 date 开始查 30 天是合理的
  const queryStart = date;
  const queryEnd = addDays(date, 30);

  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: queryStart,
        lte: queryEnd,
      },
    },
  });

  // 转换为 Map 方便快速查找 (yyyy-MM-dd -> type)
  const holidayMap = new Map<string, string>();
  holidays.forEach(h => {
    holidayMap.set(format(h.date, 'yyyy-MM-dd'), h.type);
  });

  // 尝试查找最近的30天
  for (let i = 0; i < 30; i++) {
    currentDate = addDays(currentDate, 1);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const configType = holidayMap.get(dateStr);
    
    // 判断是否为工作日
    let isWork = false;

    if (configType === 'WORKDAY') {
      isWork = true;
    } else if (configType === 'HOLIDAY') {
      isWork = false;
    } else {
      isWork = !isWeekend(currentDate);
    }

    if (isWork) {
      return currentDate;
    }
  }
  
  return currentDate;
}

/**
 * 异步判断某天是否为工作日
 */
export async function isWorkday(date: Date): Promise<boolean> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const holiday = await prisma.holiday.findUnique({
    where: { date: new Date(dateStr) },
  });

  if (holiday) {
    return holiday.type === 'WORKDAY';
  }

  return !isWeekend(date);
}

/**
 * 异步计算确认日期
 * 考虑数据库中的节假日/调休配置
 * @param applyDate 申请日期
 * @param days 需要的工作日天数
 */
export async function calculateConfirmDate(applyDate: Date, days: number): Promise<Date> {
  let currentDate = new Date(applyDate);
  let remainingDays = days;

  // 预加载接下来一段时间的节假日配置（例如60天）
  // 注意：applyDate本身不算第一天，确认日是 T+N
  const queryStart = applyDate;
  const queryEnd = addDays(applyDate, 60);

  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: queryStart,
        lte: queryEnd,
      },
    },
  });

  // 转换为 Map 方便快速查找 (yyyy-MM-dd -> type)
  const holidayMap = new Map<string, string>();
  holidays.forEach(h => {
    holidayMap.set(format(h.date, 'yyyy-MM-dd'), h.type);
  });

  while (remainingDays > 0) {
    currentDate = addDays(currentDate, 1);
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const configType = holidayMap.get(dateStr);
    
    // 判断是否为工作日
    let isWork = false;

    if (configType === 'WORKDAY') {
      // 明确标记为工作日（调休）
      isWork = true;
    } else if (configType === 'HOLIDAY') {
      // 明确标记为节假日
      isWork = false;
    } else {
      // 默认情况：周一至周五为工作日
      isWork = !isWeekend(currentDate);
    }

    if (isWork) {
      remainingDays--;
    }
  }

  return currentDate;
}
