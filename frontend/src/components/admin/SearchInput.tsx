/**
 * SearchInput Component
 * Debounced search input with icon
 */
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';

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

    // Sync with external value changes (e.g. filters reset from the URL),
    // adjusting state during render rather than in an effect
    const [lastValue, setLastValue] = useState(value);
    if (lastValue !== value) {
        setLastValue(value);
        setInputValue(value);
    }

    // One pending timer; the latest onChange is read when it fires, so a
    // parent re-rendering with a new callback doesn't cause extra searches
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    });
    const timerRef = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => onChangeRef.current(newValue), debounceMs);
    };

    const handleClear = () => {
        window.clearTimeout(timerRef.current);
        setInputValue('');
        onChange('');
    };

    return (
        <div className={`input-group ${className}`}>
            <Search className="input-icon w-4 h-4" aria-hidden="true" />
            <input
                type="text"
                role="searchbox"
                value={inputValue}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={placeholder.replace(/\.+$|…$/, '')}
                autoFocus={autoFocus}
                className={`input ${inputValue ? 'has-icon-right' : ''}`}
            />
            {inputValue && (
                <button
                    type="button"
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
