module.exports = {
  apps: [
    {
      name: 'doumi-financial',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: process.cwd(),
      instances: 1, // 单实例，如需多实例可改为 'max'
      exec_mode: 'fork',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true, // 日志添加时间戳

      // 自动重启配置
      autorestart: true,
      watch: false, // 生产环境关闭文件监听
      max_memory_restart: '1G', // 内存超过 1G 自动重启
      min_uptime: '10s', // 10秒内重启视为异常
      max_restarts: 10, // 最多重启 10 次
      restart_delay: 4000, // 重启延迟 4 秒

      // 其他配置
      kill_timeout: 5000, // 5秒超时
      listen_timeout: 10000, // 10秒监听超时
      shutdown_with_message: true, // 优雅关闭
    },
  ],
};
