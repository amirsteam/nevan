/**
 * SearchInput Component
 * Debounced search input with icon
 */
import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';
import { debounce } from '../../utils/helpers';

const SearchInput = ({
    value = '',
    onChange,
    placeholder = 'Search...',
    debounceMs = 300,
    className = '',
    autoFocus = false,
}: {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
    className?: string;
    autoFocus?: boolean;
}) => {
    const [inputValue, setInputValue] = useState(value);

    // Sync with external value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Debounced callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedOnChange = useCallback(
        debounce((val: string) => {
            onChange(val);
        }, debounceMs),
        [onChange, debounceMs]
    );

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        debouncedOnChange(newValue);
    };

    const handleClear = () => {
        setInputValue('');
        onChange('');
    };

    return (
        <div className={`input-group ${className}`}>
            <Search className="input-icon w-4 h-4" />
            <input
                type="text"
                value={inputValue}
                onChange={handleChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className={`input ${inputValue ? 'has-icon-right' : ''}`}
            />
            {inputValue && (
                <button
                    onClick={handleClear}
                    className="input-icon-right p-1 rounded hover:bg-[var(--color-bg)]"
                    aria-label="Clear search"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default SearchInput;
