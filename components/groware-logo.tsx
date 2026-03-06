import { GrowareIcon } from "./groware-icon";

type LogoSize = "sm" | "md" | "lg" | "xl";

interface GrowareLogoProps {
  size?: LogoSize;
}

const sizeConfig: Record<LogoSize, { icon: number; fontSize: string; gap: string; track: string }> = {
  sm: { icon: 26, fontSize: "15px", gap: "9px", track: "-0.035em" },
  md: { icon: 36, fontSize: "21px", gap: "11px", track: "-0.04em" },
  lg: { icon: 48, fontSize: "28px", gap: "14px", track: "-0.045em" },
  xl: { icon: 64, fontSize: "40px", gap: "18px", track: "-0.05em" },
};

export function GrowareLogo({ size = "md" }: GrowareLogoProps) {
  const c = sizeConfig[size];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: c.gap }}>
      <GrowareIcon size={c.icon} />
      <span
        style={{
          fontSize: c.fontSize,
          fontWeight: 600,
          letterSpacing: c.track,
          color: "#fafafa",
          lineHeight: 1,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        grow<span style={{ color: "#818cf8" }}>are</span>
      </span>
    </div>
  );
}
