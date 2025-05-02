
import { Tool } from '../data/tools';
import ForceGraphContainer from './ForceGraphContainer';
import { Card } from "./ui/card";

type MainContentProps = {
  toolsData: Tool[];
  controlsExpanded: boolean;
};

export default function MainContent({ toolsData, controlsExpanded }: MainContentProps) {
  return (
    <Card className="flex-1 flex items-center justify-center h-[calc(100vh-140px)] mx-4 mb-4 mt-0 p-2 rounded-2xl bg-white/80 dark:bg-gray-900/80 shadow-xl border border-tnfd-green/30 dark:border-tnfd-dark-green/30 backdrop-blur-md">
      <div className="w-full h-full overflow-hidden">
        <ForceGraphContainer toolsData={toolsData} controlsExpanded={controlsExpanded} />
      </div>
    </Card>
  );
}
