const PALETTE = [
  { hex: "#6366f1", text: "text-indigo-400",  bg: "bg-indigo-600/20"  },
  { hex: "#8b5cf6", text: "text-violet-400",  bg: "bg-violet-600/20"  },
  { hex: "#22c55e", text: "text-emerald-400", bg: "bg-emerald-600/20" },
  { hex: "#f59e0b", text: "text-amber-400",   bg: "bg-amber-600/20"   },
  { hex: "#06b6d4", text: "text-cyan-400",    bg: "bg-cyan-600/20"    },
  { hex: "#f43f5e", text: "text-rose-400",    bg: "bg-rose-600/20"    },
];

export function getStepColor(key: string, allStepKeys: string[]) {
  const idx = allStepKeys.indexOf(key);
  return PALETTE[(idx === -1 ? 0 : idx) % PALETTE.length];
}
