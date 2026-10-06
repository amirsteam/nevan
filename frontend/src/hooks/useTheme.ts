import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  getThemePreference,
  setThemePreference,
  watchSystemTheme,
  type ThemePreference,
} from "../utils/theme";

/** Current theme preference plus a setter that persists and applies it */
export const useTheme = () => {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference);

  useEffect(
    () =>
      watchSystemTheme(() => {
        if (getThemePreference() === "system") applyTheme("system");
      }),
    [],
  );

  const update = useCallback((next: ThemePreference) => {
    setThemePreference(next);
    setPreference(next);
  }, []);

  return { preference, setPreference: update };
};
