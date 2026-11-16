import { View, type ViewProps } from 'react-native';
import type { ComponentType, ReactNode } from 'react';

export function SafeAreaProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const WebView = View as unknown as ComponentType<ViewProps>;

export function SafeAreaView({ edges: _edges, ...props }: ViewProps & { edges?: readonly string[] }) {
  return <div className="web-safe-area-root"><WebView {...props} /></div>;
}
