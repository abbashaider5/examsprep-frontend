import { useQuery } from '@tanstack/react-query';
import { Flame, Star, Trophy, Users, Zap } from 'lucide-react';
import { useState } from 'react';
import { groupApi, leaderboardApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM_RING = [
  'ring-2 ring-yellow-400 shadow-yellow-200 dark:shadow-yellow-900/30',
  'ring-2 ring-slate-300 dark:ring-slate-500',
  'ring-2 ring-orange-300 dark:ring-orange-600',
];
const PODIUM_BG = [
  'bg-gradient-to-b from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/10 border-yellow-200 dark:border-yellow-800',
  'bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/30 border-slate-200 dark:border-slate-700',
  'bg-gradient-to-b from-orange-50 to-amber-50/50 dark:from-orange-900/20 dark:to-amber-900/10 border-orange-200 dark:border-orange-800',
];
const PODIUM_HEIGHT = ['h-28', 'h-20', 'h-16'];

function Avatar({ name, size = 'md' }) {
  const sz = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-[var(--color-primary)] to-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function PodiumCard({ user, rank }) {
  const i = rank - 1;
  return (
    <div className={`flex flex-col items-center gap-2 ${rank === 1 ? 'mt-0' : 'mt-6'}`}>
      <div className="relative">
        <Avatar name={user.name} size="lg" />
        <span className="absolute -top-2 -right-2 text-lg leading-none">{MEDAL[i]}</span>
      </div>
      <div className="text-center max-w-[90px]">
        <p className="text-xs font-bold text-[var(--color-text)] truncate">{user.name}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">Lv. {user.level}</p>
      </div>
      <div className={`w-24 border rounded-t-xl flex items-end justify-center pb-3 ${PODIUM_HEIGHT[i]} ${PODIUM_BG[i]}`}>
        <div className="text-center">
          <p className="text-sm font-extrabold text-[var(--color-primary)]">{user.xp.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--color-text-muted)]">XP</p>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user: me } = useAuthStore();
  const [selectedBatch, setSelectedBatch] = useState(null); // null = global

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => leaderboardApi.get().then(r => r.data),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.getAll().then(r => r.data),
  });

  const myBatches = groupsData?.groups || [];

  const board = data?.leaderboard || [];

  // If a batch is selected, filter leaderboard to only batch members
  const filteredBoard = selectedBatch
    ? (() => {
        const batch = myBatches.find(g => g._id === selectedBatch);
        if (!batch) return board;
        const memberIds = new Set([
          ...(batch.members || []).map(m => (m._id || m).toString()),
          batch.instructor ? (batch.instructor._id || batch.instructor).toString() : null,
        ].filter(Boolean));
        return board.filter(u => memberIds.has(u._id?.toString()));
      })()
    : board;

  const top3 = filteredBoard.slice(0, 3);
  const rest = filteredBoard.slice(3);
  const myRank = filteredBoard.findIndex(u => u.name === me?.name);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 px-6 py-6 mb-6 shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-36 h-36 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Trophy size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white leading-tight">Leaderboard</h1>
            <p className="text-sm text-teal-100 mt-0.5">Top learners ranked by XP earned this month</p>
          </div>
        </div>
      </div>

      {/* Batch filter */}
      {myBatches.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <Users size={13} className="text-[var(--color-text-muted)] shrink-0" />
          <button
            onClick={() => setSelectedBatch(null)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
              selectedBatch === null
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
            }`}
          >
            All Users
          </button>
          {myBatches.map(g => (
            <button
              key={g._id}
              onClick={() => setSelectedBatch(g._id)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                selectedBatch === g._id
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Users size={10} />
              {g.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      ) : filteredBoard.length === 0 ? (
        <div className="card text-center py-16">
          <Trophy size={40} className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-30" />
          <p className="text-[var(--color-text-muted)] font-medium">
            {selectedBatch ? 'No ranked members in this batch yet.' : 'No rankings yet. Be the first!'}
          </p>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length >= 1 && (
            <div className="flex items-end justify-center gap-3 mb-10 px-4">
              {/* 2nd */}
              {top3[1] && <PodiumCard user={top3[1]} rank={2} />}
              {/* 1st */}
              {top3[0] && <PodiumCard user={top3[0]} rank={1} />}
              {/* 3rd */}
              {top3[2] && <PodiumCard user={top3[2]} rank={3} />}
            </div>
          )}

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card text-center py-3">
              <p className="text-lg font-extrabold text-[var(--color-primary)]">{filteredBoard.length}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Competitors</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-lg font-extrabold text-[var(--color-primary)]">{filteredBoard[0]?.xp?.toLocaleString() || 0}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Top XP</p>
            </div>
            <div className="card text-center py-3">
              <p className="text-lg font-extrabold text-[var(--color-primary)]">{myRank >= 0 ? `#${myRank + 1}` : '—'}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Your Rank</p>
            </div>
          </div>

          {/* Rest of the table (4th onward) */}
          {rest.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="divide-y divide-[var(--color-border)]">
                {rest.map((u, i) => {
                  const rank = i + 4;
                  const isMe = u.name === me?.name;
                  return (
                    <div key={u._id || i} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-bg-alt)]'}`}>
                      <span className="w-7 text-center text-xs font-bold text-[var(--color-text-muted)]">#{rank}</span>
                      <Avatar name={u.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMe ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                          {u.name} {isMe && <span className="text-[10px] font-medium opacity-70">(you)</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[var(--color-text-muted)]">Lv. {u.level}</span>
                          {u.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-orange-500">
                              <Flame size={9} />{u.streak}d
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 justify-end text-sm font-bold text-[var(--color-primary)]">
                          <Star size={12} />{u.xp.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{u.totalExams} exams</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* If current user not in top 10, show their rank at bottom */}
          {myRank < 0 && me && (
            <div className="mt-4 card border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 flex items-center gap-3 px-4 py-3">
              <span className="w-7 text-center text-xs font-bold text-[var(--color-text-muted)]">—</span>
              <Avatar name={me.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-primary)] truncate">{me.name} <span className="text-[10px] font-medium opacity-70">(you)</span></p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Not in top 10 yet</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end text-sm font-bold text-[var(--color-primary)]">
                  <Star size={12} />{(me.xp || 0).toLocaleString()}
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)]">Make your profile public to rank</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
