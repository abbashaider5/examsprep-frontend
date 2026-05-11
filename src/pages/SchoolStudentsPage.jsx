import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, GraduationCap, Info, Mail, Upload, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Modal from '../components/Modal.jsx';
import { enterpriseApi } from '../services/api.js';

export default function SchoolStudentsPage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');

  const { data: classesData } = useQuery({
    queryKey: ['schoolClasses'],
    queryFn: () => enterpriseApi.schoolClasses().then((r) => r.data),
  });

  const { data } = useQuery({
    queryKey: ['schoolStudents', classId],
    queryFn: () => enterpriseApi.schoolStudents(classId || undefined).then((r) => r.data),
  });

  const inviteMut = useMutation({
    mutationFn: () => enterpriseApi.schoolInviteStudent({ name: name.trim(), email: email.trim(), schoolClassId: classId }),
    onSuccess: (res) => {
      if (res.data?.reusedAccount) toast.success('Existing student linked to this class.');
      else toast.success('Student account created');
      setName('');
      setEmail('');
      qc.invalidateQueries({ queryKey: ['schoolStudents'] });
      qc.invalidateQueries({ queryKey: ['schoolClasses'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const bulkMut = useMutation({
    mutationFn: () => enterpriseApi.schoolBulkInviteStudents(bulkRows.map((r) => ({ ...r, schoolClassId: bulkClassId }))),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Bulk upload finished');
      setBulkRows([]);
      setBulkClassId('');
      setBulkModalOpen(false);
      qc.invalidateQueries({ queryKey: ['schoolStudents'] });
      qc.invalidateQueries({ queryKey: ['schoolClasses'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Bulk upload failed'),
  });

  const handleExcelUpload = async (file) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const [header = [], ...body] = rows;
      const map = new Map(header.map((h, i) => [String(h || '').trim().toLowerCase(), i]));
      const nameIdx = map.get('name');
      const emailIdx = map.get('email');
      if (nameIdx == null || emailIdx == null) {
        toast.error('Excel must contain columns: name, email');
        return;
      }
      const parsed = body
        .map((r) => ({
          name: String(r[nameIdx] || '').trim(),
          email: String(r[emailIdx] || '').trim().toLowerCase(),
        }))
        .filter((r) => r.name || r.email);
      setBulkRows(parsed);
      toast.success(`Loaded ${parsed.length} rows`);
    } catch {
      toast.error('Failed to parse Excel file');
    }
  };
  const downloadBulkSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'email'],
      ['Aarav Sharma', 'aarav@example.com'],
      ['Ananya Patel', 'ananya@example.com'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_bulk_sample.xlsx');
  };

  const classes = classesData?.classes || [];
  const students = data?.students || [];

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/school/students" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6">
        <ArrowLeft size={16} /> Back to students
      </Link>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Students</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">Create a student account under a class.</p>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <section className="space-y-5">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Create student account</h2>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--color-text-muted)]">Class</label>
              <select className="input w-full mt-1" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select a class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}{c.section ? ` · ${c.section}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Student name</label>
                <input className="input w-full mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Email</label>
                <div className="relative mt-1">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input className="input w-full pl-8" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@email.com" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={inviteMut.isPending || !classId || !name.trim() || !email.trim()}
                className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold"
                onClick={() => inviteMut.mutate()}
              >
                {inviteMut.isPending ? 'Adding...' : 'Add student'}
              </button>
              <Link to="/school/students" className="btn-secondary inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold">
                View all students
              </Link>
              <button type="button" className="btn-secondary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2" onClick={() => setBulkModalOpen(true)}>
                <Upload size={14} /> Bulk Upload
              </button>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">A login is created instantly for the student. They can reset password from login if needed.</p>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-3">Overview</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center"><Users size={16} /></div>
                <div><p className="text-xs text-[var(--color-text-muted)]">Students listed</p><p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">{students.length}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center"><GraduationCap size={16} /></div>
                <div><p className="text-xs text-[var(--color-text-muted)]">Available classes</p><p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">{classes.length}</p></div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 mb-2"><Info size={15} className="text-[var(--color-primary)]" /><p className="text-sm font-semibold text-[var(--color-text)]">Helpful</p></div>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-2 leading-relaxed">
              <li>Select a class before creating a student account.</li>
              <li>Use unique email addresses for each student profile.</li>
              <li>Students can access only their own school organization data.</li>
            </ul>
          </div>
        </aside>
      </div>
      {bulkModalOpen && (
        <Modal onClose={() => setBulkModalOpen(false)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-6xl h-[520px] flex overflow-hidden">
            <div className="w-[45%] border-r border-[var(--color-border)] p-5 flex flex-col">
              <h3 className="font-semibold text-[var(--color-text)] mb-3">Bulk Upload</h3>
              <div className="rounded-xl border border-[var(--color-border)] p-3 text-xs text-[var(--color-text-muted)] space-y-2">
                <p>Rows loaded: <span className="font-semibold text-[var(--color-text)]">{bulkRows.length}</span></p>
                <div>
                  <p className="mb-1">Upload progress</p>
                  <div className="w-full h-2 bg-[var(--color-bg-alt)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-primary)]" style={{ width: `${bulkMut.isPending ? 70 : (bulkRows.length > 0 ? 100 : 0)}%` }} />
                  </div>
                </div>
                <p>Success: <span className="font-semibold text-emerald-600">{bulkMut.isSuccess ? bulkRows.length : 0}</span></p>
                <p>Error: <span className="font-semibold text-red-600">{bulkMut.isError ? 1 : 0}</span></p>
                <p>File status: <span className="font-semibold text-[var(--color-text)]">{bulkRows.length ? 'Ready' : 'Waiting for file'}</span></p>
              </div>
            </div>
            <div className="flex-1 p-5 flex flex-col">
              <h4 className="font-semibold text-[var(--color-text)] mb-2">Class Assignment</h4>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Select class (required before upload)</p>
              <select className="input w-full" value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)}>
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}{c.section ? ` · ${c.section}` : ''}</option>
                ))}
              </select>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 p-3 mt-3">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] cursor-pointer">
                  <Upload size={14} /> Upload Excel (.xlsx/.xls)
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && handleExcelUpload(e.target.files[0])} />
                </label>
                <button type="button" className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline mt-2" onClick={downloadBulkSample}>
                  <Download size={12} /> Download Sample Excel
                </button>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-2">Required columns: name, email</p>
              </div>
              <div className="mt-auto flex gap-2 pt-3">
                <button type="button" className="btn-secondary flex-1 py-2 rounded-xl text-sm" onClick={() => setBulkModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1 py-2 rounded-xl text-sm font-semibold"
                  disabled={!bulkRows.length || !bulkClassId || bulkMut.isPending}
                  onClick={() => bulkMut.mutate()}
                >
                  {bulkMut.isPending ? 'Uploading…' : 'Upload Students'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
