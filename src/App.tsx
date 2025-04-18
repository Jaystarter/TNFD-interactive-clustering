import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import { ForceGraphContainer } from './components/ForceGraphContainer';
import { Tool, tools as defaultTools } from './data/tools';
import { processToolsData, FeatureWeights } from './utils/clusteringUtils';
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
  Slider,
  Grid,
  Container,
  InputAdornment,
  TextField,
  IconButton,
  Divider,
  Tooltip,
  Chip,
  Collapse,
  Button
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  TuneRounded as TuneIcon,
  InfoOutlined as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
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

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tools, setTools] = useState<Tool[]>(defaultTools);
  const [isLoading, setIsLoading] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [csvLoaded, setCsvLoaded] = useState(false);
  const [rawCsvData, setRawCsvData] = useState<string | null>(null);
  const [controlsExpanded, setControlsExpanded] = useState(false);

  // Filter states for different criteria
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
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

        // Attempt to load CSV
        const csvContent = await loadCSVFromPossibleLocations();
        // Store the raw CSV data for later reuse
        setRawCsvData(csvContent);

        // Process initial data with default weights
        const processedTools = await processToolsData(
          csvContent,
          similarityThreshold,
          featureWeights
        );

        // If we have no processed tools, fall back to default
        if (!processedTools || processedTools.length === 0) {
          console.warn('No tools were processed from CSV, using default tools');
          setTools(defaultTools);
        } else {
          setTools(processedTools);
          setCsvLoaded(true);

          // Extract unique categories from the tools
          const categories = Array.from(new Set(processedTools.map(tool => tool.category)));
          setAvailableCategories(categories);
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

      // Use stored CSV data instead of reloading from file
      const processedTools = await processToolsData(
        rawCsvData,
        similarityThreshold,
        featureWeights
      );
      setTools(processedTools);
    } catch (error) {
      console.error('Error updating weights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [csvLoaded, rawCsvData, similarityThreshold, featureWeights]);

  // Run weight updates when feature weights change
  useEffect(() => {
    if (csvLoaded && rawCsvData) {
      handleWeightsChange();
    }
  }, [csvLoaded, rawCsvData, featureWeights, similarityThreshold, handleWeightsChange]);

  // Recalculate connections when similarity threshold changes
  const handleThresholdChange = useCallback((_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
    setSimilarityThreshold(newValue as number);
    handleWeightsChange();
  }, [handleWeightsChange]);

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
  };

  // Filter tools based on all criteria
  const filteredTools = useMemo(() => {
    // Start with all tools
    let filtered = tools;

    // Apply search filter
    if (searchTerm.trim()) {
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

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(tool => selectedCategories.includes(tool.category));
    }

    // Get the raw CSV data for more detailed filtering
    if (rawCsvData) {
      try {
        const parsedData = Papa.parse(rawCsvData, { header: true }).data as any[];
        const toolMap = new Map(parsedData.map(row => [
          row['Tool Name']?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          row
        ]));

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
      selectedDataSources, selectedUsers, rawCsvData]);

  // Format slider value with 2 decimal places
  const valuetext = (value: number) => {
    return value.toFixed(2);
  };

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
            borderBottom: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5" component="h1">
                TNFD Tools Relational Map
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', width: '40%' }}>
                <TextField
                  fullWidth
                  placeholder="Search for tools or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'rgba(255,255,255,0.8)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="clear search"
                          onClick={() => setSearchTerm('')}
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
                    label={`${filteredTools.length} found`}
                    size="small"
                    sx={{
                      ml: 1,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: 'white'
                    }}
                  />
                )}
              </Box>
            </Box>
          </Container>
        </Paper>

        <Container maxWidth="lg" sx={{ mt: 2, mb: 1 }}>
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
              gap: 1
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
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Categories
                  </Typography>
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
            elevation={3}
            sx={{
              p: 2,
              mb: 2,
              bgcolor: '#fff',
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
                  Clustering Controls
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

              {/* Similarity Threshold in the header */}
              <Box sx={{ display: 'flex', alignItems: 'center', width: '250px' }}>
                <Tooltip title="Controls how similar tools must be to form connections" arrow>
                  <Typography variant="subtitle2" sx={{ mr: 1, whiteSpace: 'nowrap' }}>
                    Threshold: {similarityThreshold.toFixed(2)}
                  </Typography>
                </Tooltip>
                <Slider
                  size="small"
                  value={similarityThreshold}
                  onChange={handleThresholdChange}
                  min={0.2}
                  max={0.9}
                  step={0.05}
                  valueLabelDisplay="auto"
                  getAriaValueText={valuetext}
                  valueLabelFormat={valuetext}
                  disabled={isLoading}
                  color="primary"
                />
              </Box>
            </Box>

            <Collapse in={controlsExpanded}>
              <Divider sx={{ mb: 1.5 }} />

              <Grid container spacing={1}>
                {/* Feature Weight Sliders in compact format */}
                <Grid item xs={6} sm={3}>
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="caption" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      Primary Function: {primaryFunctionWeight.toFixed(2)}
                      <Tooltip title="Determines how much the tool's main functionality influences clustering" arrow>
                        <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                    <Slider
                      size="small"
                      value={primaryFunctionWeight}
                      onChange={(_e, v) => handleFeatureWeightChange('Primary Function', v)}
                      min={0.1}
                      max={0.5}
                      step={0.05}
                      valueLabelDisplay="auto"
                      getAriaValueText={valuetext}
                      valueLabelFormat={valuetext}
                      disabled={isLoading}
                      color="primary"
                    />
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="caption" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      Data Sources: {dataSourcesWeight.toFixed(2)}
                      <Tooltip title="Affects how data collection methods impact tool grouping" arrow>
                        <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                    <Slider
                      size="small"
                      value={dataSourcesWeight}
                      onChange={(_e, v) => handleFeatureWeightChange('Data Sources', v)}
                      min={0.1}
                      max={0.5}
                      step={0.05}
                      valueLabelDisplay="auto"
                      getAriaValueText={valuetext}
                      valueLabelFormat={valuetext}
                      disabled={isLoading}
                      color="primary"
                    />
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="caption" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      Target User: {targetUserWeight.toFixed(2)}
                      <Tooltip title="Controls how the intended audience affects tool relationships" arrow>
                        <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                    <Slider
                      size="small"
                      value={targetUserWeight}
                      onChange={(_e, v) => handleFeatureWeightChange('Target User/Client', v)}
                      min={0.1}
                      max={0.5}
                      step={0.05}
                      valueLabelDisplay="auto"
                      getAriaValueText={valuetext}
                      valueLabelFormat={valuetext}
                      disabled={isLoading}
                      color="primary"
                    />
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ mb: 0 }}>
                    <Typography variant="caption" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      Environment: {environmentTypeWeight.toFixed(2)}
                      <Tooltip title="Influences how operational environment impacts tool clustering" arrow>
                        <InfoIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary' }} />
                      </Tooltip>
                    </Typography>
                    <Slider
                      size="small"
                      value={environmentTypeWeight}
                      onChange={(_e, v) => handleFeatureWeightChange('Environment Type', v)}
                      min={0.1}
                      max={0.5}
                      step={0.05}
                      valueLabelDisplay="auto"
                      getAriaValueText={valuetext}
                      valueLabelFormat={valuetext}
                      disabled={isLoading}
                      color="primary"
                    />
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
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
