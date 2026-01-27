/**
 * Tabs Component
 * Accessible tabs with keyboard navigation
 */
import {
  useState,
  useRef,
  KeyboardEvent,
  ReactNode,
  createContext,
  useContext,
} from "react";

// Context for tab state
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs provider");
  }
  return context;
};

// Main Tabs container
interface TabsProps {
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

const Tabs = ({
  defaultValue,
  value: controlledValue,
  onChange,
  children,
  className = "",
}: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab =
    controlledValue !== undefined ? controlledValue : internalValue;

  const setActiveTab = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

// Tab List (container for triggers)
interface TabListProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "pills" | "underline";
}

export const TabList = ({
  children,
  className = "",
  variant = "default",
}: TabListProps) => {
  const tabsRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const tabs = tabsRef.current?.querySelectorAll('[role="tab"]');
    if (!tabs) return;

    const tabArray = Array.from(tabs) as HTMLButtonElement[];
    const currentIndex = tabArray.findIndex(
      (tab) => tab === document.activeElement,
    );

    let nextIndex: number | null = null;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabArray.length - 1;
        break;
      case "ArrowRight":
        e.preventDefault();
        nextIndex = currentIndex < tabArray.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = tabArray.length - 1;
        break;
    }

    if (nextIndex !== null) {
      tabArray[nextIndex]?.focus();
    }
  };

  const variantClasses = {
    default: "flex gap-1 p-1 bg-[var(--color-background)] rounded-xl",
    pills: "flex gap-2",
    underline: "flex gap-6 border-b border-[var(--color-border)]",
  };

  return (
    <div
      ref={tabsRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={`${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

// Tab Trigger (individual tab button)
interface TabTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "pills" | "underline";
}

export const TabTrigger = ({
  value,
  children,
  disabled = false,
  className = "",
  variant = "default",
}: TabTriggerProps) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  const baseClasses =
    "transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1";

  const variantClasses = {
    default: `
      px-4 py-2 rounded-lg text-sm
      ${
        isActive
          ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/50"
      }
    `,
    pills: `
      px-4 py-2 rounded-full text-sm
      ${
        isActive
          ? "bg-[var(--color-primary)] text-white"
          : "bg-[var(--color-background)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
      }
    `,
    underline: `
      pb-3 text-sm border-b-2 -mb-px
      ${
        isActive
          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]"
      }
    `,
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// Tab Content (panel content)
interface TabContentProps {
  value: string;
  children: ReactNode;
  className?: string;
  forceMount?: boolean;
}

export const TabContent = ({
  value,
  children,
  className = "",
  forceMount = false,
}: TabContentProps) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive && !forceMount) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      hidden={!isActive}
      className={`
        mt-4 focus:outline-none
        ${isActive ? "animate-fadeIn" : ""}
        ${className}
      `}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

export default Tabs;
