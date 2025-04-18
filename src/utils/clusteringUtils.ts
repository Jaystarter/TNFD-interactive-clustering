import Papa from 'papaparse';
import { Tool } from '../data/tools';

interface ToolData {
  'Tool Name': string;
  'Primary Function': string;
  'Data Sources': string;
  'Target User/Client': string;
  'Environment Type': string;
  'Description': string;
  id?: string; // Generated from tool name
}

// Interface for feature weights
export interface FeatureWeights {
  'Primary Function': number;
  'Data Sources': number;
  'Target User/Client': number;
  'Environment Type': number;
}

// Text processing utilities
export function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2); // Filter out short words
}

// Jaccard index for text data
export function jaccardIndex(tokens1: string[], tokens2: string[]): number {
  // Create sets of unique tokens
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  // Calculate intersection size
  const intersection = new Set([...set1].filter(x => set2.has(x)));

  // Calculate union size
  const union = new Set([...set1, ...set2]);

  // Return Jaccard index (intersection size / union size)
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Jaccard index for categorical data
export function jaccardIndexForCategories(set1: string[], set2: string[]): number {
  const set1Clean = set1.map(s => s.trim().toLowerCase());
  const set2Clean = set2.map(s => s.trim().toLowerCase());

  // Create sets
  const set1Set = new Set(set1Clean);
  const set2Set = new Set(set2Clean);

  // Calculate intersection size
  const intersection = new Set([...set1Set].filter(x => set2Set.has(x)));

  // Calculate union size
  const union = new Set([...set1Set, ...set2Set]);

  // Return Jaccard index
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Calculate similarity between two tools using Jaccard index
// Jaccard index is more appropriate for categorical data as it measures the similarity
// between sets as the size of their intersection divided by the size of their union
export function calculateToolSimilarity(
  tool1: ToolData,
  tool2: ToolData,
  weights: FeatureWeights = {
    'Primary Function': 0.3,
    'Data Sources': 0.25,
    'Target User/Client': 0.25,
    'Environment Type': 0.2
  }
): number {
  // Key features to compare
  const features = [
    {name: 'Data Sources', weight: weights['Data Sources']},
    {name: 'Primary Function', weight: weights['Primary Function']},
    {name: 'Target User/Client', weight: weights['Target User/Client']},
    {name: 'Environment Type', weight: weights['Environment Type']}
  ];

  let similarity = 0;
  let totalWeight = 0;

  features.forEach(feature => {
    const field1 = tool1[feature.name as keyof ToolData] || '';
    const field2 = tool2[feature.name as keyof ToolData] || '';

    // Skip if either field contains 'biodiversity' (case insensitive)
    const field1Lower = field1.toString().toLowerCase();
    const field2Lower = field2.toString().toLowerCase();

    // Skip biodiversity as a grouping factor
    if (field1Lower.includes('biodiversity') && field2Lower.includes('biodiversity')) {
      // Don't add to similarity or totalWeight if both contain biodiversity
      return;
    }

    totalWeight += feature.weight;

    // For text fields with longer descriptions, use Jaccard index
    if (feature.name === 'Primary Function') {
      // Filter out 'biodiversity' tokens
      const tokens1 = tokenize(field1.toString()).filter(token => token !== 'biodiversity');
      const tokens2 = tokenize(field2.toString()).filter(token => token !== 'biodiversity');

      similarity += feature.weight * jaccardIndex(tokens1, tokens2);
    } else {
      // For categorical fields, use Jaccard index but filter out biodiversity
      const set1 = field1.toString().split(',').map(s => s.trim().toLowerCase()).filter(s => s !== 'biodiversity');
      const set2 = field2.toString().split(',').map(s => s.trim().toLowerCase()).filter(s => s !== 'biodiversity');

      similarity += feature.weight * jaccardIndexForCategories(set1, set2);
    }
  });

  // Normalize the similarity if weights don't sum to 1
  return totalWeight > 0 ? similarity / totalWeight : 0;
}

// Calculate a distance matrix for all tools (1 - similarity)
export function calculateDistanceMatrix(
  tools: ToolData[],
  weights?: FeatureWeights
): number[][] {
  const n = tools.length;
  const distanceMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const similarity = calculateToolSimilarity(tools[i], tools[j], weights);
      // Convert similarity to distance (1 - similarity)
      const distance = 1 - similarity;
      distanceMatrix[i][j] = distance;
      distanceMatrix[j][i] = distance; // Distance matrix is symmetric
    }
  }

  return distanceMatrix;
}

