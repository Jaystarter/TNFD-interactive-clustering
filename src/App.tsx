import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './App.css';
import { ForceGraphContainer } from './components/ForceGraphContainer';
import { Tool, tools as defaultTools } from './data/tools';
import { FeatureWeights } from './utils/clusteringUtils';
import Papa from 'papaparse';
import type { FormEvent } from 'react';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Slide from '@mui/material/Slide';
import {
  ThemeProvider,
  createTheme,
  Box,
  Typography,
  Paper,
  Grid,
  Container,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Fade,
  Backdrop,
  List,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Tabs,
  Tab,
  Slider,
  Collapse,
  AppBar,
  Toolbar,
  InputBase,
  TextField,
} from '@mui/material';
import {
  Search as SearchIcon,
  InfoOutlined as InfoIcon,
  Close as CloseIcon,
  Category as CategoryIcon,
  Source as SourceIcon
} from '@mui/icons-material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import GitHubIcon from '@mui/icons-material/GitHub';

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

// Remote processing via Netlify Function
const processViaFunction = async (
  csvContent: string,
  similarityThreshold: number,
  featureWeights: FeatureWeights
): Promise<Tool[]> => {
  console.log("PROCESS VIA FUNCTION: Entered function.");
  try {
    console.log("PROCESS VIA FUNCTION: Making fetch POST request...");
    const response = await fetch('/.netlify/functions/process-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent, similarityThreshold, featureWeights })
    });
    console.log("PROCESS VIA FUNCTION: Fetch response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response body');
      console.error("PROCESS VIA FUNCTION: Fetch failed!", response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log("PROCESS VIA FUNCTION: Fetch successful, returning tools.");
    return data.tools as Tool[];
  } catch (e) {
    console.error('PROCESS VIA FUNCTION: Error during fetch/processing:', e);
    throw e; // don't fallback to worker
  }
};

// runProcessInWorker has been removed temporarily to enforce backend usage

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tools, setTools] = useState<Tool[]>(defaultTools);
  const [isLoading, setIsLoading] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [csvLoaded, setCsvLoaded] = useState(false);
  const [rawCsvData, setRawCsvData] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [isNaturalLanguageSearch, setIsNaturalLanguageSearch] = useState(false);
  const [naturalLanguageResults, setNaturalLanguageResults] = useState<Tool[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

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
      console.log("INITIAL LOAD: Starting...");
      setIsLoading(true);
      try {
        // Attempt to load CSV (or use uploaded version)
        const savedCsv = localStorage.getItem('uploadedToolsCsv');
        const csvContent = savedCsv !== null
          ? savedCsv
          : await loadCSVFromPossibleLocations();
        console.log("INITIAL LOAD: Successfully fetched default CSV.");
        setRawCsvData(csvContent); // Store raw CSV data

        // Process the data using the backend function
        console.log("INITIAL LOAD: Attempting to call processViaFunction...");
        const processedTools = await processViaFunction(
          csvContent,
          similarityThreshold,
          featureWeights
        );
        console.log("INITIAL LOAD: processViaFunction returned successfully.");
        setTools(processedTools); // Set the tools state with processed data
        setCsvLoaded(true); // Mark CSV as loaded

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
      } catch (error) {
        console.error('INITIAL LOAD: Error during initial data load or processing:', error);
        console.log("INITIAL LOAD: Falling back to defaultTools due to error.");
        setTools(defaultTools);
      } finally {
        console.log("INITIAL LOAD: Finished.");
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
        updatedTools = await processViaFunction(
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
      const processed = await processViaFunction(text, similarityThreshold, featureWeights);
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

  // Handle key down events for search (only Escape)
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchFocused(false);
      setShowSearchResults(false);
    }
  };

  // Handle selecting a tool from search results
  const handleToolSelect = (_tool: Tool) => {
    // setSelectedTool(tool); // Removed - No details modal anymore
    // Action when tool is selected (e.g., center map?)
    setShowSearchResults(false);
    setSearchFocused(false);
  };

  // Handle natural language search
  const handleNaturalLanguageSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setIsNaturalLanguageSearch(true);
    setShowSearchResults(true);
    
    try {
      // Update the fetch URL to the Netlify function endpoint (relative path)
      const response = await fetch('/.netlify/functions/api/natural-language-search', {
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

        // Extract unique values for each filter type
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

  const [controlsExpanded, setControlsExpanded] = useState(false);
  const centerSearchRef = useRef<HTMLInputElement>(null);

  // Effect to autofocus center search
  useEffect(() => {
    if (searchFocused && centerSearchRef.current) {
      centerSearchRef.current.focus();
    }
  }, [searchFocused]);

  // Handle clearing the search
  const handleClearSearch = () => {
    setSearchTerm('');
    setShowSearchResults(false);
    setSearchFocused(false);
    setIsNaturalLanguageSearch(false);
    setNaturalLanguageResults([]);
    // Optionally reset filters as well if desired
    // clearAllFilters();
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar position="static" elevation={0} sx={{ background: `linear-gradient(to right, ${colorPalette.darkGreen}, ${colorPalette.mediumGreen})`, minHeight:48, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar variant="dense" disableGutters sx={{ px:2, height:48, alignItems:'center' }}>
            <IconButton component="a" href="https://github.com/Jaystarter" target="_blank" color="inherit" sx={{ mr:2 }}><GitHubIcon fontSize="small"/></IconButton>
            <Typography variant="h6" sx={{ flexGrow:1, fontWeight:600, color:'white' }}>TNFD Tools Relational Map</Typography>
            <Box component="form" onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (searchTerm.trim()) {
                handleNaturalLanguageSearch(searchTerm);
                setSearchFocused(false); // hide overlay when showing results
                setShowSearchResults(true);
              }
            }} sx={{ display: 'flex', alignItems: 'center', bgcolor: 'white', color: colorPalette.darkGreen, borderRadius: 1, pl: 1, pr: 0.5, mr: 1, width: { xs: '100%', sm: 250, md: 300 } }}>
              <InputBase
                placeholder="Search tools..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setIsNaturalLanguageSearch(false); }}
                onFocus={handleSearchFocus}
                onKeyDown={handleSearchKeyDown}
                sx={{ color: 'inherit', ml: 1, flex: 1 }}
                inputProps={{ 'aria-label': 'search tools' }}
              />
              <IconButton type="submit" size="small" sx={{ color: colorPalette.darkGreen, ml: 0.5 }}><SearchIcon /></IconButton>
            </Box>
            <Tooltip title="Upload CSV"><IconButton component="label" sx={{ ml: 0.5, bgcolor: 'white', color: colorPalette.darkGreen, p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' } }}><UploadFileIcon /><input hidden type="file" accept=".csv" onChange={handleCsvUpload} /></IconButton></Tooltip>
            <Tooltip title="Reset CSV"><IconButton onClick={handleResetCsv} sx={{ ml: 0.5, bgcolor: 'white', color: colorPalette.darkGreen, p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.8)' } }}><RefreshIcon /></IconButton></Tooltip>
          </Toolbar>
        </AppBar>
        <ClickAwayListener onClickAway={() => setControlsExpanded(false)}>
          <Box sx={{ position: 'relative', width: '100%', mt: 2, zIndex: 2 }}>
            <Box sx={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <IconButton size="small" onClick={() => setControlsExpanded(prev => !prev)} sx={{ p: 0 }}>
                {controlsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            <Slide direction="down" in={controlsExpanded} mountOnEnter unmountOnExit timeout={500}>
              <Container maxWidth="lg" sx={{ bgcolor: 'transparent', pt: 0, pb: 0 }}>
                <Paper elevation={2} sx={{ mb: 0, borderRadius: 0, p: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Tabs
                      value={tabValue}
                      onChange={(_, newVal) => setTabValue(newVal)}
                      textColor="primary"
                      variant="fullWidth"
                      sx={{ flex: 1 }}
                    >
                      <Tab label="Categories" />
                      <Tab label="Weights" />
                    </Tabs>
                    <IconButton size="small" onClick={() => setControlsExpanded(prev => !prev)} sx={{ ml: 1 }}>
                      {controlsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                  <Collapse in={controlsExpanded} unmountOnExit>
                    {/* Categories Tab */}
                    {tabValue === 0 && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Chip label={`${filteredTools.length} tools`} size="small" sx={{ ml: 1, bgcolor: colorPalette.darkGreen, color: 'white' }} />
                        </Box>
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
                                    setSelectedCategories([]);
                                  } else {
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
                                  sx={{ borderRadius: '16px', '&.MuiChip-colorPrimary': { backgroundColor: colorPalette.darkGreen } }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                        {/* Primary Function filters */}
                        {availableFunctions.length > 0 && (
                          <Box sx={{ mt: 2 }}>
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
                                  sx={{ borderRadius: '16px', '&.MuiChip-colorPrimary': { backgroundColor: colorPalette.darkGreen } }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                        {/* Environment Type filters */}
                        {availableEnvironments.length > 0 && (
                          <Box sx={{ mt: 2 }}>
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
                                  sx={{ borderRadius: '16px', '&.MuiChip-colorPrimary': { backgroundColor: colorPalette.darkGreen } }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                        {/* Data Sources filters */}
                        {availableDataSources.length > 0 && (
                          <Box sx={{ mt: 2 }}>
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
                                  sx={{ borderRadius: '16px', '&.MuiChip-colorPrimary': { backgroundColor: colorPalette.darkGreen } }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                        {/* Target User filters */}
                        {availableUsers.length > 0 && (
                          <Box sx={{ mt: 2 }}>
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
                                  sx={{ borderRadius: '16px', '&.MuiChip-colorPrimary': { backgroundColor: colorPalette.darkGreen } }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}

                    {/* Weights Tab */}
                    {tabValue === 1 && (
                      <Box>
                        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                          What is important to you?
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                Primary Function: {primaryFunctionWeight.toFixed(2)}
                                <Tooltip title="Determines how much the tool's main functionality influences clustering" arrow>
                                  <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                                </Tooltip>
                              </Typography>
                              <Slider 
                                value={primaryFunctionWeight}
                                onChange={(_event: Event, newValue: number | number[]) => setPrimaryFunctionWeight(newValue as number)} 
                                aria-labelledby="primary-function-weight-slider"
                                valueLabelDisplay="auto"
                                step={0.1}
                                marks
                                min={0}
                                max={1}
                              />
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                Data Sources: {dataSourcesWeight.toFixed(2)}
                                <Tooltip title="Affects how data collection methods impact tool grouping" arrow>
                                  <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                                </Tooltip>
                              </Typography>
                              <Slider 
                                value={dataSourcesWeight} 
                                onChange={(_event: Event, newValue: number | number[]) => setDataSourcesWeight(newValue as number)} 
                                aria-labelledby="data-sources-weight-slider"
                                valueLabelDisplay="auto"
                                step={0.1}
                                marks
                                min={0}
                                max={1}
                              />
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                Target User: {targetUserWeight.toFixed(2)}
                                <Tooltip title="Controls how the intended audience affects tool relationships" arrow>
                                  <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                                </Tooltip>
                              </Typography>
                              <Slider 
                                value={targetUserWeight} 
                                onChange={(_event: Event, newValue: number | number[]) => setTargetUserWeight(newValue as number)} 
                                aria-labelledby="target-user-weight-slider"
                                valueLabelDisplay="auto"
                                step={0.1}
                                marks
                                min={0}
                                max={1}
                              />
                            </Box>
                          </Grid>

                          <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                Environment Type: {environmentTypeWeight.toFixed(2)}
                                <Tooltip title="Influences how environmental context affects tool similarity" arrow>
                                  <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                                </Tooltip>
                              </Typography>
                              <Slider 
                                value={environmentTypeWeight} 
                                onChange={(_event: Event, newValue: number | number[]) => setEnvironmentTypeWeight(newValue as number)} 
                                aria-labelledby="environment-type-weight-slider"
                                valueLabelDisplay="auto"
                                step={0.1}
                                marks
                                min={0}
                                max={1}
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Collapse>
                </Paper>
              </Container>
            </Slide>
          </Box>
        </ClickAwayListener>

        <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column' }}>
              <Box className="loading-indicator" />
              <Typography variant="body2" color="text.secondary">
                Processing tool relationships...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ flex: 1, position: 'relative' }}>
              <ForceGraphContainer
                controlsExpanded={false}
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
                  <Box
                    component="form"
                    onSubmit={(e: FormEvent<HTMLFormElement>) => {
                      e.preventDefault();
                      if (searchTerm.trim()) {
                        handleNaturalLanguageSearch(searchTerm);
                        setSearchFocused(false); // hide overlay when showing results
                        setShowSearchResults(true);
                      }
                    }}
                    sx={{ width: '100%' }}
                  >
                    <TextField
                      inputRef={centerSearchRef}
                      fullWidth
                      placeholder="Describe what you're looking for..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsNaturalLanguageSearch(false);
                      }}
                      onFocus={handleSearchFocus}
                      onKeyDown={handleSearchKeyDown}
                      sx={{ color: 'inherit', ml: 1, flex: 1 }}
                      inputProps={{ 'aria-label': 'search tools' }}
                    />
                  </Box>
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
              
              {/* Search Results Modal Wrapper */}
              <Fade in={showSearchResults}>
                <Box
                  sx={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1300,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '80%', // Ensure wrapper takes width
                    maxWidth: '800px', // Ensure wrapper takes maxWidth
                  }}
                >
                  {/* Inner Results Box */}
                  <Box
                    sx={{
                      width: '100%', // Take full width of parent wrapper
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      boxShadow: 24,
                      p: 2,
                      overflow: 'auto',
                      maxHeight: '70vh', // Limit height to prevent overflow
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {isNaturalLanguageSearch ? 'AI Search Results' : 'Search Results'}
                      </Typography>
                      <IconButton onClick={handleClearSearch}>
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
                          No tools match your current search or filters.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {filteredTools.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Button 
                        variant="contained" 
                        onClick={() => setShowSearchResults(false)}
                        sx={{ backgroundColor: colorPalette.mediumGreen, '&:hover': { backgroundColor: colorPalette.darkGreen } }}
                      >
                        Show Results on Map
                      </Button>
                    </Box>
                  )}
                </Box>
              </Fade>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
