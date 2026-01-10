import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

// Infer types from Eden Treaty (derived from server TypeBox schemas)
type EventsResponse = Awaited<ReturnType<typeof api.api.events.get>>["data"];
export type CalendarEvent = NonNullable<EventsResponse>[number];

type CreateEventBody = Parameters<typeof api.api.events.post>[0];
export type CreateEventInput = CreateEventBody;

// UpdateEventInput uses Partial of CreateEventInput since the server expects the same fields but optional
export type UpdateEventInput = Partial<CreateEventInput>;

export function useEvents(start: Date, end: Date) {
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    queryKey: ["events", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await api.api.events.get({
        query: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      });
      if (error) {
        throw error;
      }
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (eventData: CreateEventInput) => {
      const { data, error } = await api.api.events.post(eventData);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: UpdateEventInput & { id: string }) => {
      const { data, error } = await api.api.events({ id }).patch(updates);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.api.events({ id }).delete();
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    error: eventsQuery.error,
    createEvent: createMutation.mutateAsync,
    updateEvent: updateMutation.mutateAsync,
    deleteEvent: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
