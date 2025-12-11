/// <reference types="react" />
/// <reference types="react-dom" />

// 修复 React 19 与第三方库的类型兼容性问题
declare namespace React {
  type FC<P = {}> = FunctionComponent<P>;
  type PropsWithChildren<P = unknown> = P & {
    children?: ReactNode | undefined;
  };
}