// Hierarchical clustering with average linkage
export function performAgglomerativeClustering(distanceMatrix: number[][], labels: string[]): any[] {
  const n = distanceMatrix.length;
  let clusters: any[] = labels.map((label, i) => ({
    id: i,
    name: label,
    children: [],
    height: 0,
    isLeaf: true
  }));

  let currentDistanceMatrix = [...distanceMatrix.map(row => [...row])];

  // Merge clusters until only one remains
  while (clusters.length > 1) {
    // Find the two closest clusters
    let minDistance = Infinity;
    let minI = -1;
    let minJ = -1;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (currentDistanceMatrix[clusters[i].id][clusters[j].id] < minDistance) {
          minDistance = currentDistanceMatrix[clusters[i].id][clusters[j].id];
          minI = i;
          minJ = j;
        }
      }
    }

    // Create a new cluster by merging the two closest
    const newCluster = {
      id: n + clusters.length - 1, // New unique ID
      name: `Cluster ${clusters.length - 1}`,
      children: [clusters[minI], clusters[minJ]],
      height: minDistance,
      isLeaf: false
    };

    // Remove the merged clusters and add the new one
    const newClusters = clusters.filter((_, i) => i !== minI && i !== minJ);
    newClusters.push(newCluster);

    clusters = newClusters;
  }

  return clusters;
}

// Parse CSV file to get tool data
export async function parseToolsCSV(csvFile: string): Promise<ToolData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvFile, {
      header: true,
      complete: results => {
        const toolsData = results.data as ToolData[];
        // Add IDs based on tool names
        toolsData.forEach(tool => {
          if (tool['Tool Name']) {
            tool.id = tool['Tool Name']
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, '');
          } else {
            // Use a default ID if tool name is missing
            tool.id = `unknown-tool-${Math.random().toString(36).substring(2, 9)}`;
          }
        });
        resolve(toolsData);
      },
      error: (error: Error) => reject(error)
    });
  });
}

// Generate tool connections based on clustering and a similarity threshold
export function generateToolConnections(toolsData: ToolData[], distanceMatrix: number[][],
  similarityThreshold: number = 0.7): Record<string, string[]> {

  const connections: Record<string, string[]> = {};

  // Initialize empty connections array for each tool
  toolsData.forEach(tool => {
    connections[tool.id!] = [];
  });

  // For each pair of tools
  for (let i = 0; i < toolsData.length; i++) {
    for (let j = i + 1; j < toolsData.length; j++) {
      // Distance to similarity (invert the distance)
      const similarity = 1 - distanceMatrix[i][j];

      // If similarity is above threshold, create a connection
      if (similarity >= similarityThreshold) {
        const tool1 = toolsData[i];
        const tool2 = toolsData[j];

        connections[tool1.id!].push(tool2.id!);
        connections[tool2.id!].push(tool1.id!);
      }
    }
  }

  return connections;
}

