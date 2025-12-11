import { PrismaClient } from '../app/generated/prisma/client';
import 'dotenv/config';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 创建示例用户（如果不存在）
  const existingUser = await prisma.user.findUnique({
    where: { email: 'demo@example.com' },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('demo123456', 10);
    const user = await prisma.user.create({
      data: {
        email: 'demo@example.com',
        name: '演示用户',
        password: hashedPassword,
      },
    });
    console.log(`Created demo user with id: ${user.id}`);
  } else {
    console.log('Demo user already exists');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
