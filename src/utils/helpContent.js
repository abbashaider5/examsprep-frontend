/**
 * Client-side search over help topics (already filtered by role from the API).
 * @param {string} query
 * @param {Array<{ id: string, title: string, description: string, category?: string, keywords?: string[] }>} topics
 */
export function searchHelpTopics(query, topics = []) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  if (!topics?.length) return [];

  const terms = q.split(/\s+/).filter(Boolean);
  const scored = topics.map((topic) => {
    const hay = [
      topic.title,
      topic.description,
      topic.category,
      ...(topic.keywords || []),
      topic.audience || '',
    ]
      .join(' ')
      .toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (hay.includes(term)) score += 2;
      if (topic.title.toLowerCase().includes(term)) score += 4;
      if (topic.keywords?.some((k) => k.includes(term))) score += 1;
    }
    return { topic, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.topic);
}

export function getHelpCategories(topics = []) {
  const set = new Set(topics.map((t) => t.category).filter(Boolean));
  return [...set].sort();
}

export function getHelpTopicById(id, topics = []) {
  return topics.find((t) => t.id === id) || null;
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
