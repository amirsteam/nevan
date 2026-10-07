/**
 * "2d 4h left" style countdown to a campaign's end. Updates once a minute
 * (no per-second re-renders); screen readers get the full end date.
 */
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { timeLeft, endsOn } from "../../utils/campaign";

interface CountdownProps {
  endsAt: string;
  className?: string;
  showIcon?: boolean;
}

const Countdown = ({ endsAt, className = "", showIcon = true }: CountdownProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      {showIcon && <Clock className="w-3.5 h-3.5" aria-hidden="true" />}
      <span aria-hidden="true">{timeLeft(endsAt, now)}</span>
      <span className="sr-only">{endsOn(endsAt)}</span>
    </span>
  );
};

export default Countdown;
