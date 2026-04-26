import request from './api';

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) return '';
  const query = new URLSearchParams();
  entries.forEach(([key, value]) => query.set(key, String(value)));
  return `?${query.toString()}`;
}

// ── Student PFE API ──────────────────────────────────────────
export const pfeAPI = {
  // Browse available PFE subjects (real-time from DB — no fallback)
  listSubjects: (params = {}) => request(`/api/v1/pfe/me/subjects${buildQuery(params)}`),

  // Get authenticated student's current PFE group + chosen subject
  getMyGroup: () => request('/api/v1/pfe/me/group'),

  // Get upcoming deadlines for the student's group
  getMyDeadlines: () => request('/api/v1/pfe/me/deadlines'),

  // Get the student's PFE grade (only available when finalized)
  getMyGrade: () => request('/api/v1/pfe/me/grade'),

  // Select (or change) a PFE subject — persists to DB
  selectSubject: (sujetId) =>
    request('/api/v1/pfe/me/select-subject', {
      method: 'POST',
      body: JSON.stringify({ sujetId }),
    }),
};

// ── Admin/Teacher PFE API ────────────────────────────────────
export const pfeAdminAPI = {
  listSujets: (params = {}) => request(`/api/v1/pfe/sujets${buildQuery(params)}`),

  createSujet: (payload) =>
    request('/api/v1/pfe/sujets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSujet: (subjectId, payload) =>
    request(`/api/v1/pfe/sujets/${subjectId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSujet: (subjectId) =>
    request(`/api/v1/pfe/sujets/${subjectId}`, { method: 'DELETE' }),

  validateSujet: (subjectId) =>
    request(`/api/v1/pfe/sujets/${subjectId}/valider`, { method: 'PUT' }),

  rejectSujet: (subjectId) =>
    request(`/api/v1/pfe/sujets/${subjectId}/refuser`, { method: 'PUT' }),

  listGroups: () => request('/api/v1/pfe/groupes'),

  createGroup: (payload) =>
    request('/api/v1/pfe/groupes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteGroup: (groupId) =>
    request(`/api/v1/pfe/groupes/${groupId}`, { method: 'DELETE' }),

  addGroupMember: (groupId, payload) =>
    request(`/api/v1/pfe/groupes/${groupId}/membres`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listChoices: () => request('/api/v1/pfe/voeux'),

  createChoice: (payload) =>
    request('/api/v1/pfe/voeux', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateChoiceStatus: (choiceId, status) =>
    request(`/api/v1/pfe/voeux/${choiceId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  deleteChoice: (choiceId) =>
    request(`/api/v1/pfe/voeux/${choiceId}`, { method: 'DELETE' }),

  listJury: () => request('/api/v1/pfe/jury'),

  addJuryMember: (payload) =>
    request('/api/v1/pfe/jury', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateJuryRole: (juryId, role) =>
    request(`/api/v1/pfe/jury/${juryId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  deleteJuryMember: (juryId) =>
    request(`/api/v1/pfe/jury/${juryId}`, { method: 'DELETE' }),
};

export default pfeAPI;