// Main function to process the CSV and generate a tools array with connections
export async function processToolsData(
  csvContent: string,
  similarityThreshold: number = 0.7,
  featureWeights?: FeatureWeights
): Promise<Tool[]> {
  try {
    // Parse the CSV
    const toolsData = await parseToolsCSV(csvContent);

    // Calculate the distance matrix
    const distanceMatrix = calculateDistanceMatrix(toolsData, featureWeights);

    // Generate connections based on similarity
    const connections = generateToolConnections(toolsData, distanceMatrix, similarityThreshold);

    // Create Tool objects as defined in tools.ts
    const toolsWithConnections: Tool[] = toolsData.map(toolData => {
      // Ensure we have a valid ID
      const id = toolData.id || `unknown-tool-${Math.random().toString(36).substring(2, 9)}`;

      // Use multiple fields for comprehensive categorization
      const environmentType = toolData['Environment Type'] || 'Multiple';
      const primaryFunction = toolData['Primary Function'] || '';
      const targetUser = toolData['Target User/Client'] || '';
      const dataSources = toolData['Data Sources'] || '';
      const description = toolData['Description'] || '';
      const toolName = toolData['Tool Name'] || '';

      // Combine all text fields for better categorization
      const allText = `${primaryFunction} ${targetUser} ${dataSources} ${description} ${toolName}`;
      const allTextLower = allText.toLowerCase();

      // Determine category based on comprehensive text analysis
      let category = 'Other'; // Start with Other, then try to find a better match

      // Financial tools
      if (allTextLower.includes('financ') ||
          allTextLower.includes('invest') ||
          allTextLower.includes('fund') ||
          allTextLower.includes('capital') ||
          allTextLower.includes('monetary') ||
          allTextLower.includes('economic') ||
          allTextLower.includes('budget') ||
          allTextLower.includes('cost') ||
          allTextLower.includes('profit')) {
        category = 'Finance & Investment';
      }
      // Assessment tools
      else if (allTextLower.includes('assess') ||
               allTextLower.includes('evaluat') ||
               allTextLower.includes('measur') ||
               allTextLower.includes('metric') ||
               allTextLower.includes('benchmark') ||
               allTextLower.includes('indicator') ||
               allTextLower.includes('score') ||
               allTextLower.includes('rating') ||
               allTextLower.includes('footprint') ||
               allTextLower.includes('impact')) {
        category = 'Assessment & Measurement';
      }
      // Data tools
      else if (allTextLower.includes('data') ||
               allTextLower.includes('monitor') ||
               allTextLower.includes('report') ||
               allTextLower.includes('collect') ||
               allTextLower.includes('database') ||
               allTextLower.includes('analytics') ||
               allTextLower.includes('information') ||
               allTextLower.includes('track') ||
               allTextLower.includes('survey') ||
               allTextLower.includes('inventory')) {
        category = 'Data & Monitoring';
      }
      // Planning tools
      else if (allTextLower.includes('plan') ||
               allTextLower.includes('strateg') ||
               allTextLower.includes('manag') ||
               allTextLower.includes('decision') ||
               allTextLower.includes('framework') ||
               allTextLower.includes('roadmap') ||
               allTextLower.includes('implement') ||
               allTextLower.includes('action') ||
               allTextLower.includes('develop')) {
        category = 'Planning & Strategy';
      }
      // Policy tools
      else if (allTextLower.includes('policy') ||
               allTextLower.includes('regulat') ||
               allTextLower.includes('govern') ||
               allTextLower.includes('compliance') ||
               allTextLower.includes('standard') ||
               allTextLower.includes('law') ||
               allTextLower.includes('legal') ||
               allTextLower.includes('legislat')) {
        category = 'Policy & Governance';
      }
      // Education tools
      else if (allTextLower.includes('educat') ||
               allTextLower.includes('train') ||
               allTextLower.includes('guid') ||
               allTextLower.includes('learn') ||
               allTextLower.includes('teach') ||
               allTextLower.includes('instruct') ||
               allTextLower.includes('knowledge') ||
               allTextLower.includes('resource') ||
               allTextLower.includes('toolkit')) {
        category = 'Education & Guidance';
      }
      // Environment-specific tools (if not already categorized)
      else if (environmentType.includes('Marine') ||
               allTextLower.includes('marine') ||
               allTextLower.includes('ocean') ||
               allTextLower.includes('sea') ||
               allTextLower.includes('coastal') ||
               allTextLower.includes('fish')) {
        category = 'Marine Ecosystems';
      }
      else if (environmentType.includes('Freshwater') ||
               allTextLower.includes('freshwater') ||
               allTextLower.includes('water') ||
               allTextLower.includes('river') ||
               allTextLower.includes('lake') ||
               allTextLower.includes('aquatic') ||
               allTextLower.includes('wetland')) {
        category = 'Freshwater Resources';
      }
      else if (environmentType.includes('Terrestrial') ||
               environmentType.includes('Forests') ||
               allTextLower.includes('forest') ||
               allTextLower.includes('terrestrial') ||
               allTextLower.includes('land') ||
               allTextLower.includes('soil') ||
               allTextLower.includes('tree')) {
        category = 'Terrestrial & Forests';
      }
      else if (environmentType.includes('Agricultural') ||
               allTextLower.includes('agricultur') ||
               allTextLower.includes('farm') ||
               allTextLower.includes('crop') ||
               allTextLower.includes('livestock') ||
               allTextLower.includes('food')) {
        category = 'Agriculture & Land Use';
      }

      // Special case handling for tools that should remain as "Other"
      // These are tools that are truly unique or don't fit well in other categories
      if (category === 'Other') {
        // Check if it might actually be an assessment tool (most common category)
        if (allTextLower.includes('biodiversity') &&
            (allTextLower.includes('assess') ||
             allTextLower.includes('measur') ||
             allTextLower.includes('evaluat'))) {
          category = 'Assessment & Measurement';
        }

        // Check for specific unique tools that should remain as Other
        const uniqueTools = [
          'blockchain', 'ai', 'artificial intelligence', 'machine learning',
          'certification', 'labeling', 'virtual reality', 'augmented reality',
          'simulation', 'game', 'offset', 'credit', 'compensation'
        ];

        // If it contains biodiversity keywords but none of the unique keywords,
        // it's probably an assessment tool
        if (!uniqueTools.some(term => allTextLower.includes(term)) &&
            category === 'Other') {
          category = 'Assessment & Measurement';
        }
      }

      return {
        id,
        name: toolData['Tool Name'] || `Unknown Tool ${id}`,
        category,
        relevance: 0.75, // Default relevance, could be calculated based on data
        connections: connections[id] || []
      };
    });

    return toolsWithConnections;
  } catch (error: unknown) {
    console.error('Error processing tools data:', error);
    throw error;
  }
}
