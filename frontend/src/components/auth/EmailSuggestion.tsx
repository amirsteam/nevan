/**
 * "Did you mean anjana@gmail.com?" under an email field (see utils/emailTypo).
 */
const EmailSuggestion = ({
  suggestion,
  onAccept,
}: {
  suggestion: string;
  onAccept: (email: string) => void;
}) => (
  <p role="status" className="mt-1 text-xs text-[var(--color-text-muted)]">
    Did you mean{" "}
    <button
      type="button"
      onClick={() => onAccept(suggestion)}
      className="font-medium text-[var(--color-primary)] underline underline-offset-2"
    >
      {suggestion}
    </button>
    ?
  </p>
);

export default EmailSuggestion;
