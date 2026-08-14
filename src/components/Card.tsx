import type { ReactNode, CSSProperties } from "react";
import { colors } from "../theme/colors";

export default function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        backgroundColor: colors.white,
        borderRadius: 14,
        padding: 20,
        border: `1px solid ${colors.border}`,
        boxShadow: "0 4px 14px rgba(11, 60, 93, 0.08)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}