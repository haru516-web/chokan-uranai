import { StyleSheet } from 'react-native';
import type { CSSProperties, ImgHTMLAttributes } from 'react';

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'style'> & {
  source: string | number | { uri?: string };
  style?: unknown;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  contentPosition?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
};

export function Image({ source, style, contentFit = 'cover', contentPosition = 'center', accessible, accessibilityLabel, ...props }: ImageProps) {
  const src = typeof source === 'string' ? source : typeof source === 'number' ? String(source) : source.uri ?? '';
  const flatStyle = StyleSheet.flatten(style as never) as CSSProperties | undefined;
  const absoluteFill = flatStyle?.position === 'absolute';
  return <img
    {...props}
    src={src}
    alt={accessible ? accessibilityLabel ?? '' : ''}
    aria-hidden={!accessible || undefined}
    style={{
      display: 'block',
      ...flatStyle,
      ...(absoluteFill ? { width: flatStyle.width ?? '100%', height: flatStyle.height ?? '100%' } : {}),
      objectFit: contentFit,
      objectPosition: contentPosition
    }}
  />;
}
