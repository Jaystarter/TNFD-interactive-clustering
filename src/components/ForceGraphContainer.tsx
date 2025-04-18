import { useState, useEffect } from 'react';
import { ForceGraph } from './ForceGraph';
import { Tool } from '../data/tools';

interface ForceGraphContainerProps {
  toolsData: Tool[];
  controlsExpanded: boolean;
}

export const ForceGraphContainer = ({ toolsData, controlsExpanded }: ForceGraphContainerProps) => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: controlsExpanded ? window.innerHeight - 230 : window.innerHeight - 180
  });

  useEffect(() => {
    // Function to update dimensions
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: controlsExpanded ? window.innerHeight - 230 : window.innerHeight - 180
      });
    };

    // Add event listener for window resize
    window.addEventListener('resize', updateDimensions);

    // Update dimensions when controlsExpanded changes
    updateDimensions();

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [controlsExpanded]);

  return (
    <ForceGraph
      width={dimensions.width}
      height={dimensions.height}
      toolsData={toolsData}
    />
  );
};

export default ForceGraphContainer;
