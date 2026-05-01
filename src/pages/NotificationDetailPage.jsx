import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle, AlertTriangle, ArrowLeft, BookOpen, CheckCircle,
    Clock, Info, Shield, Trash2, Users,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { notificationApi } from '../services/api.js';

const SEVERITY_CONFIG = {
  critical: {
    color:  'text-red-600 dark:text-red-400',
    bg:     'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon:   AlertCircle,
  },
  warning: {
    color:  'text-amber-600 dark:text-amber-400',
    bg:     'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon:   AlertTriangle,
  },
  success: {
    color:  'text-green-600 dark:text-green-400',
    bg:     'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon:   CheckCircle,
  },
  info: {
    color:  'text-blue-600 dark:text-blue-400',
    bg:     'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon:   Info,
  },
};

function getTypeIcon(type) {
  if (['exam_shared', 'exam_invite', 'exam_invite_accepted', 'exam_result'].includes(type)) return BookOpen;
  if (type === 'group_invite') return Users;
  if (type === 'exam_terminated') return Shield;
  if (type === 'warning') return AlertTriangle;
  if (type === 'error') return AlertCircle;
  if (type === 'success') return CheckCircle;
  return Info;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function NotificationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notification', id],
    queryFn: () => notificationApi.getById(id).then(r => r.data),
    staleTime: 30 * 1000,
  });

  const deleteMut = useMutation({
    mutationFn: () => notificationApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      navigate(-1);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.notification) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
        <p className="text-red-500 font-medium mb-4">Notification not found or you don't have access.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm">Go Back</button>
      </div>
    );
  }

  const notification = data.notification;
  const severity = notification.severity || 'info';
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const TypeIcon = getTypeIcon(notification.type);
  const SeverityIcon = cfg.icon;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Severity header */}
      <div className={`rounded-2xl border p-5 mb-4 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${cfg.border} ${cfg.bg}`}>
            <TypeIcon size={22} className={cfg.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                <SeverityIcon size={10} />
                {severity}
              </span>
              <span className="text-xs text-[var(--color-text-muted)] capitalize">
                {notification.type?.replace(/_/g, ' ')}
              </span>
              {!notification.isRead && (
                <span className="text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                  New
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-[var(--color-text)] leading-snug">{notification.title}</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="card mb-4 space-y-4">
        <p className="text-sm text-[var(--color-text)] leading-relaxed">{notification.message}</p>

        {notification.details && (
          <div className="p-3.5 bg-[var(--color-bg-alt)] rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line">
            {notification.details}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
          <Clock size={12} />
          <span>{fmtDate(notification.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {notification.link && (
          <Link
            to={notification.link}
            className="btn-primary text-sm flex-1 text-center py-2.5"
          >
            View Details
          </Link>
        )}
        <button
          onClick={() => deleteMut.mutate()}
          disabled={deleteMut.isPending}
          className="flex items-center gap-1.5 text-sm py-2.5 px-4 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} />
          {deleteMut.isPending ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
