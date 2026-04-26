/*
  TeacherDashboard — PFE-only dashboard.

  The teacher in this product is a PFE supervisor, not a course instructor.
  No announcements, reclamations, courses, or groupes exist on this page.
*/

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import ProfileHeader from '../../components/dashboard/teacher/ProfileHeader';
import ReportStudentModal from '../../components/dashboard/teacher/ReportStudentModal';
import { teacherDashboardService } from '../../services/teacherDashboard';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'pfe', label: 'PFE' },
  { id: 'jury', label: 'Jury' },
];

const CHART_PALETTE = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#8dd1e1', '#a4de6c'];


function StudentListModal({ isOpen, onClose, title, students, onReport }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-surface rounded-xl shadow-card border border-edge w-full max-w-2xl max-h-[80vh] flex flex-col transform transition-all duration-300">
        <div className="flex items-center justify-between p-6 border-b border-edge">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-ink-tertiary hover:text-ink hover:bg-surface-200 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-center text-ink-tertiary">No students found.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-edge/20 text-ink-secondary text-sm">
                <tr>
                  <th className="p-3 border-b border-edge font-medium rounded-tl-lg">Matricule</th>
                  <th className="p-3 border-b border-edge font-medium">Name</th>
                  {onReport && <th className="p-3 border-b border-edge font-medium rounded-tr-lg">Actions</th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-edge/10 border-b border-edge last:border-b-0">
                    <td className="p-3 font-mono text-ink-secondary">{s.matricule}</td>
                    <td className="p-3 font-medium text-ink">{s.name}</td>
                    {onReport && (
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onReport(s)}
                          className="px-3 py-1 text-xs font-medium text-danger border border-danger/40 rounded-md hover:bg-danger/10 transition-colors"
                        >
                          Report
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}


export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('overview');
  const [reportTarget, setReportTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', students: [] });

  const hasPresidentMembership = useMemo(
    () =>
      Array.isArray(user?.memberships) &&
      user.memberships.some(
        (membership) => String(membership?.role || '').toLowerCase() === 'president'
      ),
    [user]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingOverview(true);
        const response = await teacherDashboardService.getOverview();
        if (!cancelled) setOverview(response?.data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load dashboard.');
      } finally {
        if (!cancelled) setLoadingOverview(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const summary          = overview?.summary          ?? null;
  const pfeBreakdown     = overview?.pfeBreakdown     ?? [];
  const pfeBySpecialite  = overview?.pfeBySpecialite  ?? [];
  const moduleBySpecialite = overview?.moduleBySpecialite ?? [];
  const documentBreakdown  = overview?.documentBreakdown  ?? [];
  const disciplineByType   = overview?.disciplineByType   ?? [];

  const chartsData = useMemo(() => ({
    pfeProjectsByStatus: summary
      ? [
          { name: 'Active',    value: summary.activePfeProjects    ?? 0 },
          { name: 'Finalized', value: summary.finalizedPfeProjects ?? 0 },
        ].filter((d) => d.value > 0)
      : [],
    pfeBySpecialite: pfeBySpecialite.map((s) => ({ name: s.specialiteName, value: s.count })),
    moduleBySpecialite: moduleBySpecialite.map((s) => ({ name: s.specialiteName, value: s.count })),
    disciplineByType: disciplineByType.map((d) => ({ name: d.infractionName, value: d.count })),
  }), [summary, pfeBySpecialite, moduleBySpecialite, disciplineByType]);

  // ── PFE tab — real data sourced from /teacher/dashboard pfeBreakdown ─
  const pfeData = useMemo(() => {
    const themes = (pfeBreakdown || []).map((g) => ({
      id: g.groupId,
      title: g.subjectTitle || g.groupName,
      type: g.isFinalized ? 'finalized' : 'active',
      specialite: g.groupName,
      status: g.isFinalized ? 'finalized' : 'en_cours',
      studentsCount: g.studentCount ?? 0,
    }));
    const statusDistribution = [
      { name: 'Active', value: summary?.activePfeProjects ?? 0 },
      { name: 'Finalized', value: summary?.finalizedPfeProjects ?? 0 },
    ].filter((d) => d.value > 0);
    return {
      stats: {
        totalThemes: summary?.pfeProjects ?? 0,
        totalStudents: summary?.supervisedStudents ?? 0,
        totalGroups: summary?.pfeGroups ?? 0,
        averageGroupSize: summary?.averagePfeGroupSize ?? 0,
      },
      diversity: (pfeBreakdown || []).map((g) => ({
        name: g.groupName,
        value: g.studentCount ?? 0,
      })),
      statusDistribution,
      themes,
    };
  }, [pfeBreakdown, summary]);

  // ── Jury tab — no NEW endpoint ────────────────────────────────────────
  const juryData = useMemo(() => ({
    summary: { totalThemes: 0 },
    themes: [],
  }), []);

  const loading = loadingOverview;

  const handleReport = (student) => {
    setReportTarget(student);
    setModalOpen(false);
  };

  // ── Render helpers for each tab ───────────────────────────────────────
  const renderOverview = () => {
    const documentChartData = documentBreakdown.map((d) => ({ name: d.typeName, value: d.total }));

    return (
      <div className="space-y-6 mt-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiCard label="Supervised Students" value={summary?.supervisedStudents ?? 0} accent="brand" />
          <KpiCard label="PFE Groups" value={summary?.pfeGroups ?? 0} accent="success" />
          <KpiCard label="PFE Projects" value={summary?.pfeProjects ?? 0} accent="warning" />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="My PFE Projects" data={chartsData.pfeProjectsByStatus} variant="pie" palette={CHART_PALETTE} />
          <ChartCard title="Document Requests by Type" data={documentChartData} variant="bar" color="#00C49F" />
          <ChartCard title="Disciplinary Cases by Type" data={chartsData.disciplineByType} variant="bar" color="#FF8042" />
        </div>
      </div>
    );
  };

  const renderPfe = () => (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="My PFE Projects" value={pfeData.stats.totalThemes} accent="brand" />
        <KpiCard label="My PFE Groups" value={pfeData.stats.totalGroups} accent="success" />
        <KpiCard label="Supervised Students" value={pfeData.stats.totalStudents} accent="warning" />
        <KpiCard label="Avg Group Size" value={pfeData.stats.averageGroupSize} accent="brand" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Students per PFE Group" data={pfeData.diversity} variant="pie" palette={CHART_PALETTE} />
        <ChartCard title="Project Status" data={pfeData.statusDistribution} variant="bar" color="#8884d8" />
      </div>

      <div className="bg-surface rounded-lg border border-edge shadow-card overflow-hidden">
        <h3 className="p-6 text-lg font-bold border-b border-edge">My Supervised PFE Groups</h3>
        <table className="w-full text-left border-collapse">
          <thead className="bg-edge/20 text-ink-secondary text-sm">
            <tr>
              <th className="p-4 border-b border-edge font-medium">Subject / Group</th>
              <th className="p-4 border-b border-edge font-medium">Group Name</th>
              <th className="p-4 border-b border-edge font-medium">Status</th>
              <th className="p-4 border-b border-edge font-medium">Students</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {pfeData.themes.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-ink-tertiary">
                  No PFE groups assigned.
                </td>
              </tr>
            ) : (
              pfeData.themes.map((theme) => (
                <tr key={theme.id} className="hover:bg-edge/10">
                  <td className="p-4 border-b border-edge font-medium">{theme.title}</td>
                  <td className="p-4 border-b border-edge">{theme.specialite}</td>
                  <td className="p-4 border-b border-edge">
                    <span
                      className={`px-2 py-1 text-xs rounded-full uppercase tracking-wider font-semibold ${
                        theme.status === 'finalized'
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {String(theme.status || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 border-b border-edge font-bold">{theme.studentsCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderJury = () => (
    <div className="mt-6 space-y-6">
      <div className="bg-surface rounded-lg border border-edge shadow-card p-6 inline-flex flex-col">
        <span className="text-sm text-ink-secondary uppercase font-semibold tracking-wider">
          Total Jury Themes
        </span>
        <span className="text-3xl font-bold text-brand mt-2">{juryData.summary.totalThemes}</span>
      </div>

      <div className="bg-surface rounded-lg border border-edge shadow-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-edge/20 text-ink-secondary text-sm">
            <tr>
              <th className="p-4 border-b border-edge font-medium">Theme</th>
              <th className="p-4 border-b border-edge font-medium">Roles</th>
              <th className="p-4 border-b border-edge font-medium">Date</th>
              <th className="p-4 border-b border-edge font-medium">Salle</th>
              <th className="p-4 border-b border-edge font-medium">Students</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {juryData.themes.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-ink-tertiary">
                  No jury themes found.
                </td>
              </tr>
            ) : (
              juryData.themes.map((theme) => (
                <tr key={theme.id} className="hover:bg-edge/10">
                  <td className="p-4 border-b border-edge font-medium">{theme.title}</td>
                  <td className="p-4 border-b border-edge">
                    <div className="flex gap-2 flex-wrap">
                      {(theme.roles || []).map((r) => (
                        <span
                          key={r}
                          className="px-2 py-1 bg-brand/10 text-brand text-xs rounded-md font-semibold"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 border-b border-edge">
                    {theme.date ? new Date(theme.date).toLocaleDateString() : 'TBD'}
                  </td>
                  <td className="p-4 border-b border-edge">{theme.salle || 'TBD'}</td>
                  <td className="p-4 border-b border-edge">
                    {(theme.students || []).map((s) => (
                      <div key={s}>{s}</div>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <ProfileHeader profile={user} />

      {hasPresidentMembership && (
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/dashboard/discipline/president')}
            className="px-4 py-2 text-sm font-medium text-surface bg-brand rounded-md hover:bg-brand-hover transition-colors"
          >
            Open Decision Panel
          </button>
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {toast && (
        <div className="bg-success/10 border border-success/30 text-success text-sm px-4 py-3 rounded-md">
          {toast}
        </div>
      )}

      <nav
        className="flex items-center gap-1 border-b border-edge overflow-x-auto"
        role="tablist"
        aria-label="Teacher dashboard sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-ink-tertiary hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {loading && (
        <div className="py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'pfe' && renderPfe()}
          {activeTab === 'jury' && renderJury()}
        </>
      )}

      <StudentListModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        students={modalData.students}
        onReport={handleReport}
      />

      <ReportStudentModal
        student={reportTarget}
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        onSubmitted={() => {
          setToast('Report submitted. Case created for review.');
          window.setTimeout(() => setToast(''), 4000);
        }}
      />
    </div>
  );
}

function KpiCard({ label, value, accent = 'brand' }) {
  const tones = {
    brand:   { bg: 'bg-brand/10',   text: 'text-brand' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    danger:  { bg: 'bg-danger/10',  text: 'text-danger' },
  };
  const tone = tones[accent] || tones.brand;
  return (
    <div className={`${tone.bg} rounded-xl border border-edge p-4 flex flex-col gap-1`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${tone.text}`}>{value}</p>
    </div>
  );
}


function ChartCard({ title, data, variant, color, palette, offset = 0 }) {
  const isEmpty = !Array.isArray(data) || data.length === 0 || data.every((d) => !d.value);

  return (
    <div className="bg-surface rounded-lg border border-edge shadow-card p-6">
      {title && <h3 className="text-base font-semibold mb-4">{title}</h3>}
      <div className="h-64">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-sm text-ink-tertiary">
            No data available
          </div>
        ) : variant === 'pie' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={(palette || CHART_PALETTE)[(i + offset) % (palette || CHART_PALETTE).length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={color || '#00C49F'} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

