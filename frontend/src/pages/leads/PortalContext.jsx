import { createContext, useContext } from "react";

// Shared portal state: signed-in user, team list, toasts, task badge refresh.
export const PortalContext = createContext(null);

export function usePortal() {
  return useContext(PortalContext);
}
