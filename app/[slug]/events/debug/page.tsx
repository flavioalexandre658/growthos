import { DebugContent } from "./_components/debug-content";

export const metadata = {
  title: "Debug do Tracker | Groware",
};

export default function DebugPage() {
  return (
    <div className="p-5 lg:p-6">
      <DebugContent />
    </div>
  );
}
