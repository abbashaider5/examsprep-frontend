import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import {
  ArrowLeft, Award, BadgeCheck, BarChart2, Building2, Camera, Check, Edit3, Loader2, Settings, Shield, Star, Trophy, User, X, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import VerifiedName from '../components/VerifiedName.jsx';
import { profileApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const PLAN_INFO = {
  free:       { label: 'Free',       color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', icon: Zap },
  pro:        { label: 'Pro',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', icon: Shield },
  enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', icon: Trophy },
};

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'org-access', label: 'Organization access', icon: Building2, orgManagedInstructorOnly: true },
  { id: 'performance', label: 'Performance', icon: Star },
];

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Singapore', 'United Arab Emirates', 'Other',
];


export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('account');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [profileForm, setProfileForm] = useState({
    schoolName: user?.schoolName || '',
    country: user?.address?.country || '',
    state: user?.address?.state || '',
    city: user?.address?.city || '',
    zipCode: user?.address?.zipCode || '',
  });
  const [aboutMe, setAboutMe] = useState(user?.aboutMe || '');
  const [editingAbout, setEditingAbout] = useState(false);

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => profileApi.analytics().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: (data) => profileApi.update(data),
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated');
      setEditing(false);
    },
    onError: () => toast.error('Update failed'),
  });

  const avatarMut = useMutation({
    mutationFn: (file) => profileApi.uploadAvatar(file),
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile image updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to upload profile image'),
  });


  const topicPerf = analyticsData?.topicPerf || {};
  const chartData = {
    labels: Object.keys(topicPerf),
    datasets: [{ label: 'Accuracy %', data: Object.values(topicPerf), backgroundColor: '#0366AC', borderRadius: 6 }],
  };

  const plan = user?.plan || 'free';
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  const PlanIcon = planInfo.icon;
  const planName = user?.planDisplayName || planInfo.label;
  const isFreePlan = plan === 'free';
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  const isStudent = user?.role === 'user';
  const isEnterpriseTeacher = user?.role === 'instructor' && !!user?.enterprise?.id;
  const isPrincipal = user?.role === 'principal';
  const orgLocked = isEnterpriseTeacher || isPrincipal;
  const visibleTabs = TABS.filter((t) => {
    if (user?.role === 'user' && t.hideForUserRole) return false;
    if (t.orgManagedInstructorOnly && !(user?.subscriptionBillingManagedByOrg === true && user?.role === 'instructor')) return false;
    return !t.instructorOnly || isInstructor || !isFreePlan;
  });
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const joinDate = user?.createdAt ? fmtDate(user.createdAt) : '—';
  const roleCountry = user?.address?.country || 'Not set';

  const handleProfileDetailsSave = () => {
    const clean = {
      schoolName: profileForm.schoolName.trim(),
      country: profileForm.country.trim(),
      state: profileForm.state.trim(),
      city: profileForm.city.trim(),
      zipCode: profileForm.zipCode.trim(),
    };
    if (clean.zipCode && !/^[A-Za-z0-9\- ]{3,20}$/.test(clean.zipCode)) {
      toast.error('Please enter a valid zip/postal code');
      return;
    }
    updateMut.mutate({
      schoolName: clean.schoolName,
      address: {
        country: clean.country,
        state: clean.state,
        city: clean.city,
        zipCode: clean.zipCode,
      },
    });
  };


  useEffect(() => {
    setName(user?.name || '');
    setAboutMe(user?.aboutMe || '');
    setProfileForm({
      schoolName: user?.schoolName || '',
      country: user?.address?.country || '',
      state: user?.address?.state || '',
      city: user?.address?.city || '',
      zipCode: user?.address?.zipCode || '',
    });
  }, [user]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Profile</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage your personal and organization details.</p>
        </div>
        <Link to="/dashboard" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      {/* ── Profile header ── */}
      <div className="card mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative shrink-0">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user?.name || 'Profile'}
              className="w-16 h-16 rounded-2xl object-cover border border-[var(--color-border)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white text-2xl font-bold flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center cursor-pointer hover:border-[var(--color-primary)]">
            {avatarMut.isPending ? <Loader2 size={13} className="animate-spin text-[var(--color-primary)]" /> : <Camera size={13} className="text-[var(--color-text-muted)]" />}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                avatarMut.mutate(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <VerifiedName
              name={user?.name}
              verified={!!user?.isInstructorVerified && isInstructor}
              nameClassName="text-lg font-bold text-[var(--color-text)]"
              iconSize={18}
            />
            {!isStudent && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${planInfo.color}`}>
                <PlanIcon size={10} className="inline mr-1" />{planName}
              </span>
            )}
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] capitalize">
              {user?.role || 'user'}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{user?.email}</p>
          <div className="flex flex-wrap gap-4 mt-2">
            {isStudent && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <span className="font-medium text-[var(--color-text)]">{user?.totalExams || 0}</span> exams attempted
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">Join Date:</span> {joinDate}
            </div>
            {isInstructor && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <span className="font-medium text-[var(--color-text)]">Location:</span> {roleCountry}
              </div>
            )}
            {/* <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">Profile image:</span> Editable
            </div> */}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {visibleTabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Account tab ── */}
      {tab === 'account' && (
        <div className="space-y-5">
          {/* Name / Email */}
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2">
              <User size={15} className="text-[var(--color-primary)]" /> User Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block font-medium">Full Name</label>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="input flex-1 text-sm"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={() => updateMut.mutate({ name })}
                      disabled={updateMut.isPending}
                      className="btn-primary p-2 rounded-lg"
                    >
                      <Check size={15} />
                    </button>
                    <button onClick={() => { setEditing(false); setName(user?.name); }} className="btn-secondary p-2 rounded-lg">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-[var(--color-bg-alt)] rounded-lg px-3 py-2.5">
                    <span className="text-sm text-[var(--color-text)]">{user?.name}</span>
                    <button onClick={() => setEditing(true)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                      <Edit3 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block font-medium">Email Address</label>
                <div className="bg-[var(--color-bg-alt)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-muted)]">
                  {user?.email}
                </div>
              </div>
            </div>
          </div>

          {isInstructor && (
            <div className="card">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-semibold text-[var(--color-text)] text-sm flex items-center gap-2">
                  <Edit3 size={15} className="text-[var(--color-primary)]" /> About me
                </h3>
                {!editingAbout && (
                  <button
                    type="button"
                    onClick={() => setEditingAbout(true)}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Students may see this when enrolling in your exams (for example via an access key).
              </p>
              {editingAbout ? (
                <div className="space-y-3">
                  <textarea
                    className="input w-full text-sm min-h-[110px] resize-y"
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value.slice(0, 1000))}
                    placeholder="Share a short introduction about yourself, your teaching focus, or experience…"
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">{aboutMe.length}/1000</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingAbout(false); setAboutMe(user?.aboutMe || ''); }}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={updateMut.isPending}
                        onClick={() => {
                          updateMut.mutate(
                            { aboutMe: aboutMe.trim() },
                            { onSuccess: () => setEditingAbout(false) },
                          );
                        }}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
                  {user?.aboutMe?.trim() || 'No about me yet. Add a short bio for students.'}
                </p>
              )}
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2">
              <Settings size={15} className="text-[var(--color-primary)]" /> Organization & Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">School Name</label>
                <input
                  className="input w-full text-sm"
                  value={orgLocked ? (user?.enterprise?.name || profileForm.schoolName) : profileForm.schoolName}
                  onChange={(e) => setProfileForm(p => ({ ...p, schoolName: e.target.value }))}
                  placeholder="Enter school or organization name"
                  disabled={orgLocked}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">Country</label>
                <select
                  className="input w-full text-sm"
                  value={orgLocked ? (user?.enterprise?.address?.country || profileForm.country) : profileForm.country}
                  onChange={(e) => setProfileForm(p => ({ ...p, country: e.target.value }))}
                  disabled={orgLocked}
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">State</label>
                <input
                  className="input w-full text-sm"
                  value={orgLocked ? (user?.enterprise?.address?.state || profileForm.state) : profileForm.state}
                  onChange={(e) => setProfileForm(p => ({ ...p, state: e.target.value }))}
                  placeholder="State"
                  disabled={orgLocked}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">City</label>
                <input
                  className="input w-full text-sm"
                  value={orgLocked ? (user?.enterprise?.address?.city || profileForm.city) : profileForm.city}
                  onChange={(e) => setProfileForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="City"
                  disabled={orgLocked}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">Zip Code</label>
                <input
                  className="input w-full text-sm"
                  value={orgLocked ? (user?.enterprise?.address?.zipCode || profileForm.zipCode) : profileForm.zipCode}
                  onChange={(e) => setProfileForm(p => ({ ...p, zipCode: e.target.value }))}
                  placeholder="Zip / postal code"
                  disabled={orgLocked}
                />
              </div>
            </div>
            <div className="mt-4">
              {orgLocked ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Organization details are managed by your school and can’t be edited from this profile.
                </p>
              ) : (
                <button
                  className="btn-primary py-2 px-6 text-sm disabled:opacity-60"
                  disabled={updateMut.isPending}
                  onClick={handleProfileDetailsSave}
                >
                  {updateMut.isPending ? 'Saving...' : 'Save details'}
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-2">Settings moved</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Security and preference controls are now available in the dedicated Settings page.
            </p>
          </div>
        </div>
      )}

      {tab === 'org-access' && user?.subscriptionBillingManagedByOrg === true && user?.role === 'instructor' && (
        <div className="space-y-5 animate-fade-in">
          <div className="card border border-teal-500/20 bg-gradient-to-br from-teal-500/[0.04] to-transparent">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-1 flex items-center gap-2">
              <Building2 size={15} className="text-teal-600 dark:text-teal-400" /> Organization access
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-4">
              Your instructor limits are set by <span className="font-medium text-[var(--color-text)]">{user?.enterprise?.name || 'your organization'}</span>.
              Billing and plan changes are handled there — this is a read-only summary of what you can use.
            </p>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Exam usage (this month)</p>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="text-2xl font-bold text-[var(--color-text)] tabular-nums">{user?.remaining ?? '—'}</span>
                  <span className="text-xs text-[var(--color-text-muted)] ml-1">remaining</span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                  {user?.examsUsedThisMonth ?? 0} / {user?.monthlyLimit ?? '—'} used
                </span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--color-border)] p-3">
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">Organization mode</p>
                <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5 capitalize">{user?.enterprise?.mode || '—'}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-3">
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">AI exams / month</p>
                <p className="text-lg font-semibold text-[var(--color-text)] mt-0.5 tabular-nums">{user?.enterprise?.examsPerTeacherLimit ?? user?.monthlyLimit ?? '—'}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Per-teacher allowance</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-3">
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">Questions / exam</p>
                <p className="text-lg font-semibold text-[var(--color-text)] mt-0.5 tabular-nums">Up to {user?.enterprise?.questionsPerExamLimit ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-3">
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">AI proctoring</p>
                <p className="text-sm font-medium text-[var(--color-text)] mt-0.5">
                  {user?.enterprise?.aiProctoringEnabled === false ? 'Not enabled for your organization' : 'Included (per org policy)'}
                </p>
              </div>
              {(user?.enterprise?.orgPlanExpiresAt || user?.enterprise?.orgTrialEndsAt) && (
                <div className="rounded-xl border border-[var(--color-border)] p-3 sm:col-span-2">
                  <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">Organization plan window</p>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--color-text)]">
                    {user?.enterprise?.orgPlanExpiresAt && (
                      <span>
                        <span className="text-[var(--color-text-muted)] text-xs">Access through </span>
                        <span className="font-semibold">{fmtDate(user.enterprise.orgPlanExpiresAt)}</span>
                        {user?.enterprise?.orgPlanDurationMonths ? (
                          <span className="text-xs text-[var(--color-text-muted)]"> ({user.enterprise.orgPlanDurationMonths} mo term)</span>
                        ) : null}
                      </span>
                    )}
                    {user?.enterprise?.orgTrialEndsAt && new Date(user.enterprise.orgTrialEndsAt) > new Date() && (
                      <span className="text-xs text-teal-700 dark:text-teal-400">
                        Org trial until {fmtDate(user.enterprise.orgTrialEndsAt)}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-[var(--color-border)] p-3 sm:col-span-2">
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-2">Organization AI features</p>
                <ul className="text-[11px] text-[var(--color-text)] grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  <li>Listening / audio: {user?.enterprise?.aiListeningEnabled === false ? 'Not included' : 'Included'}</li>
                  <li>Resource processing: {user?.enterprise?.aiResourceProcessingEnabled === false ? 'Not included' : 'Included'}</li>
                  <li>Coding exams: {user?.enterprise?.codingExamsEnabled === false ? 'Not included' : 'Included'}</li>
                  <li>AI exam generation: {user?.enterprise?.aiExamGenerationEnabled === false ? 'Not included' : 'Included'}</li>
                </ul>
              </div>
              {(user?.enterprise?.renewalTimeline?.length > 0) && (
                <div className="rounded-xl border border-[var(--color-border)] p-3 sm:col-span-2">
                  <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-2">Plan timeline (read-only)</p>
                  <ul className="space-y-1.5 text-[11px] text-[var(--color-text-muted)]">
                    {user.enterprise.renewalTimeline.map((seg, idx) => (
                      <li key={idx}>
                        <span className="font-medium text-[var(--color-text)]">{seg.title}</span>
                        {seg.endsAt ? ` · through ${fmtDate(seg.endsAt)}` : ''}
                        {seg.startsAt && seg.kind === 'queued' ? ` · starts ${fmtDate(seg.startsAt)}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Performance tab ── */}
      {tab === 'performance' && (
        <div className="space-y-5">
          {Object.keys(topicPerf).length > 0 ? (
            <div className="card">
              <h3 className="font-semibold text-[var(--color-text)] mb-4 text-sm flex items-center gap-2">
                <BarChart2 size={15} className="text-[var(--color-primary)]" /> Topic Performance
              </h3>
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { min: 0, max: 100, ticks: { callback: v => `${v}%` } } },
                }}
              />
            </div>
          ) : (
            <div className="card text-center py-12">
              <BarChart2 size={36} className="mx-auto mb-3 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-muted)]">Take exams to see topic breakdown.</p>
            </div>
          )}

          {user?.badges?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-[var(--color-text)] mb-3 text-sm flex items-center gap-2">
                <Award size={15} className="text-[var(--color-primary)]" /> Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.badges.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-[var(--color-bg-alt)] px-3 py-1.5 rounded-full text-xs font-medium text-[var(--color-text)]">
                    <BadgeCheck size={13} className="text-[var(--color-primary)]" />
                    {b.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
