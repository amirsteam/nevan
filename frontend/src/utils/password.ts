/**
 * The password rule for new passwords (sign-up, reset, change). Matches the
 * API's `passwordRule` in backend/middleware/validate.ts — change both together.
 */
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES = [
  { label: `${PASSWORD_MIN_LENGTH}+ characters`, test: (p: string) => p.length >= PASSWORD_MIN_LENGTH },
  { label: "A letter", test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: "A number", test: (p: string) => /[0-9]/.test(p) },
] as const;

/** Why a new password isn't accepted yet, or "" when it is */
export const passwordProblem = (password: string): string => {
  if (!password) return "Choose a password";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use ${PASSWORD_MAX_LENGTH} characters or fewer`;
  }
  if (!/[a-zA-Z]/.test(password)) return "Add at least one letter";
  if (!/[0-9]/.test(password)) return "Add at least one number";
  return "";
};
