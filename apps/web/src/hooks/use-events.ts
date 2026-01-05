import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
  color?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  color?: string;
}

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
      return data as CalendarEvent[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (eventData: CreateEventInput) => {
      const { data, error } = await api.api.events.post(eventData);
      if (error) {
        throw error;
      }
      return data as CalendarEvent;
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
      return data as CalendarEvent;
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
