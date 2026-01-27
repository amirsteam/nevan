/**
 * Tooltip Component
 * Simple tooltip for additional context
 */
import { useState, ReactNode, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

const Tooltip = ({
  content,
  children,
  position = "top",
  delay = 200,
  className = "",
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords(calculatePosition(rect, position));
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const calculatePosition = (rect: DOMRect, pos: TooltipPosition) => {
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const offset = 8;

    switch (pos) {
      case "top":
        return {
          x: rect.left + scrollX + rect.width / 2,
          y: rect.top + scrollY - offset,
        };
      case "bottom":
        return {
          x: rect.left + scrollX + rect.width / 2,
          y: rect.bottom + scrollY + offset,
        };
      case "left":
        return {
          x: rect.left + scrollX - offset,
          y: rect.top + scrollY + rect.height / 2,
        };
      case "right":
        return {
          x: rect.right + scrollX + offset,
          y: rect.top + scrollY + rect.height / 2,
        };
      default:
        return { x: 0, y: 0 };
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionStyles: Record<TooltipPosition, string> = {
    top: "-translate-x-1/2 -translate-y-full mb-2",
    bottom: "-translate-x-1/2 mt-2",
    left: "-translate-x-full -translate-y-1/2 mr-2",
    right: "-translate-y-1/2 ml-2",
  };

  const arrowStyles: Record<TooltipPosition, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700 border-l-transparent border-r-transparent border-b-transparent",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700 border-t-transparent border-b-transparent border-r-transparent",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible &&
        content &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className={`
              fixed z-[9999] pointer-events-none
              ${positionStyles[position]}
              ${className}
            `}
            style={{
              left: coords.x,
              top: coords.y,
            }}
          >
            <div className="relative bg-gray-900 dark:bg-gray-700 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fadeIn">
              {content}
              {/* Arrow */}
              <div
                className={`absolute w-0 h-0 border-4 ${arrowStyles[position]}`}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default Tooltip;
