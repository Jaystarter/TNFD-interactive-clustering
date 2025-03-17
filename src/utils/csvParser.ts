import { Tool } from '../data/tools';

export interface BiodiversityTool {
  name: string;
  provider: string;
  primaryFunction: string;
  dataSources: string[];
  sectorFocus: string[];
  geographicScope: string;
  methodology: string[];
  userInterface: string;
  cost: string;
}

// Parse CSV data into structured format
export const parseCSV = (csvData: string): BiodiversityTool[] => {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    // Handle commas within quoted fields
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue); // Add the last value
    
    return {
      name: values[0],
      provider: values[1],
      primaryFunction: values[2],
      dataSources: values[3].split(',').map(s => s.trim()),
      sectorFocus: values[4].split(',').map(s => s.trim()),
      geographicScope: values[5],
      methodology: values[6].split(',').map(s => s.trim()),
      userInterface: values[7],
      cost: values[8]
    };
  });
};

// Calculate similarity between two tools
export const calculateSimilarity = (tool1: BiodiversityTool, tool2: BiodiversityTool): number => {
  // Weights for different attributes (primary function has highest weight)
  const weights = {
    primaryFunction: 0.4,
    dataSources: 0.2,
    sectorFocus: 0.15,
    methodology: 0.15,
    geographicScope: 0.05,
    userInterface: 0.05
  };
  
  let similarity = 0;
  
  // Primary function similarity (exact match or partial match)
  if (tool1.primaryFunction === tool2.primaryFunction) {
    similarity += weights.primaryFunction;
  } else {
    // Check for partial matches in primary function
    const func1Words = tool1.primaryFunction.toLowerCase().split(/\s+/);
    const func2Words = tool2.primaryFunction.toLowerCase().split(/\s+/);
    const commonWords = func1Words.filter(word => 
      func2Words.includes(word) && word.length > 3 // Only consider significant words
    );
    
    if (commonWords.length > 0) {
      similarity += weights.primaryFunction * (commonWords.length / Math.max(func1Words.length, func2Words.length));
    }
  }
  
  // Data sources similarity (intersection / union)
  const dataSourcesIntersection = tool1.dataSources.filter(ds => 
    tool2.dataSources.some(ds2 => ds2.toLowerCase().includes(ds.toLowerCase()) || ds.toLowerCase().includes(ds2.toLowerCase()))
  );
  similarity += weights.dataSources * (dataSourcesIntersection.length / 
    Math.max(1, Math.max(tool1.dataSources.length, tool2.dataSources.length)));
  
  // Sector focus similarity
  const sectorIntersection = tool1.sectorFocus.filter(sector => 
    tool2.sectorFocus.some(s2 => s2.toLowerCase().includes(sector.toLowerCase()) || sector.toLowerCase().includes(s2.toLowerCase()))
  );
  similarity += weights.sectorFocus * (sectorIntersection.length / 
    Math.max(1, Math.max(tool1.sectorFocus.length, tool2.sectorFocus.length)));
  
  // Methodology similarity
  const methodologyIntersection = tool1.methodology.filter(method => 
    tool2.methodology.some(m2 => m2.toLowerCase().includes(method.toLowerCase()) || method.toLowerCase().includes(m2.toLowerCase()))
  );
  similarity += weights.methodology * (methodologyIntersection.length / 
    Math.max(1, Math.max(tool1.methodology.length, tool2.methodology.length)));
  
  // Geographic scope (exact match)
  if (tool1.geographicScope === tool2.geographicScope) {
    similarity += weights.geographicScope;
  }
  
  // User interface (exact match)
  if (tool1.userInterface === tool2.userInterface) {
    similarity += weights.userInterface;
  }
  
  return similarity;
};

// Generate connections between tools based on similarity threshold
export const generateConnections = (tools: BiodiversityTool[], threshold: number = 0.5): Tool[] => {
  const result: Tool[] = [];
  
  // Create a map of tool names to their connections
  const connections: Record<string, string[]> = {};
  
  // Calculate similarities and establish connections
  for (let i = 0; i < tools.length; i++) {
    const tool1 = tools[i];
    connections[tool1.name] = [];
    
    for (let j = 0; j < tools.length; j++) {
      if (i === j) continue;
      
      const tool2 = tools[j];
      const similarity = calculateSimilarity(tool1, tool2);
      
      if (similarity >= threshold) {
        connections[tool1.name].push(tool2.name);
      }
    }
  }
  
  // Convert to Tool format
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const id = tool.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Determine category based on primary function
    let category = 'Other';
    if (tool.primaryFunction.toLowerCase().includes('biodiversity')) {
      category = 'Biodiversity';
    } else if (tool.primaryFunction.toLowerCase().includes('geospatial') || 
               tool.primaryFunction.toLowerCase().includes('data')) {
      category = 'Data';
    } else if (tool.sectorFocus.some(s => s.toLowerCase().includes('agriculture'))) {
      category = 'Agriculture';
    } else if (tool.primaryFunction.toLowerCase().includes('water')) {
      category = 'Water';
    } else if (tool.sectorFocus.some(s => s.toLowerCase().includes('finance'))) {
      category = 'Finance';
    }
    
    // Convert connections to IDs
    const connectionIds = connections[tool.name].map(name => 
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    );
    
    result.push({
      id,
      name: tool.name,
      category,
      relevance: 0.7, // Default relevance
      connections: connectionIds
    });
  }
  
  return result;
};