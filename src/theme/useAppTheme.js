import { useMemo } from "react";
import { usePreferencesStore } from "../store/preferencesStore";

import { createTheme } from "./theme";

export function useAppTheme() {
  const dark = usePreferencesStore(state => state.darkMode);
  return useMemo(() => createTheme(dark), [dark]);
}
