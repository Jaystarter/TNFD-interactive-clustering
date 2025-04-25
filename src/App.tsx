import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { ForceGraphContainer } from './components/ForceGraphContainer';
import { Tool, tools as defaultTools } from './data/tools';
import { FeatureWeights } from './utils/clusteringUtils';
import Papa from 'papaparse';

// Utility function to load CSV from different possible locations
const loadCSVFromPossibleLocations = async (): Promise<string> => {
  const possiblePaths = [
    '/TNFD Tools Prototype Data.csv',
    '/TNFD_Tools_Prototype_Data.csv',
    './TNFD Tools Prototype Data.csv',
    '../TNFD Tools Prototype Data.csv'
  ];

  for (const path of possiblePaths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const content = await response.text();
        console.log(`Successfully loaded CSV from ${path}`);
        return content;
      }
    } catch (err) {
      console.warn(`Failed to load from ${path}`);
    }
  }

  throw new Error('Could not load CSV file from any location');
};

import {
  ThemeProvider,
  createTheme,
  Box,
  Typography,
  Paper,
  Grid,
  Container,
  InputAdornment,
  TextField,
  IconButton,
  Divider,
  Tooltip,
  Chip,
  Collapse,
  Button,
  Modal,
  Card,
  CardContent,
  CardActions,
  Fade,
  Backdrop,
  List,
  ListItemText,
  ListItemButton,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  TuneRounded as TuneIcon,
  InfoOutlined as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
  Category as CategoryIcon,
  Source as SourceIcon
} from '@mui/icons-material';

// Import color palette
import { colorPalette } from './data/tools';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: colorPalette.darkGreen, // Dark green from palette
    },
    secondary: {
      main: colorPalette.mediumGreen, // Medium green from palette
    },
    background: {
      default: colorPalette.paleBlue, // Pale blue from palette
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          padding: '15px 0',
        },
        thumb: {
          height: 20,
          width: 20,
          backgroundColor: '#fff',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
          '&:focus, &:hover, &.Mui-active': {
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)',
          },
        },
        valueLabel: {
          backgroundColor: '#2e7d32',
        },
      },
    },
  },
});

