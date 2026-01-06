import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export interface PendingEventData {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  color?: string;
}

export interface PendingChange {
  id: string;
  type: "create" | "update" | "delete";
  toolCallId: string;
  eventData: PendingEventData;
  originalEvent?: PendingEventData & { id: string };
  status: "pending" | "approved" | "declined";
}

interface PendingChangesContextValue {
  pendingChanges: PendingChange[];
  addPendingChange: (change: Omit<PendingChange, "status">) => void;
  updatePendingChangeStatus: (
    id: string,
    status: "approved" | "declined"
  ) => void;
  removePendingChange: (id: string) => void;
  clearPendingChanges: () => void;
  getPendingChangeByToolCallId: (
    toolCallId: string
  ) => PendingChange | undefined;
}

const PendingChangesContext = createContext<PendingChangesContextValue | null>(
  null
);

export function PendingChangesProvider({ children }: { children: ReactNode }) {
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  const addPendingChange = useCallback(
    (change: Omit<PendingChange, "status">) => {
      setPendingChanges((prev) => [
        ...prev,
        { ...change, status: "pending" as const },
      ]);
    },
    []
  );

  const updatePendingChangeStatus = useCallback(
    (id: string, status: "approved" | "declined") => {
      setPendingChanges((prev) =>
        prev.map((change) =>
          change.id === id ? { ...change, status } : change
        )
      );
    },
    []
  );

  const removePendingChange = useCallback((id: string) => {
    setPendingChanges((prev) => prev.filter((change) => change.id !== id));
  }, []);

  const clearPendingChanges = useCallback(() => {
    setPendingChanges([]);
  }, []);

  const getPendingChangeByToolCallId = useCallback(
    (toolCallId: string) => {
      return pendingChanges.find((change) => change.toolCallId === toolCallId);
    },
    [pendingChanges]
  );

  const value = useMemo(
    () => ({
      pendingChanges,
      addPendingChange,
      updatePendingChangeStatus,
      removePendingChange,
      clearPendingChanges,
      getPendingChangeByToolCallId,
    }),
    [
      pendingChanges,
      addPendingChange,
      updatePendingChangeStatus,
      removePendingChange,
      clearPendingChanges,
      getPendingChangeByToolCallId,
    ]
  );

  return (
    <PendingChangesContext.Provider value={value}>
      {children}
    </PendingChangesContext.Provider>
  );
}

export function usePendingChanges(): PendingChangesContextValue {
  const context = useContext(PendingChangesContext);
  if (!context) {
    throw new Error(
      "usePendingChanges must be used within a PendingChangesProvider"
    );
  }
  return context;
}
