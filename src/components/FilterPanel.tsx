

type FilterPanelProps = {
  availableCategories: string[];
  selectedCategories: string[];
  handleCategoryToggle: (category: string) => void;
  availableFunctions: string[];
  selectedFunctions: string[];
  handleFunctionToggle: (func: string) => void;
  availableEnvironments: string[];
  selectedEnvironments: string[];
  handleEnvironmentToggle: (env: string) => void;
  availableDataSources: string[];
  selectedDataSources: string[];
  handleDataSourceToggle: (source: string) => void;
  availableUsers: string[];
  selectedUsers: string[];
  handleUserToggle: (user: string) => void;
  clearAllFilters: () => void;
  isLoading: boolean;
};

import { Select } from "./ui/select";
import { Button } from "./ui/button";

export default function FilterPanel({
  availableCategories,
  selectedCategories,
  handleCategoryToggle,
  availableFunctions,
  selectedFunctions,
  handleFunctionToggle,
  availableEnvironments,
  selectedEnvironments,
  handleEnvironmentToggle,
  availableDataSources,
  selectedDataSources,
  handleDataSourceToggle,
  availableUsers,
  selectedUsers,
  handleUserToggle,
  clearAllFilters,
  isLoading,
}: FilterPanelProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto flex-nowrap">
      <div className="inline-flex gap-1 py-1 px-1.5 bg-white dark:bg-gray-800 shadow-sm rounded-md border border-gray-200 dark:border-gray-700">
        {/* Compact Filter Dropdowns */}
        <Select
          value={selectedCategories[0] || ''}
          onChange={e => handleCategoryToggle(e.target.value)}
          disabled={isLoading}
          className="w-[100px] h-7 text-[11px] bg-transparent"
        >
          <option value="">Category: All</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
        
        <Select
          value={selectedFunctions[0] || ''}
          onChange={e => handleFunctionToggle(e.target.value)}
          disabled={isLoading}
          className="w-[100px] h-7 text-[11px] bg-transparent"
        >
          <option value="">Function: All</option>
          {availableFunctions.map((fn) => (
            <option key={fn} value={fn}>{fn}</option>
          ))}
        </Select>
        
        <Select
          value={selectedEnvironments[0] || ''}
          onChange={e => handleEnvironmentToggle(e.target.value)}
          disabled={isLoading}
          className="w-[100px] h-7 text-[11px] bg-transparent"
        >
          <option value="">Env: All</option>
          {availableEnvironments.map((env) => (
            <option key={env} value={env}>{env}</option>
          ))}
        </Select>
        
        <Select
          value={selectedDataSources[0] || ''}
          onChange={e => handleDataSourceToggle(e.target.value)}
          disabled={isLoading}
          className="w-[100px] h-7 text-[11px] bg-transparent"
        >
          <option value="">Source: All</option>
          {availableDataSources.map((src) => (
            <option key={src} value={src}>{src}</option>
          ))}
        </Select>
        
        <Select
          value={selectedUsers[0] || ''}
          onChange={e => handleUserToggle(e.target.value)}
          disabled={isLoading}
          className="w-[100px] h-7 text-[11px] bg-transparent"
        >
          <option value="">User: All</option>
          {availableUsers.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </Select>
        
        {/* Clear Button */}
        <Button
          className="h-7 text-[11px] px-2 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700" 
          onClick={clearAllFilters}
          disabled={isLoading}
          aria-label="Clear all filters"
          variant="ghost"
          size="sm"
        >
          <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
          Clear
        </Button>
      </div>
    </div>
  );
}
