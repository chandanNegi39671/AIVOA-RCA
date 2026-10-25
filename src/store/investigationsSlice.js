import { createSlice, createSelector } from '@reduxjs/toolkit';

/**
 * Investigations slice.
 * Real data would be loaded from FastAPI/PostgreSQL backend.
 * In offline/demo mode, investigations live in Redux state only (session memory).
 * Sample records are stored separately and clearly marked isSample: true.
 */

const initialState = {
  // Real investigations created by the user this session
  userInvestigations: [],
  // Sample records — only merged into views when showSampleData === true
  sampleInvestigations: [
    {
      id: 'DEV-2026-041',
      title: 'Assay result outside specification',
      product: 'Amoxicillin API',
      batch: 'AMX-24091',
      date: 'Today, 09:42',
      status: 'RCA in progress',
      stage: 2,
      severity: 'Major',
      initials: 'QA',
      color: 'sage',
      isSample: true,
      details: 'Assay value of 96.2% recorded at release testing against a specification of 98.0%–102.0%. Investigation opened to verify blend uniformity and analytical method integrity.',
      whys: [
        'Assay result 96.2% fell outside the 98.0%–102.0% specification at final release.',
        'Final powder blend may have exhibited segregation or inhomogeneity prior to capsule fill.',
        'Blender rotational speed or fill volume may have drifted from validated SOP parameters.',
        '',
        '',
      ],
      fishbone: {
        People: ['Operator qualification log verification pending', 'Shift handover documentation gap identified'],
        Method: ['Blending sequence tolerances require SOP review', 'Sampling depth protocol inconsistency'],
        Machine: ['V-blender rotational speed calibration log outstanding', 'Discharge valve gasket inspection required'],
        Material: ['Excipient raw material lot variability noted', 'Particle size distribution of active batch unconfirmed'],
        Measurement: ['HPLC analytical column pressure fluctuation recorded', 'Sampling probe depth consistency unverified'],
        Environment: ['Relative humidity during charging: 56% rH noted', 'Cleanroom temperature log to be reviewed'],
      },
      factors: [
        { id: 1, text: 'Sampling technique may have introduced blend variability', relevance: 'Plausible mechanism', checked: true },
        { id: 2, text: 'Equipment calibration status not yet independently verified', relevance: 'Needs evidence', checked: false },
        { id: 3, text: 'Operator training record requires cross-verification with QA log', relevance: 'Needs evidence', checked: false },
      ],
      capas: [
        { id: 'CAPA-S1', title: 'Verify blend uniformity and review sampling plan', desc: 'Compare in-process stratification samples with final assay result to test powder segregation hypothesis.', type: 'Corrective action', priority: 'High priority', source: 'ai' },
        { id: 'CAPA-S2', title: 'Review mixing SOP and operator qualification records', desc: 'Confirm blender rotational speed tolerances, charging sequence, and training record sign-offs.', type: 'Preventive action', priority: 'Medium priority', source: 'ai' },
      ],
      evidence: [
        { id: 'ev-s1', name: 'Deviation intake report (narrative)', note: 'Supplied at record initiation', status: 'Available', type: 'attached' },
        { id: 'ev-s2', name: 'Batch assay raw chromatograms (HPLC)', note: 'Required to verify integration parameters', status: 'Missing', type: 'missing' },
        { id: 'ev-s3', name: 'V-blender calibration certificate', note: 'Check current calibration currency', status: 'Missing', type: 'missing' },
      ],
      aiExtracted: true,
      owner: 'Quality Lead (QA)',
      createdAt: '2026-10-24T09:42:00.000Z',
    },
    {
      id: 'DEV-2026-039',
      title: 'Unexpected moisture variation',
      product: 'Metformin API',
      batch: 'MET-24077',
      date: 'Yesterday',
      status: 'Evidence review',
      stage: 3,
      severity: 'Major',
      initials: 'QA',
      color: 'peach',
      isSample: true,
      details: 'Loss on drying (LOD) result of 1.45% exceeded the upper intermediate target limit of 1.20% during fluidized bed drying cycle.',
      whys: ['LOD result of 1.45% exceeded the 1.20% upper limit.', 'Fluidized bed dryer inlet air temperature deviated from set point.', '', '', ''],
      fishbone: { People: [], Method: ['Fluidized bed dryer temperature set-point deviation'], Machine: ['Inlet air temperature sensor calibration pending'], Material: ['Raw material hygroscopicity may have varied'], Measurement: ['LOD measurement sampling location'], Environment: ['Ambient humidity unusually high during processing'] },
      factors: [],
      capas: [],
      evidence: [
        { id: 'ev-s4', name: 'Fluidized bed dryer batch record', note: 'Extracted from deviation description', status: 'Available', type: 'attached' },
        { id: 'ev-s5', name: 'Inlet air temperature sensor calibration log', note: 'Outstanding — required for root cause determination', status: 'Missing', type: 'missing' },
      ],
      aiExtracted: true,
      owner: 'Quality Lead (QA)',
      createdAt: '2026-10-23T14:20:00.000Z',
    },
    {
      id: 'DEV-2026-036',
      title: 'Filter integrity test failure',
      product: 'Cefixime API',
      batch: 'CFX-24063',
      date: '21 Oct 2026',
      status: 'CAPA pending',
      stage: 4,
      severity: 'Critical',
      initials: 'QA',
      color: 'lilac',
      isSample: true,
      details: 'Post-filtration bubble point pressure measured below validated minimum limit of 3.2 bar prior to sterile solvent precipitation.',
      whys: ['Bubble point pressure measured at 2.8 bar, below the 3.2 bar validated minimum.', 'Filter membrane may have been compromised during installation or autoclaving.', '', '', ''],
      fishbone: { People: [], Method: ['Filter installation technique review required'], Machine: ['Autoclave validation cycle for filter integrity'], Material: ['Filter membrane batch traceability'], Measurement: ['Bubble point test apparatus calibration status'], Environment: [] },
      factors: [],
      capas: [],
      evidence: [
        { id: 'ev-s6', name: 'Filter integrity test record', note: 'Extracted from deviation report', status: 'Available', type: 'attached' },
        { id: 'ev-s7', name: 'Filter membrane CoA and lot number', note: 'Required for supplier traceability', status: 'Missing', type: 'missing' },
      ],
      aiExtracted: true,
      owner: 'Quality Lead (QA)',
      createdAt: '2026-10-21T11:05:00.000Z',
    },
    {
      id: 'DEV-2026-032',
      title: 'Yield below expected range',
      product: 'Ibuprofen API',
      batch: 'IBU-24052',
      date: '19 Oct 2026',
      status: 'Ready for QA',
      stage: 4,
      severity: 'Minor',
      initials: 'QA',
      color: 'blue',
      isSample: true,
      details: 'Recovered crystallizer yield was 79.1% against standard expectation of 86.0%–91.5% with no external leak detected.',
      whys: ['Recovered yield 79.1% fell below the 86.0%–91.5% expected range.', 'Crystallization temperature profile may have deviated.', '', '', ''],
      fishbone: { People: [], Method: ['Crystallization temperature ramp rate review'], Machine: [], Material: ['Solvent lot purity verification'], Measurement: ['Gravimetric yield determination method'], Environment: ['Cooling water temperature variability'] },
      factors: [],
      capas: [],
      evidence: [
        { id: 'ev-s8', name: 'Crystallizer batch record', note: 'Primary evidence attached', status: 'Available', type: 'attached' },
        { id: 'ev-s9', name: 'Cooling water temperature log for session', note: 'Cross-reference against crystallizer batch record', status: 'Missing', type: 'missing' },
      ],
      aiExtracted: true,
      owner: 'Quality Lead (QA)',
      createdAt: '2026-10-19T16:30:00.000Z',
    },
  ],
  loading: false,
  error: null,
};

