import { useQuery } from '@tanstack/react-query';
import { helpApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

/**
 * Help articles visible to the current user (server filters by role).
 * Guests are treated as students (`user` audience on the server).
 */
export function useHelpTopics() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'guest';

  return useQuery({
    queryKey: ['help-topics', role],
    queryFn: async () => {
      const { data } = await helpApi.getTopics();
      return data.topics || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useHelpTopic(topicId) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'guest';

  return useQuery({
    queryKey: ['help-topic', topicId, role],
    queryFn: async () => {
      const { data } = await helpApi.getTopic(topicId);
      return data.topic;
    },
    enabled: Boolean(topicId),
    staleTime: 1000 * 60 * 5,
    retry: (count, err) => err?.response?.status === 404 ? false : count < 2,
  });
}
