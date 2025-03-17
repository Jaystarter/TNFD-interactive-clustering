import { useState, useEffect } from 'react';
import { ForceGraph } from './components/ForceGraph';
import { parseCSV, generateConnections } from './utils/csvParser';
import { Tool } from './data/tools';
import './App.css';

function App() {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [biodiversityTools, setBiodiversityTools] = useState<Tool[]>([]);

  // Load and process CSV data
  useEffect(() => {
    const loadCSVData = async () => {
      try {
        const response = await fetch('/biodiversity_tools.csv');
        const csvData = await response.text();
        const parsedTools = parseCSV(csvData);
        const processedTools = generateConnections(parsedTools, 0.4); // Lower threshold for more connections
        setBiodiversityTools(processedTools);
      } catch (error) {
        console.error('Error loading CSV data:', error);
      }
    };
    
    loadCSVData();
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="App">
      <h1>TNFD Tools Interactive Clustering</h1>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search tools or categories..."
          className="search-input"
        />
      </div>
      <ForceGraph 
        width={dimensions.width} 
        height={dimensions.height - 150} 
        toolsData={biodiversityTools.length > 0 ? biodiversityTools : undefined}
      />
    </div>
  );
}

export default App
