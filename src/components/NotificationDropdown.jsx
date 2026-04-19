import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Bell, Check, CheckCheck, Info, Megaphone, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { announcementApi } from '../services/api.js';

const TYPE_DOT = {
  info:    'bg-blue-500',
  warning: 'bg-amber-500',
  success: 'bg-green-500',
  error:   'bg-red-500',
};

const TYPE_ICON = {
  info:    Info,
  warning: AlertTriangle,
  success: Check,
  error:   AlertCircle,
};

const TYPE_ICON_COLOR = {
  info:    'text-blue-500',
  warning: 'text-amber-500',
  success: 'text-green-500',
  error:   'text-red-500',
};

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const qc  = useQueryClient();

  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn:  () => announcementApi.getAll().then(r => r.data),
    refetchInterval: 2 * 60 * 1000, // poll every 2 min
    staleTime: 60 * 1000,
  });

  const announcements = data?.announcements || [];
  const unreadCount   = announcements.filter(a => !a.isRead).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const readMut = useMutation({
    mutationFn: (id) => announcementApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const dismissMut = useMutation({
    mutationFn: (id) => announcementApi.dismiss(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const markAllRead = () => {
    announcements.filter(a => !a.isRead).forEach(a => readMut.mutate(a._id));
  };

  const handleOpen = () => {
    setOpen(o => !o);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Megaphone size={15} className="text-[var(--color-primary)]" />
              <span className="font-semibold text-sm text-[var(--color-text)]">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-[var(--color-primary)] text-white px-1.5 py-0.5 rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--color-border)]">
            {announcements.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
                <p className="text-sm font-medium text-[var(--color-text)]">All caught up!</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">No announcements right now.</p>
              </div>
            ) : (
              announcements.map(a => {
                const IconComp  = TYPE_ICON[a.type]      || Info;
                const iconColor = TYPE_ICON_COLOR[a.type] || 'text-blue-500';
                const dotColor  = TYPE_DOT[a.type]        || 'bg-blue-500';
                return (
                  <div
                    key={a._id}
                    className={`px-4 py-3 transition-colors ${!a.isRead ? 'bg-[var(--color-bg-alt)]/50' : 'hover:bg-[var(--color-bg-alt)]/30'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Type icon */}
                      <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                        <IconComp size={13} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {!a.isRead && (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                          )}
                          <p className={`text-xs truncate ${!a.isRead ? 'font-bold text-[var(--color-text)]' : 'font-semibold text-[var(--color-text)]'}`}>
                            {a.title}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed line-clamp-2">
                          {a.message}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{fmtDate(a.createdAt)}</p>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => dismissMut.mutate(a._id)}
                        className="p-1 rounded hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] shrink-0 transition-colors"
                        title="Dismiss"
                      >
                        <X size={11} />
                      </button>
                    </div>

                    {/* Mark read (if unread) */}
                    {!a.isRead && (
                      <button
                        onClick={() => readMut.mutate(a._id)}
                        className="mt-1.5 ml-5 flex items-center gap-1 text-[10px] text-[var(--color-primary)] hover:underline"
                      >
                        <Check size={9} /> Mark as read
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {announcements.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
              <p className="text-[10px] text-center text-[var(--color-text-muted)]">
                {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
