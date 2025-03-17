export interface Tool {
  id: string;
  name: string;
  category: string;
  relevance: number;
  connections: string[];
}

export interface Category {
  name: string;
  color: string;
}

export const categories: Category[] = [
  { name: 'Biodiversity', color: '#8BC34A' },
  { name: 'Agriculture', color: '#FF9800' },
  { name: 'Forestry', color: '#4CAF50' },
  { name: 'Data', color: '#2196F3' },
  { name: 'Marine', color: '#03A9F4' },
  { name: 'Water', color: '#00BCD4' },
  { name: 'Finance', color: '#4CAF50' },
  { name: 'Policy', color: '#2196F3' }
];

export const tools: Tool[] = [
  {
    id: 'nature-metrics',
    name: 'Nature Metrics',
    category: 'Data',
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
    category: 'Data',
    relevance: 0.85,
    connections: ['ocean-data-platform']
  },
  {
    id: 'ocean-data-platform',
    name: 'Ocean Data Platform',
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
    category: 'Data',
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