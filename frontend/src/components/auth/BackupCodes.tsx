/**
 * One-time backup codes for two-step login, shown once: copy, download, and
 * (when `onDone` is given) confirm they're saved before continuing.
 */
import { useId, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import toast from "react-hot-toast";

interface BackupCodesProps {
  codes: string[];
  email?: string;
  /** Shows "I've saved these codes" + a continue button */
  onDone?: () => void;
  doneLabel?: string;
}

const BackupCodes = ({ codes, email, onDone, doneLabel = "Continue" }: BackupCodesProps) => {
  const id = useId();
  const [saved, setSaved] = useState(false);
  const [needsSaved, setNeedsSaved] = useState(false);
  const savedRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const text = [
    "Nevan Handicraft: two-step login backup codes",
    email ? `Account: ${email}` : "",
    "Each code works once. Keep them somewhere safe, away from your phone.",
    "",
    ...codes,
  ]
    .filter((line, i) => line || i > 1)
    .join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Backup codes copied");
    } catch {
      toast.error("Couldn't copy. Select the codes and copy them instead.");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nevan-backup-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        If you lose your phone, each of these codes lets you sign in once. Save them now: you won't
        see them again. Print them or keep them in a safe place, not on your phone.
      </p>
      <ul
        aria-label="Backup codes"
        className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 font-mono text-sm"
      >
        {codes.map((code) => (
          <li key={code} className="select-all tracking-wider">
            {code}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn btn-outline">
          {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" onClick={download} className="btn btn-outline">
          <Download className="w-4 h-4" aria-hidden="true" />
          Download .txt
        </button>
      </div>
      {onDone && (
        <>
          <label htmlFor={`${id}-saved`} className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              id={`${id}-saved`}
              type="checkbox"
              ref={savedRef}
              checked={saved}
              onChange={(e) => {
                setSaved(e.target.checked);
                if (e.target.checked) setNeedsSaved(false);
              }}
              aria-invalid={needsSaved || undefined}
              aria-describedby={needsSaved ? `${id}-saved-error` : undefined}
              className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
            />
            I've saved these codes somewhere safe
          </label>
          {needsSaved && (
            <p id={`${id}-saved-error`} role="alert" className="text-sm text-[var(--color-error)]">
              Save the codes first, then tick the box.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (!saved) {
                setNeedsSaved(true);
                return savedRef.current?.focus();
              }
              onDone();
            }}
            className="btn btn-primary w-full py-3"
          >
            {doneLabel}
          </button>
        </>
      )}
    </div>
  );
};

export default BackupCodes;
