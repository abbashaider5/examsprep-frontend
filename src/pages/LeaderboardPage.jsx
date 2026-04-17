import { useQuery } from '@tanstack/react-query';
import { Flame, Star, Trophy } from 'lucide-react';
import { leaderboardApi } from '../services/api.js';

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get().then(r => r.data),
  });

  const board = data?.leaderboard || [];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="text-center mb-10">
        <Trophy size={40} className="mx-auto mb-3 text-[var(--color-secondary)]" />
        <h1 className="text-3xl font-extrabold text-[var(--color-text)]">Monthly Leaderboard</h1>
        <p className="text-[var(--color-text-muted)] mt-2 text-sm">Top 10 based on XP earned this month</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 w-full" />)}</div>
      ) : board.length === 0 ? (
        <div className="card text-center py-12 text-[var(--color-text-muted)]">No data yet. Be the first!</div>
      ) : (
        <div className="space-y-3">
          {board.map((u, i) => (
            <div key={u._id} className={`card flex items-center gap-4 ${i === 0 ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' : i === 1 ? 'border-gray-300 dark:border-gray-600' : i === 2 ? 'border-orange-300 dark:border-orange-700' : ''}`}>
              <div className={`text-2xl font-extrabold w-10 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-[var(--color-text-muted)]'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-sm shrink-0">
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[var(--color-text)] text-sm truncate">{u.name}</div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mt-0.5">
                  <span className="badge bg-[var(--color-bg-alt)]">{u.level}</span>
                  {u.streak > 0 && <span className="flex items-center gap-0.5 text-orange-500"><Flame size={10} />{u.streak}d</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[var(--color-primary)] flex items-center gap-1"><Star size={14} />{u.xp} XP</div>
                <div className="text-xs text-[var(--color-text-muted)]">{u.totalExams} exams</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
