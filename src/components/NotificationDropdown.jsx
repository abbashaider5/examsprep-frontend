import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Bell, BookOpen, Check, CheckCheck, Info, Megaphone, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { announcementApi, notificationApi } from '../services/api.js';

const TYPE_DOT = {
  info:        'bg-blue-500',
  warning:     'bg-amber-500',
  success:     'bg-green-500',
  error:       'bg-red-500',
  exam_shared: 'bg-[var(--color-primary)]',
  general:     'bg-gray-400',
};

function getNotifIcon(type) {
  if (type === 'exam_shared')  return <BookOpen size={13} className="text-[var(--color-primary)]" />;
  if (type === 'group_invite') return <Users size={13} className="text-green-500" />;
  if (type === 'warning')      return <AlertTriangle size={13} className="text-amber-500" />;
  if (type === 'error')        return <AlertCircle size={13} className="text-red-500" />;
  if (type === 'success')      return <Check size={13} className="text-green-500" />;
  return <Info size={13} className="text-blue-500" />;
}

function fmtDate(d) {
  const dt   = new Date(d);
  const diff = (Date.now() - dt) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref      = useRef(null);
  const qc       = useQueryClient();
  const navigate = useNavigate();

  // Announcements
  const { data: annData } = useQuery({
    queryKey: ['announcements'],
    queryFn:  () => announcementApi.getAll().then(r => r.data),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  });
  const announcements = annData?.announcements || [];

  // User notifications (exam shared, etc.)
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationApi.getAll().then(r => r.data),
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
  const userNotifs = notifData?.notifications || [];

  // Merge and sort by createdAt desc
  const allItems = [
    ...userNotifs.map(n => ({ ...n, _source: 'notif' })),
    ...announcements.map(a => ({ ...a, _source: 'ann' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = allItems.filter(i => !i.isRead).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Mutations — announcements
  const annReadMut = useMutation({
    mutationFn: (id) => announcementApi.markRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });
  const annDismissMut = useMutation({
    mutationFn: (id) => announcementApi.dismiss(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  });

  // Mutations — user notifications
  const notifReadMut = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const notifDeleteMut = useMutation({
    mutationFn: (id) => notificationApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAllReadMut = useMutation({
    mutationFn: async () => {
      await notificationApi.markAllRead();
      announcements.filter(a => !a.isRead).forEach(a => annReadMut.mutate(a._id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const handleItemClick = (item) => {
    if (item._source === 'notif') {
      notifReadMut.mutate(item._id);
      setOpen(false);
      navigate(`/notifications/${item._id}`);
    } else {
      annReadMut.mutate(item._id);
      if (item.link) { setOpen(false); navigate(item.link); }
    }
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
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
              <Bell size={14} className="text-[var(--color-primary)]" />
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
                  onClick={() => markAllReadMut.mutate()}
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
          <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--color-border)]">
            {allItems.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
                <p className="text-sm font-medium text-[var(--color-text)]">All caught up!</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">No notifications right now.</p>
              </div>
            ) : (
              allItems.map(item => {
                const isAnn  = item._source === 'ann';
                const dotCol = TYPE_DOT[item.type] || 'bg-gray-400';
                return (
                  <div
                    key={`${item._source}-${item._id}`}
                    onClick={() => handleItemClick(item)}
                    className={`px-4 py-3 transition-colors cursor-pointer
                      ${!item.isRead ? 'bg-[var(--color-bg-alt)]/50' : 'hover:bg-[var(--color-bg-alt)]/30'}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Type icon */}
                      <div className="mt-0.5 shrink-0">
                        {getNotifIcon(item.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {!item.isRead && (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCol}`} />
                          )}
                          <p className={`text-xs truncate ${!item.isRead ? 'font-bold text-[var(--color-text)]' : 'font-semibold text-[var(--color-text)]'}`}>
                            {item.title}
                          </p>
                        </div>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed line-clamp-2">
                          {item.message}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-[var(--color-text-muted)]">{fmtDate(item.createdAt)}</p>
                          {!isAnn && (
                            <span className="text-[10px] text-[var(--color-primary)] font-medium">View details →</span>
                          )}
                          {isAnn && item.link && (
                            <span className="text-[10px] text-[var(--color-primary)] font-medium">Tap to view →</span>
                          )}
                        </div>
                      </div>

                      {/* Dismiss / Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          isAnn ? annDismissMut.mutate(item._id) : notifDeleteMut.mutate(item._id);
                        }}
                        className="p-1 rounded hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] shrink-0 transition-colors"
                        title="Dismiss"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {allItems.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
              <p className="text-[10px] text-center text-[var(--color-text-muted)]">
                {allItems.length} notification{allItems.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
