import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { announcementApi } from '../services/api.js';

const STYLES = {
  info: {
    wrap:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/60',
    icon:   Info,
    ic:     'text-blue-500',
    title:  'text-blue-800 dark:text-blue-200',
    msg:    'text-blue-700 dark:text-blue-300',
    close:  'hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-500',
  },
  warning: {
    wrap:   'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/60',
    icon:   AlertTriangle,
    ic:     'text-amber-500',
    title:  'text-amber-800 dark:text-amber-200',
    msg:    'text-amber-700 dark:text-amber-300',
    close:  'hover:bg-amber-100 dark:hover:bg-amber-800/40 text-amber-500',
  },
  success: {
    wrap:   'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/60',
    icon:   CheckCircle,
    ic:     'text-green-500',
    title:  'text-green-800 dark:text-green-200',
    msg:    'text-green-700 dark:text-green-300',
    close:  'hover:bg-green-100 dark:hover:bg-green-800/40 text-green-500',
  },
  error: {
    wrap:   'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/60',
    icon:   AlertCircle,
    ic:     'text-red-500',
    title:  'text-red-800 dark:text-red-200',
    msg:    'text-red-700 dark:text-red-300',
    close:  'hover:bg-red-100 dark:hover:bg-red-800/40 text-red-500',
  },
};

export default function AnnouncementBanner() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn:  () => announcementApi.getAll().then(r => r.data),
    staleTime: 60 * 1000,
  });

  const dismissMut = useMutation({
    mutationFn: (id) => announcementApi.dismiss(id),
    onMutate: async (id) => {
      // Optimistic update — instantly hide the banner
      await qc.cancelQueries({ queryKey: ['announcements'] });
      const prev = qc.getQueryData(['announcements']);
      qc.setQueryData(['announcements'], (old) => ({
        ...old,
        announcements: (old?.announcements || []).filter(a => a._id !== id),
      }));
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['announcements'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const visible = (data?.announcements || []).filter(a => !a.isDismissed);
  if (!visible.length) return null;

  return (
    <div className="shrink-0">
      {visible.slice(0, 3).map((a, idx) => {
        const s    = STYLES[a.type] || STYLES.info;
        const Icon = s.icon;
        return (
          <div
            key={a._id}
            className={`flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b border-[var(--color-border)] ${s.wrap} ${idx === 0 ? '' : 'border-t-0'}`}
          >
            <Icon size={14} className={`shrink-0 ${s.ic}`} />
            <p className="flex-1 text-xs min-w-0 truncate">
              <span className={`font-semibold ${s.title}`}>{a.title}</span>
              <span className={`ml-1.5 ${s.msg}`}>{a.message}</span>
            </p>
            <button
              onClick={() => dismissMut.mutate(a._id)}
              className={`p-1 rounded transition-colors shrink-0 ${s.close}`}
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
