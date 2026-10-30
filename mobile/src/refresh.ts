import { useState } from "react";
import { useReload } from "./providers";

export function usePullReload() {
  const reload = useReload();
  const [refreshing, setRefreshing] = useState(false);
  async function onRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }
  return { refreshing, onRefresh };
}
