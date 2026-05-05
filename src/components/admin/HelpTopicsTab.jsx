import { BookOpen, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../ConfirmDialog.jsx';
import HelpArticleView from '../HelpArticleView.jsx';
import Modal from '../Modal.jsx';
import { adminApi } from '../../services/api.js';
import { parseYoutubeVideoId } from '../../utils/youtubeEmbed.js';

const AUDIENCES = [
  { value: 'user', label: 'Student / user' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'admin', label: 'Admin' },
];

function emptySection() {
  return {
    heading: '',
    paragraphsText: '',
    bulletsText: '',
  };
}

function topicToForm(t) {
  return {
    topicId: t.topicId || t.id,
    title: t.title || '',
    description: t.description || '',
    category: t.category || '',
    audience: t.audience || 'user',
    videoUrl: t.videoUrl || '',
    keywords: Array.isArray(t.keywords) ? t.keywords.join(', ') : '',
    sections:
      t.sections?.length > 0
        ? t.sections.map((s) => ({
            heading: s.heading || '',
            paragraphsText: (s.paragraphs || []).join('\n\n'),
            bulletsText: (s.bullets || []).join('\n'),
          }))
        : [emptySection()],
  };
}

function formToPayload(form, options = {}) {
  const { requireTopicId = true } = options;
  const sections = (form.sections || []).map((s) => {
    const paragraphs = String(s.paragraphsText || '')
      .split(/\n\s*\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const bullets = String(s.bulletsText || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    return {
      heading: String(s.heading || '').trim(),
      paragraphs,
      bullets,
    };
  });

  for (const sec of sections) {
    if (!sec.heading) throw new Error('Each section needs a heading.');
    if (!sec.paragraphs.length && !sec.bullets.length) {
      throw new Error(`Section "${sec.heading || '(unnamed)'}" needs body text or bullets.`);
    }
  }

  const keywords = form.keywords
    .split(/[,;]/)
    .map((k) => k.trim())
    .filter(Boolean);

  let videoUrl = '';
  const rawVideo = String(form.videoUrl || '').trim();
  if (rawVideo) {
    if (!parseYoutubeVideoId(rawVideo)) {
      throw new Error('Enter a valid YouTube URL or clear the video field.');
    }
    videoUrl = rawVideo;
  }

  const payload = {
    topicId: String(form.topicId || '').trim(),
    title: String(form.title || '').trim(),
    description: String(form.description || '').trim(),
    category: String(form.category || '').trim(),
    audience: form.audience,
    keywords,
    sections,
    videoUrl,
  };

  if (requireTopicId && !payload.topicId) throw new Error('Topic ID is required.');
  if (!payload.title) throw new Error('Title is required.');
  if (!payload.description) throw new Error('Description is required.');
  if (!payload.category) throw new Error('Category is required.');
  if (!sections.length) throw new Error('At least one section is required.');

  return payload;
}

export default function HelpTopicsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => ({
    topicId: '',
    title: '',
    description: '',
    category: 'Getting started',
    audience: 'user',
    videoUrl: '',
    keywords: '',
    sections: [{ heading: 'Overview', paragraphsText: '', bulletsText: '' }],
  }));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTopic, setPreviewTopic] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-help-topics'],
    queryFn: () => adminApi.helpTopics().then((r) => r.data),
  });

  const topics = data?.topics || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(
      (t) =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.topicId || t.id || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
    );
  }, [topics, search]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form, { requireTopicId: true });
      if (editingId) {
        return adminApi.updateHelpTopic(editingId, payload);
      }
      return adminApi.createHelpTopic(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-help-topics'] });
      qc.invalidateQueries({ queryKey: ['help-topics'] });
      toast.success(editingId ? 'Article updated' : 'Article created');
      setEditorOpen(false);
      setEditingId(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.join?.(', ') || err.message;
      toast.error(msg || 'Save failed');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (topicId) => adminApi.deleteHelpTopic(topicId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-help-topics'] });
      qc.invalidateQueries({ queryKey: ['help-topics'] });
      toast.success('Article deleted');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Delete failed'),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      topicId: '',
      title: '',
      description: '',
      category: 'Getting started',
      audience: 'user',
      videoUrl: '',
      keywords: '',
      sections: [{ heading: 'Overview', paragraphsText: '', bulletsText: '' }],
    });
    setEditorOpen(true);
  };

  const openEdit = (t) => {
    const id = t.topicId || t.id;
    setEditingId(id);
    setForm(topicToForm(t));
    setEditorOpen(true);
  };

  const addSection = () => {
    setForm((f) => ({ ...f, sections: [...f.sections, emptySection()] }));
  };

  const updateSection = (index, patch) => {
    setForm((f) => {
      const sections = [...f.sections];
      sections[index] = { ...sections[index], ...patch };
      return { ...f, sections };
    });
  };

  const removeSection = (index) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.length <= 1 ? f.sections : f.sections.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            className="input pl-9 w-full"
            placeholder="Search by title, ID, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2 shrink-0">
          <Plus size={16} /> New article
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
                <th className="py-3 px-4 font-medium">Topic ID</th>
                <th className="py-3 px-4 font-medium">Title</th>
                <th className="py-3 px-4 font-medium">Audience</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--color-text-muted)]">
                    <RefreshCw size={22} className="animate-spin mx-auto" />
                  </td>
                </tr>
              )}
              {!isLoading &&
                filtered.map((t) => {
                  const id = t.topicId || t.id;
                  return (
                    <tr key={id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-alt)]/60">
                      <td className="py-3 px-4 font-mono text-xs text-[var(--color-text-muted)]">{id}</td>
                      <td className="py-3 px-4 font-medium text-[var(--color-text)]">{t.title}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex rounded-lg px-2 py-0.5 text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          {t.audience}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--color-text-muted)]">{t.category}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-xs font-medium text-[var(--color-primary)] hover:underline mr-3"
                          onClick={() => setPreviewTopic(t)}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          className="inline-flex p-1.5 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                          aria-label="Edit"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="inline-flex p-1.5 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-red-600"
                          aria-label="Delete"
                          onClick={() => setDeleteTarget(id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!isLoading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">No articles match your search.</p>
        )}
      </div>

      {editorOpen && (
      <Modal
        onClose={() => {
          if (!saveMut.isPending) {
            setEditorOpen(false);
            setEditingId(null);
          }
        }}
      >
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-5 border-b border-[var(--color-border)] shrink-0">
            <h3 className="text-lg font-bold text-[var(--color-text)]">{editingId ? 'Edit help article' : 'New help article'}</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Define the URL slug, audience, and sections. Use **text** for bold in paragraphs and bullets.</p>
          </div>
        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto p-5 pr-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Topic ID (URL slug)</label>
              <input
                className="input font-mono text-sm"
                placeholder="e.g. create-tests"
                value={form.topicId}
                disabled={Boolean(editingId)}
                onChange={(e) => setForm((f) => ({ ...f, topicId: e.target.value }))}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Lowercase letters, numbers, hyphens. Cannot change after create.</p>
            </div>
            <div>
              <label className="label">Audience</label>
              <select
                className="input"
                value={form.audience}
                onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Short description (search & cards)</label>
            <textarea
              className="input min-h-[88px] text-sm leading-relaxed"
              spellCheck
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">YouTube video URL (optional)</label>
            <input
              type="url"
              className="input font-mono text-xs sm:text-sm"
              placeholder="https://www.youtube.com/watch?v=… or https://youtu.be/…"
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
            />
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Shown above the article sections. Leave blank for text-only.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div>
              <label className="label">Keywords (comma-separated)</label>
              <input
                className="input"
                placeholder="exam, test, grade"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4 space-y-4">
            <h4 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <BookOpen size={16} /> Sections
            </h4>
            {form.sections.map((sec, idx) => (
              <div key={idx} className="rounded-xl border border-[var(--color-border)] p-4 space-y-3 bg-[var(--color-bg-alt)]/40">
                <div className="flex items-start justify-between gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Section heading"
                    value={sec.heading}
                    onChange={(e) => updateSection(idx, { heading: e.target.value })}
                  />
                  {form.sections.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline shrink-0"
                      onClick={() => removeSection(idx)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div>
                  <label className="label text-xs">Paragraphs</label>
                  <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">
                    Separate paragraphs with a blank line. Use **double asterisks** for bold.
                  </p>
                  <textarea
                    className="input min-h-[160px] text-sm leading-relaxed text-[var(--color-text)]"
                    spellCheck
                    value={sec.paragraphsText}
                    onChange={(e) => updateSection(idx, { paragraphsText: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Bullets</label>
                  <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">One bullet per line.</p>
                  <textarea
                    className="input min-h-[120px] text-sm leading-relaxed text-[var(--color-text)]"
                    spellCheck
                    value={sec.bulletsText}
                    onChange={(e) => updateSection(idx, { bulletsText: e.target.value })}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="w-full py-3 rounded-xl border border-dashed border-[var(--color-border)] text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors"
              onClick={addSection}
            >
              + Add section
            </button>
          </div>
        </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 shrink-0">
            <button
              type="button"
              className="btn-secondary"
              disabled={saveMut.isPending}
              onClick={() => {
                if (!saveMut.isPending) {
                  setEditorOpen(false);
                  setEditingId(null);
                }
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn-primary inline-flex items-center gap-2" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? <RefreshCw size={14} className="animate-spin" /> : null}
              {editingId ? 'Save changes' : 'Create article'}
            </button>
          </div>
        </div>
      </Modal>
      )}

      {previewTopic && (
        <Modal onClose={() => setPreviewTopic(null)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <HelpArticleView topic={previewTopic} />
            <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex justify-end">
              <button type="button" className="btn-secondary text-sm" onClick={() => setPreviewTopic(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete help article?"
        description="This removes the article from the help center for that audience."
        confirmLabel="Delete"
        variant="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget)}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}
