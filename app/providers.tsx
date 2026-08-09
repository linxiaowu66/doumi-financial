'use client';

import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </SessionProvider>
  );
}