// Web Worker runner for heavy processing
const runProcessInWorker = (
  csvContent: string,
  similarityThreshold: number,
  featureWeights: FeatureWeights
): Promise<Tool[]> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./workers/processWorker.ts', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = (e: MessageEvent) => {
      if (e.data.error) reject(e.data.error);
      else resolve(e.data.tools);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(e.message);
      worker.terminate();
    };
    worker.postMessage({ csvContent, similarityThreshold, featureWeights });
  });
};

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tools, setTools] = useState<Tool[]>(defaultTools);
  const [isLoading, setIsLoading] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [csvLoaded, setCsvLoaded] = useState(false);
  const [rawCsvData, setRawCsvData] = useState<string | null>(null);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [isNaturalLanguageSearch, setIsNaturalLanguageSearch] = useState(false);
  const [naturalLanguageResults, setNaturalLanguageResults] = useState<Tool[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  // Static high-level buckets for category filter
  const availableCategories = [
    'Sensors',
    'Supply Chain',
    'Analysis',
    'Visualization',
    'Open Data'
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Additional filter criteria
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);

  const [availableEnvironments, setAvailableEnvironments] = useState<string[]>([]);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);

  const [availableDataSources, setAvailableDataSources] = useState<string[]>([]);
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);

  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Filter panel state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Feature weights
  const [primaryFunctionWeight, setPrimaryFunctionWeight] = useState(0.3);
  const [dataSourcesWeight, setDataSourcesWeight] = useState(0.25);
  const [targetUserWeight, setTargetUserWeight] = useState(0.25);
  const [environmentTypeWeight, setEnvironmentTypeWeight] = useState(0.2);

  // Combine weights into an object
  const featureWeights = useMemo<FeatureWeights>(() => ({
    'Primary Function': primaryFunctionWeight,
    'Data Sources': dataSourcesWeight,
    'Target User/Client': targetUserWeight,
    'Environment Type': environmentTypeWeight
  }), [primaryFunctionWeight, dataSourcesWeight, targetUserWeight, environmentTypeWeight]);

  // Load CSV data only once on initial render
  useEffect(() => {
    const initialDataLoad = async () => {
      try {
        setIsLoading(true);

        // Attempt to load CSV (or use uploaded version)
        const savedCsv = localStorage.getItem('uploadedToolsCsv');
        const csvContent = savedCsv !== null
          ? savedCsv
          : await loadCSVFromPossibleLocations();
        setCsvLoaded(true);
        // Store the raw CSV data for later reuse
        setRawCsvData(csvContent);

        // Memoization: localStorage cache
        const cacheKey = 'toolsProcessingCache';
        let processedTools: Tool[] | undefined;
        const cacheRaw = localStorage.getItem(cacheKey);
        if (cacheRaw) {
          try {
            const cache = JSON.parse(cacheRaw);
            if (
              cache.csvContent === csvContent &&
              cache.similarityThreshold === similarityThreshold &&
              JSON.stringify(cache.featureWeights) === JSON.stringify(featureWeights)
            ) {
              processedTools = cache.tools;
            }
          } catch {}
        }
        if (!processedTools) {
          processedTools = await runProcessInWorker(
            csvContent,
            similarityThreshold,
            featureWeights
          );
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ csvContent, similarityThreshold, featureWeights, tools: processedTools })
          );
        }

        // If we have no processed tools, fall back to default
        if (!processedTools || processedTools.length === 0) {
          console.warn('No tools were processed from CSV, using default tools');
          setTools(defaultTools);
        } else {
          setTools(processedTools);
          setSelectedCategories([]); // Reset selected categories

          // Extract other filter options from the raw CSV data
          if (rawCsvData) {
            try {
              const parsedData = Papa.parse(rawCsvData, { header: true }).data as any[];

              // Extract unique values for each filter type
              const functions = Array.from(new Set(parsedData
                .map(row => row['Primary Function'])
                .filter(Boolean)
                .flatMap(val => val.split(';').map((v: string) => v.trim()))
              ));

              const environments = Array.from(new Set(parsedData
                .map(row => row['Environment Type'])
                .filter(Boolean)
                .flatMap(val => val.split(';').map((v: string) => v.trim()))
              ));

              const dataSources = Array.from(new Set(parsedData
                .map(row => row['Data Sources'])
                .filter(Boolean)
                .flatMap(val => val.split(';').map((v: string) => v.trim()))
              ));

              const users = Array.from(new Set(parsedData
                .map(row => row['Target User/Client'])
                .filter(Boolean)
                .flatMap(val => val.split(';').map((v: string) => v.trim()))
              ));

              // Set the available filter options
              setAvailableFunctions(functions);
              setAvailableEnvironments(environments);
              setAvailableDataSources(dataSources);
              setAvailableUsers(users);

              // Reset selected filters
              setSelectedFunctions([]);
              setSelectedEnvironments([]);
              setSelectedDataSources([]);
              setSelectedUsers([]);
            } catch (error) {
              console.error('Error parsing filter options:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading CSV data:', error);
        // Fall back to default tools if there's an error
        setTools(defaultTools);
      } finally {
        setIsLoading(false);
      }
    };

    initialDataLoad();
  }, []); // Empty dependency array means this only runs once on mount

  // Handle changes in weights or threshold using stored CSV data
  const handleWeightsChange = useCallback(async () => {
    try {
      setIsLoading(true);

      if (!csvLoaded || !rawCsvData) return;

      // Memoization: localStorage cache
      const cacheKey = 'toolsProcessingCache';
      let updatedTools: Tool[] | undefined;
      const cacheRaw = localStorage.getItem(cacheKey);
      if (cacheRaw) {
        try {
          const cache = JSON.parse(cacheRaw);
          if (
            cache.csvContent === rawCsvData &&
            cache.similarityThreshold === similarityThreshold &&
            JSON.stringify(cache.featureWeights) === JSON.stringify(featureWeights)
          ) {
            updatedTools = cache.tools;
          }
        } catch {}
      }
      if (!updatedTools) {
        updatedTools = await runProcessInWorker(
          rawCsvData,
          similarityThreshold,
          featureWeights
        );
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ csvContent: rawCsvData, similarityThreshold, featureWeights, tools: updatedTools })
        );
      }
      setTools(updatedTools!);
    } catch (error) {
      console.error('Error updating weights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [csvLoaded, rawCsvData, similarityThreshold, featureWeights]);

  // Run weight updates when feature weights change
  useEffect(() => {
    if (csvLoaded && rawCsvData) {
      // Fixed similarity threshold at 0.6
      setSimilarityThreshold(0.6); 
      handleWeightsChange();
    }
  }, [csvLoaded, rawCsvData, featureWeights, handleWeightsChange]);

  // Similarity threshold is now fixed at 0.6

  // Handle feature weight changes
  const handleFeatureWeightChange = useCallback((feature: string, newValue: number | number[]) => {
    const value = newValue as number;
    switch (feature) {
      case 'Primary Function':
        setPrimaryFunctionWeight(value);
        break;
      case 'Data Sources':
        setDataSourcesWeight(value);
        break;
      case 'Target User/Client':
        setTargetUserWeight(value);
        break;
      case 'Environment Type':
        setEnvironmentTypeWeight(value);
        break;
    }
  }, []);

  // Generic filter toggle handler
  const handleFilterToggle = (
    value: string,
    _selectedValues: string[], // Prefix with underscore to indicate it's not used
    setSelectedValues: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setSelectedValues(prev => {
      if (prev.includes(value)) {
        return prev.filter(v => v !== value);
      } else {
        return [...prev, value];
      }
    });
  };

  // Specific handlers for each filter type
  const handleCategoryToggle = (category: string) => {
    handleFilterToggle(category, selectedCategories, setSelectedCategories);
  };

  const handleFunctionToggle = (func: string) => {
    handleFilterToggle(func, selectedFunctions, setSelectedFunctions);
  };

  const handleEnvironmentToggle = (env: string) => {
    handleFilterToggle(env, selectedEnvironments, setSelectedEnvironments);
  };

  const handleDataSourceToggle = (source: string) => {
    handleFilterToggle(source, selectedDataSources, setSelectedDataSources);
  };

  const handleUserToggle = (user: string) => {
    handleFilterToggle(user, selectedUsers, setSelectedUsers);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedFunctions([]);
    setSelectedEnvironments([]);
    setSelectedDataSources([]);
    setSelectedUsers([]);
    setSearchTerm('');
    setIsNaturalLanguageSearch(false);
    setNaturalLanguageResults([]);
  };

  // Handle CSV file upload to replace the dataset
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const text = await file.text();
      localStorage.setItem('uploadedToolsCsv', text);
      setRawCsvData(text);
      setCsvLoaded(true);
      const processed = await runProcessInWorker(text, similarityThreshold, featureWeights);
      setTools(processed);
      // Parse CSV for filter options
      const parsedData = Papa.parse(text, { header: true }).data as any[];
      const funcs = Array.from(new Set(parsedData
        .map(row => row['Primary Function'])
        .filter(Boolean)
        .flatMap((val: string) => val.split(';').map(v => v.trim()))));
      const envs = Array.from(new Set(parsedData
        .map(row => row['Environment Type'])
        .filter(Boolean)
        .flatMap((val: string) => val.split(';').map(v => v.trim()))));
      const srcs = Array.from(new Set(parsedData
        .map(row => row['Data Sources'])
        .filter(Boolean)
        .flatMap((val: string) => val.split(';').map(v => v.trim()))));
      const usrs = Array.from(new Set(parsedData
        .map(row => row['Target User/Client'])
        .filter(Boolean)
        .flatMap((val: string) => val.split(';').map(v => v.trim()))));
      setAvailableFunctions(funcs);
      setAvailableEnvironments(envs);
      setAvailableDataSources(srcs);
      setAvailableUsers(usrs);
      clearAllFilters();
    } catch (err) {
      console.error('Error uploading CSV', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to default CSV (clears upload)
  const handleResetCsv = () => {
    localStorage.removeItem('uploadedToolsCsv');
    window.location.reload();
  };

  // Handle search focus events
  const handleSearchFocus = () => {
    setSearchFocused(true);
  };

  // Handle key down events for search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTerm.trim()) {
        handleNaturalLanguageSearch(searchTerm);
        setSearchFocused(false); // hide overlay when showing results
        setShowSearchResults(true);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
      setShowSearchResults(false);
    }
  };

  // Handle selecting a tool from search results
  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    setShowSearchResults(false);
    setSearchFocused(false);
  };

  // Close tool details and return to search
  const handleCloseToolDetails = () => {
    setSelectedTool(null);
  };

  // Handle natural language search
  const handleNaturalLanguageSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setIsNaturalLanguageSearch(true);
    setShowSearchResults(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/natural-language-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          tools
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process natural language search');
      }
      
      setNaturalLanguageResults(data.relevantTools);
    } catch (error) {
      console.error('Error with natural language search:', error);
      setIsNaturalLanguageSearch(false);
      // Fall back to keyword search if API call fails
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter tools based on all criteria
  const filteredTools = useMemo(() => {
    // Start with all tools
    let filtered = tools;
    
    // If we have natural language search results, prioritize those
    if (isNaturalLanguageSearch && naturalLanguageResults.length > 0 && searchTerm.trim()) {
      // We still need to apply other filters to the natural language results
      filtered = naturalLanguageResults;
    }
    // Otherwise apply standard keyword search filter
    else if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(lowerSearchTerm) ||
        tool.category.toLowerCase().includes(lowerSearchTerm) ||
        (tool.primaryFunction && tool.primaryFunction.toLowerCase().includes(lowerSearchTerm)) ||
        (tool.dataSources && tool.dataSources.toLowerCase().includes(lowerSearchTerm)) ||
        (tool.targetUser && tool.targetUser.toLowerCase().includes(lowerSearchTerm)) ||
        (tool.environmentType && tool.environmentType.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Get the raw CSV data for more detailed filtering
    if (rawCsvData) {
      try {
        const parsedData = Papa.parse(rawCsvData, { header: true }).data as any[];
        const toolMap = new Map(parsedData.map(row => [
          row['Tool Name']?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          row
        ]));

        // Apply high-level category filter on CSV Primary Function
        if (selectedCategories.length > 0 && selectedCategories.length < availableCategories.length) {
          // Only apply filtering if some but not all categories are selected
          const normalizedCats = selectedCategories.map(c => c.toLowerCase());
          filtered = filtered.filter(tool => {
            const csvTool = toolMap.get(tool.id);
            if (!csvTool) return false;

            // Get all relevant fields for categorization
            const primaryFunction = (csvTool['Primary Function'] || '').toLowerCase();
            const dataSources = (csvTool['Data Sources'] || '').toLowerCase();
            const description = (csvTool['Description'] || '').toLowerCase();
            const toolName = (csvTool['Tool Name'] || '').toLowerCase();
            const targetUser = (csvTool['Target User/Client'] || '').toLowerCase();
            const environmentType = (csvTool['Environment Type'] || '').toLowerCase();

            // Combine all text for more comprehensive matching
            const allText = `${primaryFunction} ${dataSources} ${description} ${toolName} ${targetUser} ${environmentType}`;

            // Check if the tool belongs to any of the selected categories
            let matchesCategory = false;

            if (normalizedCats.includes('sensors')) {
              matchesCategory = matchesCategory ||
                // Standard sensors and hardware
                allText.includes('sensor') ||
                allText.includes('camera') ||
                allText.includes('drone') ||
                allText.includes('satellite') ||
                allText.includes('hardware') ||
                allText.includes('field device') ||
                allText.includes('edna') ||
                allText.includes('monitoring') ||
                allText.includes('acoustic') ||
                // Data sources from sensors
                dataSources.includes('satellite imagery') ||
                dataSources.includes('wildlife cameras') ||
                dataSources.includes('acoustic sensors') ||
                primaryFunction.includes('monitoring') ||
                // Experimental hardware and citizen science (from Emerging Tech)
                allText.includes('prototype') && allText.includes('hardware') ||
                allText.includes('citizen science') && allText.includes('data collection') ||
                allText.includes('vr') && allText.includes('field') ||
                allText.includes('ar') && allText.includes('field');
            }

            if (normalizedCats.includes('data pipelines')) {
              // Focus on data connection, transformation, and integration
              matchesCategory = matchesCategory ||
                (primaryFunction.includes('data') && !primaryFunction.includes('data provision')) ||
                allText.includes('integration') ||
                allText.includes('pipeline') ||
                allText.includes('etl') ||
                allText.includes('excel') ||
                allText.includes('api') ||
                allText.includes('collection') ||
                allText.includes('accounting') ||
                primaryFunction.includes('footprinting') ||
                // Include private/internal databases but not public repositories
                (allText.includes('database') && !allText.includes('open') && !toolName.includes('gbif')) ||
                (allText.includes('repository') && !allText.includes('open access'));
            }

            if (normalizedCats.includes('analysis')) {
              matchesCategory = matchesCategory ||
                // Core analysis functions
                primaryFunction.includes('analysis') ||
                primaryFunction.includes('assessment') ||
                primaryFunction.includes('modeling') ||
                allText.includes('analytics') ||
                allText.includes('recognition') ||
                allText.includes('model') ||
                allText.includes('statistical') ||
                // AI and machine learning (previously in Emerging Tech)
                allText.includes('machine learning') ||
                allText.includes('ml') ||
                allText.includes('ai') ||
                allText.includes('artificial intelligence') ||
                toolName.includes('ai') ||
                // Assessment types
                primaryFunction.includes('risk assessment') ||
                primaryFunction.includes('impact assessment') ||
                primaryFunction.includes('status assessment') ||
                primaryFunction.includes('footprinting') ||
                // Advanced planning (previously in Emerging Tech)
                primaryFunction.includes('scenario planning') ||
                primaryFunction.includes('prioritization');
            }

            if (normalizedCats.includes('visualization')) {
              // Focus on visual presentation of data and reporting frameworks
              matchesCategory = matchesCategory ||
                // Visual elements
                allText.includes('visualization') ||
                allText.includes('dashboard') ||
                allText.includes('chart') ||
                allText.includes('map') ||
                allText.includes('display') ||
                // Reporting frameworks and outputs
                primaryFunction.includes('reporting') ||
                primaryFunction.includes('reporting framework') ||
                (primaryFunction.includes('framework') && allText.includes('report')) ||
                // Benchmarking and comparative tools
                primaryFunction.includes('benchmarking') ||
                primaryFunction.includes('rating') ||
                primaryFunction.includes('valuation') ||
                // KPIs and metrics
                allText.includes('kpi') ||
                (allText.includes('report') &&
                  (allText.includes('generator') ||
                   allText.includes('template') ||
                   allText.includes('dashboard')));
            }

            if (normalizedCats.includes('open data')) {
              // Focus specifically on open, public data repositories and research data
              matchesCategory = matchesCategory ||
                allText.includes('open data') ||
                allText.includes('gbif') ||
                allText.includes('obis') ||
                (allText.includes('research') && (allText.includes('data') || allText.includes('database'))) ||
                dataSources.includes('open') ||
                description.includes('open access') ||
                toolName.includes('gbif') ||
                toolName.includes('data platform') ||
                toolName.includes('data repository') ||
                primaryFunction.includes('data provision') ||
                primaryFunction.includes('knowledge database') ||
                primaryFunction.includes('knowledge sharing') ||
                // Specifically target public/open databases and repositories
                (allText.includes('database') && (allText.includes('open') || description.includes('public'))) ||
                (allText.includes('repository') && (allText.includes('open access') || description.includes('public')));
            }

            // Note: We've removed the 'Emerging Tech' category
            // Tools that would have been in that category are now distributed to other categories
            // through their existing matching logic

            return matchesCategory;
          });
        }

        // Apply primary function filter
        if (selectedFunctions.length > 0) {
          filtered = filtered.filter(tool => {
            const csvTool = toolMap.get(tool.id);
            if (!csvTool) return false;

            const functions = csvTool['Primary Function']?.split(';').map((f: string) => f.trim()) || [];
            return selectedFunctions.some(f => functions.includes(f));
          });
        }

        // Apply environment type filter
        if (selectedEnvironments.length > 0) {
          filtered = filtered.filter(tool => {
            const csvTool = toolMap.get(tool.id);
            if (!csvTool) return false;

            const environments = csvTool['Environment Type']?.split(';').map((e: string) => e.trim()) || [];
            return selectedEnvironments.some(e => environments.includes(e));
          });
        }

        // Apply data sources filter
        if (selectedDataSources.length > 0) {
          filtered = filtered.filter(tool => {
            const csvTool = toolMap.get(tool.id);
            if (!csvTool) return false;

            const sources = csvTool['Data Sources']?.split(';').map((s: string) => s.trim()) || [];
            return selectedDataSources.some(s => sources.includes(s));
          });
        }

        // Apply target user filter
        if (selectedUsers.length > 0) {
          filtered = filtered.filter(tool => {
            const csvTool = toolMap.get(tool.id);
            if (!csvTool) return false;

            const users = csvTool['Target User/Client']?.split(';').map((u: string) => u.trim()) || [];
            return selectedUsers.some(u => users.includes(u));
          });
        }
      } catch (error) {
        console.error('Error applying detailed filters:', error);
      }
    }

    return filtered;
  }, [tools, searchTerm, selectedCategories, selectedFunctions, selectedEnvironments,
      selectedDataSources, selectedUsers, rawCsvData, isNaturalLanguageSearch, naturalLanguageResults]);

  // Removed valuetext function as we no longer use sliders

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <Paper
          elevation={0}
          square
          sx={{
            p: 2,
            background: `linear-gradient(to right, ${colorPalette.darkGreen}, ${colorPalette.mediumGreen})`,
            color: 'white',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            position: 'relative',
            zIndex: 3
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* GitHub link bottom left */}
              <Box sx={{ position: 'fixed', bottom: 16, left: 16, zIndex: 1000 }}>
                <a
                  href="https://github.com/Jaystarter"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <svg height="18" width="18" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'black', opacity: 0.7 }}>
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.12 0 0 .67-.21 2.2.82A7.68 7.68 0 0 1 8 4.84c.68.003 1.36.092 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    <span style={{ color: 'black', fontSize: 13, opacity: 0.7 }}>GitHub</span>
                  </Box>
                </a>
              </Box>
              <Typography variant="h5" component="h1">
                TNFD Tools Relational Map
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', width: '40%' }}>
                <TextField
                  fullWidth
                  placeholder="Search for tools or categories..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsNaturalLanguageSearch(false);
                  }}
                  onFocus={handleSearchFocus}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconButton 
                    size="small" 
                    onClick={() => handleNaturalLanguageSearch(searchTerm)}
                    sx={{ p: 0 }}
                  >
                    <SearchIcon sx={{ color: 'rgba(255,255,255,0.8)' }} />
                  </IconButton>
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="clear search"
                          onClick={() => {
                    setSearchTerm('');
                    setIsNaturalLanguageSearch(false);
                    setNaturalLanguageResults([]);
                  }}
                          edge="end"
                          sx={{ color: 'rgba(255,255,255,0.8)' }}
                        >
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                    sx: {
                      bgcolor: 'rgba(255,255,255,0.15)',
                      borderRadius: 2,
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'transparent'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.5)'
                      },
                      '&::placeholder': {
                        color: 'rgba(255,255,255,0.7)',
                        opacity: 1
                      }
                    }
                  }}
                  sx={{ color: 'white' }}
                />
                {searchTerm && (
                  <Chip
                    label={isNaturalLanguageSearch 
                      ? `AI: ${filteredTools.length} matches` 
                      : `${filteredTools.length} found`}
                    size="small"
                    sx={{
                      ml: 1,
                      bgcolor: isNaturalLanguageSearch ? 'rgba(75,181,67,0.25)' : 'rgba(255,255,255,0.15)',
                      color: 'white'
                    }}
                  />
                )}
                <Button
                  variant="outlined"
                  component="label"
                  sx={{ ml: 2, color: 'white', borderColor: 'rgba(255,255,255,0.7)' }}
                >
                  Upload CSV
                  <input type="file" accept=".csv" hidden onChange={handleCsvUpload} />
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleResetCsv}
                  sx={{ ml: 1, color: 'white', borderColor: 'rgba(255,255,255,0.7)' }}
                >Reset CSV</Button>
              </Box>
            </Box>
          </Container>
        </Paper>

        <Container maxWidth="lg" sx={{
          mt: 2,
          mb: 1,
          position: 'relative',
          zIndex: 2,
          bgcolor: '#f5f5f5'
        }}>
          {/* Filter panel toggle */}
          <Paper
            elevation={2}
            sx={{
              mb: 2,
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              position: 'relative',
              zIndex: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Filters
              </Typography>
              <Chip
                label={`${filteredTools.length} tools`}
                size="small"
                sx={{ ml: 1, bgcolor: colorPalette.darkGreen, color: 'white' }}
              />

              {/* Show active filter count */}
              {(selectedCategories.length > 0 || selectedFunctions.length > 0 ||
                selectedEnvironments.length > 0 || selectedDataSources.length > 0 ||
                selectedUsers.length > 0) && (
                <Chip
                  label={`${selectedCategories.length + selectedFunctions.length +
                    selectedEnvironments.length + selectedDataSources.length +
                    selectedUsers.length} active filters`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>

            <Box>
              {/* Clear all filters button */}
              {(selectedCategories.length > 0 || selectedFunctions.length > 0 ||
                selectedEnvironments.length > 0 || selectedDataSources.length > 0 ||
                selectedUsers.length > 0 || searchTerm) && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={clearAllFilters}
                  startIcon={<ClearIcon />}
                  sx={{ mr: 1 }}
                >
                  Clear All
                </Button>
              )}

              {/* Expand/collapse filter panel */}
              <Button
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                endIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              >
                {filtersExpanded ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </Box>
          </Paper>

          {/* Expanded filter panel */}
          <Collapse in={filtersExpanded}>
            <Paper
              elevation={2}
              sx={{
                mb: 2,
                borderRadius: 2,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              {/* Category filters */}
              {availableCategories.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Categories
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        if (selectedCategories.length === availableCategories.length) {
                          // If all are selected, clear all
                          setSelectedCategories([]);
                        } else {
                          // Otherwise, select all
                          setSelectedCategories([...availableCategories]);
                        }
                      }}
                      sx={{ minWidth: 'auto', py: 0.5, px: 1 }}
                    >
                      {selectedCategories.length === availableCategories.length ? 'Clear All' : 'Select All'}
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableCategories.map(category => (
                      <Chip
                        key={category}
                        label={category}
                        onClick={() => handleCategoryToggle(category)}
                        color={selectedCategories.includes(category) ? "primary" : "default"}
                        variant={selectedCategories.includes(category) ? "filled" : "outlined"}
                        size="small"
                        sx={{
                          borderRadius: '16px',
                          '&.MuiChip-colorPrimary': {
                            backgroundColor: colorPalette.darkGreen
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Primary Function filters */}
              {availableFunctions.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Primary Functions
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableFunctions.map(func => (
                      <Chip
                        key={func}
                        label={func}
                        onClick={() => handleFunctionToggle(func)}
                        color={selectedFunctions.includes(func) ? "primary" : "default"}
                        variant={selectedFunctions.includes(func) ? "filled" : "outlined"}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Environment Type filters */}
              {availableEnvironments.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Environment Types
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableEnvironments.map(env => (
                      <Chip
                        key={env}
                        label={env}
                        onClick={() => handleEnvironmentToggle(env)}
                        color={selectedEnvironments.includes(env) ? "primary" : "default"}
                        variant={selectedEnvironments.includes(env) ? "filled" : "outlined"}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Data Sources filters */}
              {availableDataSources.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Data Sources
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableDataSources.map(source => (
                      <Chip
                        key={source}
                        label={source}
                        onClick={() => handleDataSourceToggle(source)}
                        color={selectedDataSources.includes(source) ? "primary" : "default"}
                        variant={selectedDataSources.includes(source) ? "filled" : "outlined"}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Target User filters */}
              {availableUsers.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Target Users
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableUsers.map(user => (
                      <Chip
                        key={user}
                        label={user}
                        onClick={() => handleUserToggle(user)}
                        color={selectedUsers.includes(user) ? "primary" : "default"}
                        variant={selectedUsers.includes(user) ? "filled" : "outlined"}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Collapse>

          <Paper
            className="controlsPaper"
            elevation={3}
            sx={{
              p: 2,
              mb: 2,
              position: 'relative',
              zIndex: 1
            }}
          >
            <Box sx={{
              mb: controlsExpanded ? 1 : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TuneIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  What is important to you?
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setControlsExpanded(!controlsExpanded)}
                  sx={{ ml: 1 }}
                  aria-label={controlsExpanded ? "Collapse controls" : "Expand controls"}
                >
                  {controlsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </Box>

            <Collapse in={controlsExpanded}>
              <Divider sx={{ mb: 1.5 }} />

              <Grid container spacing={1}>
                {/* Feature Weight Sliders in compact format */}
                <Grid item xs={6} sm={3}>
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      Primary Function: {primaryFunctionWeight.toFixed(2)}
                      <Tooltip title="Determines how much the tool's main functionality influences clustering" arrow>
                        <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                    <Box sx={{ display: 'flex', width: '225px', border: `2px solid ${colorPalette.darkGreen}`, borderRadius: '4px' }}>
                      {[0.1, 0.2, 0.3, 0.4, 0.5].map((value, index) => {
                        const isActive = primaryFunctionWeight >= value;
                        return (
                          <Box 
                            key={index}
                            onClick={() => handleFeatureWeightChange('Primary Function', value)}
                            sx={{
                              width: '45px',
                              height: '36px',
                              borderRight: index < 4 ? `1px solid ${colorPalette.darkGreen}` : 'none',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              cursor: 'pointer',
                              backgroundColor: isActive ? 'rgba(107, 144, 128, 0.1)' : 'transparent',
                              position: 'relative',
                              '&:hover': {
                                backgroundColor: 'rgba(107, 144, 128, 0.2)',
                              }
                            }}
                          >
                            {isActive && (
                              <Box sx={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}>
                                <Box sx={{ 
                                  width: '100%', 
                                  height: '100%',
                                  backgroundImage: 'linear-gradient(135deg, transparent 0%, transparent 40%, #6B9080 40%, #6B9080 60%, transparent 60%, transparent 100%)',
                                  backgroundSize: '8px 8px',
                                  opacity: 0.7
                                }} />
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      Data Sources: {dataSourcesWeight.toFixed(2)}
                      <Tooltip title="Affects how data collection methods impact tool grouping" arrow>
                        <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                    <Box sx={{ display: 'flex', width: '225px', border: `2px solid ${colorPalette.darkGreen}`, borderRadius: '4px' }}>
                      {[0.1, 0.2, 0.3, 0.4, 0.5].map((value, index) => {
                        const isActive = dataSourcesWeight >= value;
                        return (
                          <Box 
                            key={index}
                            onClick={() => handleFeatureWeightChange('Data Sources', value)}
                            sx={{
                              width: '45px',
                              height: '36px',
                              borderRight: index < 4 ? `1px solid ${colorPalette.darkGreen}` : 'none',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              cursor: 'pointer',
                              backgroundColor: isActive ? 'rgba(107, 144, 128, 0.1)' : 'transparent',
                              position: 'relative',
                              '&:hover': {
                                backgroundColor: 'rgba(107, 144, 128, 0.2)',
                              }
                            }}
                          >
                            {isActive && (
                              <Box sx={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}>
                                <Box sx={{ 
                                  width: '100%', 
                                  height: '100%',
                                  backgroundImage: 'linear-gradient(135deg, transparent 0%, transparent 40%, #6B9080 40%, #6B9080 60%, transparent 60%, transparent 100%)',
                                  backgroundSize: '8px 8px',
                                  opacity: 0.7
                                }} />
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      Target User: {targetUserWeight.toFixed(2)}
                      <Tooltip title="Controls how the intended audience affects tool relationships" arrow>
                        <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                    <Box sx={{ display: 'flex', width: '225px', border: `2px solid ${colorPalette.darkGreen}`, borderRadius: '4px' }}>
                      {[0.1, 0.2, 0.3, 0.4, 0.5].map((value, index) => {
                        const isActive = targetUserWeight >= value;
                        return (
                          <Box 
                            key={index}
                            onClick={() => handleFeatureWeightChange('Target User/Client', value)}
                            sx={{
                              width: '45px',
                              height: '36px',
                              borderRight: index < 4 ? `1px solid ${colorPalette.darkGreen}` : 'none',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              cursor: 'pointer',
                              backgroundColor: isActive ? 'rgba(107, 144, 128, 0.1)' : 'transparent',
                              position: 'relative',
                              '&:hover': {
                                backgroundColor: 'rgba(107, 144, 128, 0.2)',
                              }
                            }}
                          >
                            {isActive && (
                              <Box sx={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}>
                                <Box sx={{ 
                                  width: '100%', 
                                  height: '100%',
                                  backgroundImage: 'linear-gradient(135deg, transparent 0%, transparent 40%, #6B9080 40%, #6B9080 60%, transparent 60%, transparent 100%)',
                                  backgroundSize: '8px 8px',
                                  opacity: 0.7
                                }} />
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      Environment Type: {environmentTypeWeight.toFixed(2)}
                      <Tooltip title="Influences how environmental context affects tool similarity" arrow>
                        <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                    <Box sx={{ display: 'flex', width: '225px', border: `2px solid ${colorPalette.darkGreen}`, borderRadius: '4px' }}>
                      {[0.1, 0.2, 0.3, 0.4, 0.5].map((value, index) => {
                        const isActive = environmentTypeWeight >= value;
                        return (
                          <Box 
                            key={index}
                            onClick={() => handleFeatureWeightChange('Environment Type', value)}
                            sx={{
                              width: '45px',
                              height: '36px',
                              borderRight: index < 4 ? `1px solid ${colorPalette.darkGreen}` : 'none',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              cursor: 'pointer',
                              backgroundColor: isActive ? 'rgba(107, 144, 128, 0.1)' : 'transparent',
                              position: 'relative',
                              '&:hover': {
                                backgroundColor: 'rgba(107, 144, 128, 0.2)',
                              }
                            }}
                          >
                            {isActive && (
                              <Box sx={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}>
                                <Box sx={{ 
                                  width: '100%', 
                                  height: '100%',
                                  backgroundImage: 'linear-gradient(135deg, transparent 0%, transparent 40%, #6B9080 40%, #6B9080 60%, transparent 60%, transparent 100%)',
                                  backgroundSize: '8px 8px',
                                  opacity: 0.7
                                }} />
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Collapse>
          </Paper>
        </Container>

        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: controlsExpanded ? 'calc(100vh - 230px)' : 'calc(100vh - 180px)',
              flexDirection: 'column'
            }}
          >
            <Box className="loading-indicator" />
            <Typography variant="body2" color="text.secondary">
              Processing tool relationships...
            </Typography>
          </Box>
        ) : (
          <div className="graph-container" style={{ height: controlsExpanded ? 'calc(100vh - 230px)' : 'calc(100vh - 180px)' }}>
            <ForceGraphContainer
              controlsExpanded={controlsExpanded}
              toolsData={filteredTools}
            />

            {/* Search Overlay TextField */}
            <Fade in={searchFocused && !showSearchResults}>
              <Box
                sx={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%',
                  maxWidth: '800px',
                  zIndex: 1400,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Describe what you're looking for..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsNaturalLanguageSearch(false);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                  variant="outlined"
                  size="medium"
                />
              </Box>
            </Fade>

            {/* Backdrop remains */}
            <Backdrop
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(6px)',
                zIndex: 1100,
                transition: 'all 0.3s ease-in-out',
              }}
              open={searchFocused || showSearchResults}
              onClick={() => {
                if (!showSearchResults) {
                  setSearchFocused(false);
                }
              }}
            />
            
            {/* Search Results Modal */}
            <Fade in={showSearchResults}>
              <Box
                sx={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%',
                  maxWidth: '800px',
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  boxShadow: 24,
                  p: 2,
                  zIndex: 1300,
                  overflow: 'auto',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {isNaturalLanguageSearch ? 'AI Search Results' : 'Search Results'}
                  </Typography>
                  <IconButton onClick={() => setShowSearchResults(false)}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : filteredTools.length > 0 ? (
                  <List>
                    {filteredTools.map((tool) => (
                      <ListItemButton 
                        key={tool.id}
                        onClick={() => handleToolSelect(tool)}
                        sx={{
                          mb: 1,
                          borderRadius: 1,
                          '&:hover': {
                            bgcolor: 'rgba(46, 125, 50, 0.08)',
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>{tool.name}</Typography>
                              <Chip 
                                size="small" 
                                label={tool.category} 
                                sx={{ 
                                  bgcolor: colorPalette.mediumGreen,
                                  color: 'white',
                                  fontWeight: 500,
                                  fontSize: '0.75rem',
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              {tool.primaryFunction && (
                                <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', mb: 0.5 }}>
                                  <CategoryIcon sx={{ fontSize: '0.875rem', mr: 0.5, opacity: 0.7 }} />
                                  <span>{tool.primaryFunction}</span>
                                </Box>
                              )}
                              {tool.dataSources && (
                                <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', mb: 0.5 }}>
                                  <SourceIcon sx={{ fontSize: '0.875rem', mr: 0.5, opacity: 0.7 }} />
                                  <span>{tool.dataSources}</span>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                      No tools match your search criteria
                    </Typography>
                  </Box>
                )}
              </Box>
            </Fade>
            
            {/* Tool Details Modal */}
            <Modal
              open={selectedTool !== null}
              onClose={handleCloseToolDetails}
              aria-labelledby="tool-details-title"
            >
              <Fade in={selectedTool !== null}>
                <Box
                  sx={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    maxWidth: '800px',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 24,
                    p: 0,
                    maxHeight: '80vh',
                    overflow: 'auto',
                  }}
                >
                  {selectedTool && (
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Typography variant="h5" component="h2">
                            {selectedTool.name}
                          </Typography>
                          <Chip 
                            label={selectedTool.category} 
                            sx={{ 
                              bgcolor: colorPalette.mediumGreen,
                              color: 'white',
                              fontWeight: 500,
                            }}
                          />
                        </Box>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        {selectedTool.primaryFunction && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                              Primary Function
                            </Typography>
                            <Typography variant="body1">{selectedTool.primaryFunction}</Typography>
                          </Box>
                        )}
                        
                        {selectedTool.dataSources && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                              Data Sources
                            </Typography>
                            <Typography variant="body1">{selectedTool.dataSources}</Typography>
                          </Box>
                        )}
                        
                        {selectedTool.targetUser && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                              Target Users
                            </Typography>
                            <Typography variant="body1">{selectedTool.targetUser}</Typography>
                          </Box>
                        )}
                        
                        {selectedTool.environmentType && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                              Environment Type
                            </Typography>
                            <Typography variant="body1">{selectedTool.environmentType}</Typography>
                          </Box>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button onClick={handleCloseToolDetails}>
                          Close
                        </Button>
                      </CardActions>
                    </Card>
                  )}
                </Box>
              </Fade>
            </Modal>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