const investigationsSlice = createSlice({
  name: 'investigations',
  initialState,
  reducers: {
    addInvestigation(state, action) {
      const existingIdx = state.userInvestigations.findIndex(
        i => i.id === action.payload.id || (action.payload.backendId && i.backendId === action.payload.backendId)
      );
      if (existingIdx !== -1) {
        state.userInvestigations[existingIdx] = { ...state.userInvestigations[existingIdx], ...action.payload };
      } else {
        state.userInvestigations.unshift(action.payload);
      }
    },
    updateInvestigation(state, action) {
      const { id, changes } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.userInvestigations[idx] = { ...state.userInvestigations[idx], ...changes };
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        state.sampleInvestigations[si] = { ...state.sampleInvestigations[si], ...changes };
      }
    },
    markInvestigationSaved(state, action) {
      const { id, backendId, reviewStatus } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.userInvestigations[idx].backendId = backendId;
        state.userInvestigations[idx].hasUnsavedChanges = false;
        if (reviewStatus) state.userInvestigations[idx].status = reviewStatus;
      }
    },
    updateInvestigationWhys(state, action) {
      const { id, whys } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.userInvestigations[idx].whys = whys;
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        state.sampleInvestigations[si].whys = whys;
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    updateInvestigationFishbone(state, action) {
      const { id, fishbone } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.userInvestigations[idx].fishbone = fishbone;
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        state.sampleInvestigations[si].fishbone = fishbone;
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    updateInvestigationFactors(state, action) {
      const { id, factors } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.userInvestigations[idx].factors = factors;
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        state.sampleInvestigations[si].factors = factors;
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    updateInvestigationCapas(state, action) {
      const { id, capas } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.userInvestigations[idx].capas = capas;
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        state.sampleInvestigations[si].capas = capas;
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    addCapaToInvestigation(state, action) {
      const { id, capa } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        if (!Array.isArray(state.userInvestigations[idx].capas)) state.userInvestigations[idx].capas = [];
        state.userInvestigations[idx].capas.push(capa);
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        if (!Array.isArray(state.sampleInvestigations[si].capas)) state.sampleInvestigations[si].capas = [];
        state.sampleInvestigations[si].capas.push(capa);
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    removeCapaFromInvestigation(state, action) {
      const { id, capaId } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1 && Array.isArray(state.userInvestigations[idx].capas)) {
        state.userInvestigations[idx].capas = state.userInvestigations[idx].capas.filter(c => c.id !== capaId);
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1 && Array.isArray(state.sampleInvestigations[si].capas)) {
        state.sampleInvestigations[si].capas = state.sampleInvestigations[si].capas.filter(c => c.id !== capaId);
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    addEvidenceToInvestigation(state, action) {
      const { id, evidence } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        if (!Array.isArray(state.userInvestigations[idx].evidence)) state.userInvestigations[idx].evidence = [];
        state.userInvestigations[idx].evidence.unshift(evidence);
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        if (!Array.isArray(state.sampleInvestigations[si].evidence)) state.sampleInvestigations[si].evidence = [];
        state.sampleInvestigations[si].evidence.unshift(evidence);
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    addEvidenceGapToInvestigation(state, action) {
      const { id, gap } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        if (!Array.isArray(state.userInvestigations[idx].evidence)) state.userInvestigations[idx].evidence = [];
        state.userInvestigations[idx].evidence.push(gap);
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        if (!Array.isArray(state.sampleInvestigations[si].evidence)) state.sampleInvestigations[si].evidence = [];
        state.sampleInvestigations[si].evidence.push(gap);
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    updateNarrative(state, action) {
      const { id, notes } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.userInvestigations[idx].details = notes;
        state.userInvestigations[idx].hasUnsavedChanges = true;
      }
      const si = state.sampleInvestigations.findIndex(i => i.id === id);
      if (si !== -1) {
        state.sampleInvestigations[si].details = notes;
        state.sampleInvestigations[si].hasUnsavedChanges = true;
      }
    },
    applyAiExtraction(state, action) {
      const { id, extracted } = action.payload;
      const idx = state.userInvestigations.findIndex(i => i.id === id);
      if (idx !== -1) {
        state.userInvestigations[idx] = {
          ...state.userInvestigations[idx],
          ...extracted,
          aiExtracted: true,
          hasUnsavedChanges: true,
        };
      }
    },
  },
});

export const {
  addInvestigation,
  updateInvestigation,
  markInvestigationSaved,
  updateInvestigationWhys,
  updateInvestigationFishbone,
  updateInvestigationFactors,
  updateInvestigationCapas,
  addCapaToInvestigation,
  removeCapaFromInvestigation,
  addEvidenceToInvestigation,
  addEvidenceGapToInvestigation,
  updateNarrative,
  applyAiExtraction,
} = investigationsSlice.actions;

// Selectors
export const selectUserInvestigations = state => state.investigations.userInvestigations;
export const selectSampleInvestigations = state => state.investigations.sampleInvestigations;

export const selectAllInvestigations = createSelector(
  [
    selectUserInvestigations,
    selectSampleInvestigations,
    (state, showSample) => Boolean(showSample),
  ],
  (user, sample, showSample) => {
    if (!showSample) return user;
    if (user.length === 0) return sample;
    return [...user, ...sample];
  },
  {
    memoizeOptions: {
      maxSize: 10,
    },
  }
);

export const selectInvestigationById = (state, id) => {
  if (!id) return null;
  const match = i =>
    i.id === id ||
    String(i.backendId) === String(id) ||
    `DB-${i.backendId}` === String(id);
  const user = state.investigations.userInvestigations.find(match);
  if (user) return user;
  return state.investigations.sampleInvestigations.find(match) || null;
};

export const selectAllCapas = createSelector(
  [
    selectUserInvestigations,
    selectSampleInvestigations,
    (state, showSample) => Boolean(showSample),
  ],
  (userInvestigations, sampleInvestigations, showSample) => {
    const userCapas = userInvestigations.flatMap(inv =>
      (inv.capas || []).map(c => ({ ...c, incidentId: inv.id, incidentTitle: inv.title }))
    );
    if (!showSample) return userCapas;
    const sampleCapas = sampleInvestigations.flatMap(inv =>
      (inv.capas || []).map(c => ({ ...c, incidentId: inv.id, incidentTitle: inv.title, isSample: true }))
    );
    if (userCapas.length === 0) return sampleCapas;
    return [...userCapas, ...sampleCapas];
  },
  {
    memoizeOptions: {
      maxSize: 10,
    },
  }
);

export default investigationsSlice.reducer;

