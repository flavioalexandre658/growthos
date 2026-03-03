const PALETTE = [
  { hex: "#6366f1", text: "text-indigo-400" },
  { hex: "#8b5cf6", text: "text-violet-400" },
  { hex: "#22c55e", text: "text-emerald-400" },
  { hex: "#f59e0b", text: "text-amber-400" },
  { hex: "#06b6d4", text: "text-cyan-400" },
  { hex: "#f43f5e", text: "text-rose-400" },
];

export function getStepColor(key: string, allStepKeys: string[]) {
  const idx = allStepKeys.indexOf(key);
  return PALETTE[(idx === -1 ? 0 : idx) % PALETTE.length];
}
