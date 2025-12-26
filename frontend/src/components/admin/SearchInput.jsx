/**
 * SearchInput Component
 * Debounced search input with icon
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { debounce } from '../../utils/helpers';

const SearchInput = ({
    value = '',
    onChange,
    placeholder = 'Search...',
    debounceMs = 300,
    className = '',
    autoFocus = false,
}) => {
    const [inputValue, setInputValue] = useState(value);

    // Sync with external value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Debounced callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedOnChange = useCallback(
        debounce((val) => {
            onChange(val);
        }, debounceMs),
        [onChange, debounceMs]
    );

    const handleChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        debouncedOnChange(newValue);
    };

    const handleClear = () => {
        setInputValue('');
        onChange('');
    };

    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
                type="text"
                value={inputValue}
                onChange={handleChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className="input pl-10 pr-10"
            />
            {inputValue && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--color-bg)]"
                    aria-label="Clear search"
                >
                    <X className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>
            )}
        </div>
    );
};

export default SearchInput;
