export interface Tool {
  id: string;
  name: string;
  category: string;
  relevance: number;
  connections: string[];
  // Additional properties that might be present from CSV data
  primaryFunction?: string;
  dataSources?: string;
  targetUser?: string;
  environmentType?: string;
  description?: string;
  tnfdLink?: string;
}

export interface Category {
  name: string;
  color: string;
}

export const categories: Category[] = [
  { name: 'Finance & Investment', color: '#6B9080' },
  { name: 'Assessment & Measurement', color: '#6B9080' },
  { name: 'Data & Monitoring', color: '#6B9080' },
  { name: 'Planning & Strategy', color: '#6B9080' },
  { name: 'Policy & Governance', color: '#6B9080' },
  { name: 'Education & Guidance', color: '#6B9080' },
  { name: 'Marine Ecosystems', color: '#6B9080' },
  { name: 'Freshwater Resources', color: '#6B9080' },
  { name: 'Terrestrial & Forests', color: '#6B9080' },
  { name: 'Agriculture & Land Use', color: '#6B9080' },
  { name: 'Other', color: '#6B9080' }
];

// Color palette from the provided image
export const colorPalette = {
  darkGreen: '#6B9080',
  mediumGreen: '#A4C3B2',
  lightGreen: '#CCE3DE',
  paleBlue: '#EAF4F4',
  paleGreen: '#F6FFF8'
};

export const tools: Tool[] = [
  {
    id: 'nature-metrics',
    name: 'Nature Metrics',
    category: 'Supply Chain',
    relevance: 0.8,
    connections: ['supplier-biodiversity']
  },
  {
    id: 'supplier-biodiversity',
    name: 'Supplier Biodiversity Assessment',
    category: 'Biodiversity',
    relevance: 0.7,
    connections: ['true-forests']
  },
  {
    id: 'true-forests',
    name: 'True Forests',
    category: 'Forestry',
    relevance: 0.75,
    connections: ['beef-nt-track']
  },
  {
    id: 'beef-nt-track',
    name: 'Beef NT Track',
    category: 'Agriculture',
    relevance: 0.65,
    connections: []
  },
  {
    id: 'kyros',
    name: 'Kyros',
    category: 'Supply Chain',
    relevance: 0.85,
    connections: ['ocean-data-platform']
  },
  {
    id: 'ocean-data-platform',
    name: 'Ocean Supply Chain Platform',
    category: 'Marine',
    relevance: 0.9,
    connections: ['carbon-risk-index']
  },
  {
    id: 'carbon-risk-index',
    name: 'Carbon Risk Index',
    category: 'Agriculture',
    relevance: 0.8,
    connections: []
  },
  {
    id: 'living-planet',
    name: 'Living Planet Index',
    category: 'Supply Chain',
    relevance: 0.95,
    connections: ['wbcsd-biodiversity']
  },
  {
    id: 'wbcsd-biodiversity',
    name: 'WBCSD Biodiversity Risk Filter',
    category: 'Biodiversity',
    relevance: 0.85,
    connections: ['wbcsd-ai']
  },
  {
    id: 'wbcsd-ai',
    name: 'WBCSD AI',
    category: 'Biodiversity',
    relevance: 0.7,
    connections: ['agribond']
  },
  {
    id: 'agribond',
    name: 'AgriBond',
    category: 'Agriculture',
    relevance: 0.75,
    connections: ['agcap']
  },
  {
    id: 'agcap',
    name: 'AgCap',
    category: 'Agriculture',
    relevance: 0.7,
    connections: []
  }
];