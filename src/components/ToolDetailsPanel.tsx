import { Card } from "./ui/card";

export default function ToolDetailsPanel() {
  return (
    <Card className="fixed right-0 top-0 h-full w-full md:w-96 bg-white/80 dark:bg-gray-900/90 backdrop-blur-md shadow-2xl border-l border-tnfd-green/30 dark:border-tnfd-dark-green/30 z-30 p-8 rounded-l-2xl transition-all hidden md:block">
      {/* Placeholder for tool details content */}
      <h2 className="text-2xl font-bold mb-4 text-tnfd-green dark:text-tnfd-green">Tool Details</h2>
      <div className="text-gray-600 dark:text-gray-300 italic">Select a tool to view details here.</div>
    </Card>
  );
}
