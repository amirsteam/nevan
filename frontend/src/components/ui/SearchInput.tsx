/**
 * SearchInput Component
 * Enhanced search input with suggestions and keyboard navigation
 */
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  isLoading?: boolean;
  showClear?: boolean;
  autoFocus?: boolean;
  className?: string;
  debounceMs?: number;
}

const SearchInput = ({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = "Search...",
  suggestions = [],
  isLoading = false,
  showClear = true,
  autoFocus = false,
  className = "",
  debounceMs = 300,
}: SearchInputProps) => {
  const [internalValue, setInternalValue] = useState(controlledValue || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Handle input change with debounce
  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    setSelectedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter" && onSearch) {
        onSearch(value);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleChange(suggestions[selectedIndex]);
          onChange(suggestions[selectedIndex]);
          if (onSearch) onSearch(suggestions[selectedIndex]);
        } else if (onSearch) {
          onSearch(value);
        }
        setShowSuggestions(false);
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle clear
  const handleClear = () => {
    setInternalValue("");
    onChange("");
    inputRef.current?.focus();
  };

  // Show suggestions on focus if there are any
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Update suggestions visibility
  useEffect(() => {
    if (suggestions.length > 0 && value) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions, value]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`
            w-full h-11 pl-11 pr-${showClear && value ? "11" : "4"} 
            bg-[var(--color-background)] border border-[var(--color-border)] rounded-xl
            text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
            transition-all duration-200
          `}
          aria-label="Search"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
        />

        {/* Clear Button */}
        {showClear && value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--color-border)] transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => {
                handleChange(suggestion);
                onChange(suggestion);
                if (onSearch) onSearch(suggestion);
                setShowSuggestions(false);
              }}
              className={`
                px-4 py-3 cursor-pointer transition-colors
                ${
                  index === selectedIndex
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "hover:bg-[var(--color-background)]"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span>{suggestion}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchInput;
