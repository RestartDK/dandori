import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

// Infer types from Eden Treaty (derived from server TypeBox schemas)
type CalendarsResponse = Awaited<
  ReturnType<typeof api.api.calendars.get>
>["data"];
export type Calendar = NonNullable<CalendarsResponse>[number];

export function useCalendars() {
  const queryClient = useQueryClient();

  const calendarsQuery = useQuery({
    queryKey: ["calendars"],
    queryFn: async () => {
      const { data, error } = await api.api.calendars.get();
      if (error) {
        throw error;
      }
      return data;
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({
      id,
      isVisible,
    }: {
      id: string;
      isVisible: boolean;
    }) => {
      const { data, error } = await api.api.calendars({ id }).patch({
        isVisible,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onMutate: async ({ id, isVisible }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["calendars"] });

      // Snapshot the previous value
      const previousCalendars = queryClient.getQueryData<Calendar[]>([
        "calendars",
      ]);

      // Optimistically update to the new value
      if (previousCalendars) {
        queryClient.setQueryData<Calendar[]>(["calendars"], (old) => {
          if (!old) return old;
          return old.map((cal) =>
            cal.id === id ? { ...cal, isVisible } : cal
          );
        });
      }

      // Return a context object with the snapshotted value
      return { previousCalendars };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCalendars) {
        queryClient.setQueryData(["calendars"], context.previousCalendars);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendars"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const toggleCalendar = async (id: string, currentVisibility: boolean) => {
    await toggleVisibilityMutation.mutateAsync({
      id,
      isVisible: !currentVisibility,
    });
  };

  return {
    calendars: calendarsQuery.data ?? [],
    isLoading: calendarsQuery.isLoading,
    error: calendarsQuery.error,
    toggleCalendar,
    isToggling: toggleVisibilityMutation.isPending,
  };
}
