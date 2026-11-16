import React, { useImperativeHandle, useRef, type MouseEventHandler, type ReactNode, type SVGProps } from 'react';

export type Svg = SVGSVGElement & {
  toDataURL: (callback: (base64: string) => void) => void;
};

type NodeProps<T extends SVGElement> = SVGProps<T> & {
  onPress?: MouseEventHandler<T>;
  accessible?: boolean;
  accessibilityLabel?: string;
  children?: ReactNode;
};

function element<T extends SVGElement>(tag: string, props: NodeProps<T>) {
  const { onPress, accessible: _accessible, accessibilityLabel, onClick, style, ...rest } = props;
  return React.createElement(tag, {
    ...rest,
    'aria-label': accessibilityLabel,
    onClick: onPress ?? onClick as MouseEventHandler<T> | undefined,
    style: onPress ? { cursor: 'pointer', ...style } : style,
  });
}

export type SvgProps = NodeProps<SVGSVGElement>;

const SvgRoot = React.forwardRef<Svg, SvgProps>(function SvgRoot(props, forwardedRef) {
  const elementRef = useRef<SVGSVGElement>(null);
  useImperativeHandle(forwardedRef, () => {
    const node = elementRef.current!;
    return Object.assign(node, {
      toDataURL(callback: (base64: string) => void) {
        const clone = node.cloneNode(true) as SVGSVGElement;
        const box = node.viewBox.baseVal;
        const width = Number.parseFloat(node.getAttribute('width') ?? '');
        const height = Number.parseFloat(node.getAttribute('height') ?? '');
        const pixelWidth = Number.isFinite(width) && width > 0 ? width : (box.width || 420);
        const pixelHeight = Number.isFinite(height) && height > 0 ? height : (box.height || pixelWidth);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('width', String(pixelWidth));
        clone.setAttribute('height', String(pixelHeight));
        const markup = new XMLSerializer().serializeToString(clone);
        const objectUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const canvas = document.createElement('canvas');
          canvas.width = pixelWidth * 2;
          canvas.height = pixelHeight * 2;
          const context = canvas.getContext('2d');
          if (!context) return;
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          callback(canvas.toDataURL('image/png').split(',')[1] ?? '');
        };
        image.onerror = () => URL.revokeObjectURL(objectUrl);
        image.src = objectUrl;
      },
    });
  }, []);
  const { accessible, accessibilityLabel, ...rest } = props;
  return <svg
    {...rest}
    ref={elementRef}
    role={accessible ? 'img' : undefined}
    aria-label={accessibilityLabel}
    xmlns="http://www.w3.org/2000/svg"
  />;
});

function makeElement<T extends SVGElement>(tag: string) {
  return function SvgElement(props: NodeProps<T>) {
    return element<T>(tag, props);
  };
}

export const Circle = makeElement<SVGCircleElement>('circle');
export const Defs = makeElement<SVGDefsElement>('defs');
export const G = makeElement<SVGGElement>('g');
export const ClipPath = makeElement<SVGClipPathElement>('clipPath');
export const Line = makeElement<SVGLineElement>('line');
export const LinearGradient = makeElement<SVGLinearGradientElement>('linearGradient');
export const SvgImage = makeElement<SVGImageElement>('image');
export const Path = makeElement<SVGPathElement>('path');
export const Polygon = makeElement<SVGPolygonElement>('polygon');
export const Polyline = makeElement<SVGPolylineElement>('polyline');
export const RadialGradient = makeElement<SVGRadialGradientElement>('radialGradient');
export const Rect = makeElement<SVGRectElement>('rect');
export const Stop = makeElement<SVGStopElement>('stop');
export const Text = makeElement<SVGTextElement>('text');

export default SvgRoot;
