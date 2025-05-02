

type SearchBarProps = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleNaturalLanguageSearch: (query: string) => void;
  isLoading: boolean;
  isNaturalLanguageSearch: boolean;
};

import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function SearchBar({
  searchTerm,
  setSearchTerm,
  handleNaturalLanguageSearch,
  isLoading,
  isNaturalLanguageSearch,
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-1 w-full h-7 relative">
      <div className="relative flex-1 flex w-full bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              handleNaturalLanguageSearch(searchTerm);
            }
          }}
          placeholder="Search tools"
          className="flex-1 text-[11px] h-7 pl-7 border-0 shadow-none rounded-none" 
          disabled={isLoading}
        />
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 absolute right-0 rounded-none shadow-none mr-1"
          onClick={() => handleNaturalLanguageSearch(searchTerm)}
          disabled={isLoading || !searchTerm.trim()}
          aria-label="Search"
        >
          {isLoading ? (
            <svg className="animate-spin h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </Button>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 h-4 rounded-sm font-medium ${isNaturalLanguageSearch ? 'bg-tnfd-green text-white' : 'bg-green-100 dark:bg-gray-700 text-green-700 dark:text-green-300'}`}>
        AI
      </span>
    </div>
  );
}
