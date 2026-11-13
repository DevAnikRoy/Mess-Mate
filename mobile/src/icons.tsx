import Svg, { Path } from "react-native-svg";

type IconProps = { color?: string; size?: number };

const stroke = { strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" as const };

export function IconHome({ color = "#1B1730", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...stroke} stroke={color} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function IconMeal({ color = "#1B1730", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...stroke} stroke={color} d="M6 3v8a3 3 0 0 0 3 3v7M9 3v6M15 3c2 3 2 6 2 8v9M15 3c-1.2 2.2-1.2 5 0 8" />
    </Svg>
  );
}

export function IconBag({ color = "#1B1730", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...stroke} stroke={color} d="M6 8h12l-1 12H7L6 8z" />
      <Path {...stroke} stroke={color} d="M9 8V7a3 3 0 0 1 6 0v1" />
    </Svg>
  );
}

export function IconBill({ color = "#1B1730", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...stroke} stroke={color} d="M7 3h10v18l-2-1.2L13 21l-2-1.2L9 21l-2-1.2L5 21V5a2 2 0 0 1 2-2z" />
      <Path {...stroke} stroke={color} d="M9 8h6M9 12h6" />
    </Svg>
  );
}

export function IconReport({ color = "#1B1730", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...stroke} stroke={color} d="M5 19V9M10 19V5M15 19v-7M20 19V8" />
    </Svg>
  );
}

export function IconBell({ color = "#1B1730", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...stroke} stroke={color} d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2H4.5L6 16zM10 19a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconArrow({ color = "#1B1730", size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...stroke} stroke={color} d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function IconCopy({ color = "#ffffff", size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...stroke} stroke={color} d="M8 8h12v12H8z" />
      <Path {...stroke} stroke={color} d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </Svg>
  );
}
