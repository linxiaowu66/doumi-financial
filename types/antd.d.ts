// 修复 Ant Design 与 React 19 类型的兼容性问题
declare module 'antd' {
  export * from 'antd/es';
}

declare module '@ant-design/icons' {
  export * from '@ant-design/icons/lib/icons';
}
