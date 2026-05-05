import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, Filter, LifeBuoy, MessageSquareReply, Send, UploadCloud } from 'lucide-react';
import { Fragment, useState } from 'react';
import toast from 'react-hot-toast';
import { ticketApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const USER_TICKET_TYPES = [
  'Login / Account Issue',
  'AI Proctoring Issue',
  'Result Issue',
  'Payment / Subscription Issue',
  'Platform Bug',
  'Feature Request',
  'Other',
];

const INSTRUCTOR_TICKET_TYPES = [
  'Test Creation Issue',
  'Student Management Issue',
  'AI Proctoring Issue',
  'Result / Analytics Issue',
  'Payment / Subscription Issue',
  'Platform Bug',
  'Feature Request',
  'Other',
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const statusPill = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function InstructorTicketCard({ ticket }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h3 className="font-semibold text-[var(--color-text)]">{ticket.title}</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {ticket.ticketId || '—'} · {ticket.type} · {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusPill[ticket.status] || statusPill.open}`}>
          {ticket.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{ticket.description}</p>

      {ticket.attachment?.url && (
        <a href={ticket.attachment.url} target="_blank" rel="noreferrer" className="inline-flex mt-3 text-xs text-[var(--color-primary)] hover:underline">
          View attachment ({ticket.attachment.originalName || 'file'})
        </a>
      )}

      {(ticket.adminResponse || ticket.respondedAt) && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--color-bg-alt)]">
          <p className="text-xs font-semibold text-[var(--color-text)] mb-1 flex items-center gap-1">
            <MessageSquareReply size={12} /> Admin response
          </p>
          <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{ticket.adminResponse || 'No response yet.'}</p>
        </div>
      )}
    </div>
  );
}

export default function TicketsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  const ticketTypes = isAdmin ? INSTRUCTOR_TICKET_TYPES : (isInstructor ? INSTRUCTOR_TICKET_TYPES : USER_TICKET_TYPES);

  const [form, setForm] = useState({ title: '', description: '', type: '' });
  const [attachment, setAttachment] = useState(null);
  const [instructorView, setInstructorView] = useState('create');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', type: '', search: '', fromDate: '', toDate: '' });
  const [respondingId, setRespondingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [draftStatus, setDraftStatus] = useState('open');
  const [draftResponse, setDraftResponse] = useState('');

  const ticketsQuery = useQuery({
    queryKey: ['tickets', isAdmin, filters, page],
    queryFn: () => (
      isAdmin
        ? ticketApi.adminGetAll({ ...filters, page }).then(r => r.data)
        : ticketApi.getMine(page).then(r => r.data)
    ),
  });

  const createMut = useMutation({
    mutationFn: () => ticketApi.create({ ...form, attachment }),
    onSuccess: (res) => {
      const createdId = res?.data?.ticket?.ticketId;
      toast.success(createdId ? `Ticket created: ${createdId}` : 'Ticket created');
      setForm({ title: '', description: '', type: '' });
      setAttachment(null);
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create ticket'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => ticketApi.adminUpdate(id, payload),
    onSuccess: () => {
      toast.success('Ticket updated');
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setRespondingId(null);
      setDraftResponse('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update ticket'),
  });

  const tickets = ticketsQuery.data?.tickets || [];
  const totalPages = ticketsQuery.data?.pages || 1;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center gap-2">
            <LifeBuoy size={22} className="text-[var(--color-primary)]" /> Ticketing
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Track support requests with status, replies and attachments.</p>
        </div>
      </div>

      {!isAdmin && (
        <>
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setInstructorView('create')}
              className={`text-sm px-4 py-2 rounded-lg ${instructorView === 'create' ? 'bg-[var(--color-primary)] text-white' : 'btn-secondary'}`}
            >
              Raise Ticket
            </button>
            <button
              type="button"
              onClick={() => setInstructorView('list')}
              className={`text-sm px-4 py-2 rounded-lg ${instructorView === 'list' ? 'bg-[var(--color-primary)] text-white' : 'btn-secondary'}`}
            >
              View Tickets
            </button>
          </div>

          {instructorView === 'create' && (
            <div className="card mb-6">
              <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">Raise a support ticket</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Ticket type *</label>
                  <select className="input" value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="">Select ticket type</option>
                    {ticketTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Attachment (optional)</label>
                  <label className="input flex items-center gap-2 cursor-pointer">
                    <UploadCloud size={15} className="text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-text-muted)] truncate">{attachment?.name || 'Upload screenshot/image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Title</label>
                  <input className="input" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Short summary of your issue" />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Description</label>
                  <textarea className="input min-h-28" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe what happened, expected behavior and steps to reproduce" />
                </div>
              </div>
              <div className="mt-4">
                <button
                  className="btn-primary text-sm py-2.5 px-5 inline-flex items-center gap-2 disabled:opacity-60"
                  disabled={createMut.isPending}
                  onClick={() => {
                    if (!form.title.trim() || !form.description.trim() || !form.type) {
                      toast.error('Please fill title, description and ticket type.');
                      return;
                    }
                    createMut.mutate();
                  }}
                >
                  <Send size={14} /> {createMut.isPending ? 'Submitting...' : 'Submit ticket'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isAdmin && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-[var(--color-text)]">
            <Filter size={15} className="text-[var(--color-primary)]" /> Filter Tickets
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select className="input text-sm" value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="input text-sm" value={filters.type} onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}>
              <option value="">All ticket types</option>
              {INSTRUCTOR_TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" className="input text-sm" value={filters.fromDate} onChange={(e) => setFilters(p => ({ ...p, fromDate: e.target.value }))} />
            <input type="date" className="input text-sm" value={filters.toDate} onChange={(e) => setFilters(p => ({ ...p, toDate: e.target.value }))} />
            <input className="input text-sm" placeholder="Search title or description" value={filters.search} onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))} />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(isAdmin || instructorView === 'list') && (ticketsQuery.isLoading ? (
          <div className="card text-sm text-[var(--color-text-muted)]">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="card text-center py-10">
            <AlertCircle size={32} className="mx-auto mb-3 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-text-muted)]">No tickets found.</p>
          </div>
        ) : isAdmin ? (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]">
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Ticket ID</th>
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Attachment</th>
                  <th className="text-left px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <Fragment key={ticket._id}>
                    <tr key={ticket._id} className="border-b border-[var(--color-border)] align-top">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{ticket.ticketId || '-'}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--color-text)]">{ticket.user?.name || '-'}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{ticket.user?.email || '-'}</div>
                      </td>
                      <td className="px-3 py-2 min-w-[240px]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-[var(--color-text)] truncate">{ticket.title}</div>
                            <div className="text-xs text-[var(--color-text-muted)] line-clamp-2">{ticket.description}</div>
                          </div>
                          <button
                            type="button"
                            className="btn-secondary text-[11px] py-1 px-2 shrink-0"
                            onClick={() => setExpandedId(expandedId === ticket._id ? null : ticket._id)}
                          >
                            {expandedId === ticket._id ? 'Hide' : 'Expand'}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">{ticket.type}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full capitalize w-fit ${statusPill[ticket.status] || statusPill.open}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            {new Date(ticket.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {ticket.attachment?.url ? (
                          <a href={ticket.attachment.url} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline">
                            View
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="btn-secondary text-xs py-1 px-2"
                          onClick={() => {
                            setRespondingId(respondingId === ticket._id ? null : ticket._id);
                            setDraftStatus(ticket.status);
                            setDraftResponse(ticket.adminResponse || '');
                          }}
                        >
                          {respondingId === ticket._id ? 'Close' : 'Respond'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === ticket._id && (
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]/30">
                        <td className="px-3 py-3" colSpan={8}>
                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <div className="text-xs font-semibold text-[var(--color-text)]">Title</div>
                              <div className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{ticket.title}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-[var(--color-text)]">Description</div>
                              <div className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{ticket.description}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {respondingId === ticket._id && (
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
                        <td className="px-3 py-3" colSpan={8}>
                          <div className="grid grid-cols-1 lg:grid-cols-[200px,1fr,auto] gap-3 items-start">
                            <select className="input text-sm" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value)}>
                              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <textarea className="input min-h-20 text-sm" value={draftResponse} onChange={(e) => setDraftResponse(e.target.value)} placeholder="Write response to instructor" />
                            <button
                              type="button"
                              disabled={updateMut.isPending}
                              className="btn-primary text-sm py-2 px-4 disabled:opacity-60"
                              onClick={() => updateMut.mutate({ id: ticket._id, payload: { status: draftStatus, adminResponse: draftResponse } })}
                            >
                              {updateMut.isPending ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          tickets.map(ticket => (
            <InstructorTicketCard
              key={ticket._id}
              ticket={ticket}
            />
          ))
        ))}
      </div>

      {(isAdmin || instructorView === 'list') && tickets.length > 0 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">Page {page} / {totalPages}</span>
          <button
            type="button"
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      <div className="mt-5 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1"><Clock3 size={12} /> Open / In Progress are active tickets</span>
        <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> Resolved / Closed indicate completion</span>
      </div>
    </div>
  );
}
