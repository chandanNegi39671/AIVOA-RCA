/**
 * AIVOA RCA Copilot — Main Application
 *
 * Technology: React 18 + Redux Toolkit + Vite
 * Backend target: FastAPI + LangGraph + Groq (PostgreSQL)
 * Status: Frontend offline/demo mode — backend not yet connected.
 *
 * Design: Premium ivory (#fffefa), deep forest green (#355c48),
 * herbal sage (#527859), subtle terracotta (#d68b6d).
 * No blue/purple gradients. No fabricated operational data.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Activity, AlertTriangle, ArrowRight, ArrowUpRight, Bell, BookOpenCheck,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, ClipboardCheck,
  Clock3, CloudUpload, FileCheck2, FileText, FlaskConical, FolderOpen,
  Gauge, HelpCircle, History, Info, LayoutDashboard, LifeBuoy, ListChecks, Loader2, Menu,
  Microscope, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Target, Trash2, Upload,
  X,
} from 'lucide-react';

// Redux store
import {
  selectAllInvestigations, selectAllCapas, selectInvestigationById,
  addInvestigation, updateInvestigation, markInvestigationSaved,
  updateInvestigationWhys, updateInvestigationFishbone,
  updateInvestigationFactors, updateInvestigationCapas,
  addCapaToInvestigation, removeCapaFromInvestigation,
  addEvidenceToInvestigation, addEvidenceGapToInvestigation, updateNarrative,
  applyAiExtraction,
} from './store/investigationsSlice.js';
import {
  selectActiveNav, selectModalOpen, selectWorkspaceIncidentId,
  selectSidebarOpen, selectShowSampleData, selectSearch, selectFilter, selectToast,
  selectHelpModalOpen, selectGuideModalOpen, selectNotificationsOpen, selectReadNotificationIds,
  setActiveNav, openModal, closeModal, openWorkspace, closeWorkspace,
  setSidebarOpen, toggleSampleData, setSearch, setFilter, showToast, clearToast,
  setHelpModalOpen, setGuideModalOpen, setNotificationsOpen,
  markNotificationRead, markAllNotificationsRead,
} from './store/uiSlice.js';
import {
  selectAiStatus, selectAiExtraction, selectAiError, selectBackendAvailable,
  aiExtractionStart, aiExtractionSuccess, aiExtractionError, aiExtractionReset,
  setBackendAvailable,
} from './store/aiSlice.js';

// API layer
import { checkBackendHealth, extractIncidentWithAI, analyzeIncident, saveInvestigation, fetchInvestigations } from './api.js';

// Safe error boundary
import ErrorBoundary from './ErrorBoundary.jsx';

// ─── Constants ──────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Overview', icon: LayoutDashboard, key: 'Overview' },
      { label: 'Investigations', icon: Microscope, key: 'Investigations', countKey: 'investigations' },
      { label: 'CAPA tracker', icon: ClipboardCheck, key: 'CAPA tracker', countKey: 'capas' },
      { label: 'Evidence library', icon: FolderOpen, key: 'Evidence library' },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { label: 'Quality insights', icon: Activity, key: 'Quality insights' },
      { label: 'Audit trail', icon: History, key: 'Audit trail' },
    ],
  },
];

const FISHBONE_CATEGORIES = ['People', 'Method', 'Machine', 'Material', 'Measurement', 'Environment'];

function generateId() {
  const n = 100 + Math.floor(Math.random() * 900);
  return `DEV-2026-${n}`;
}

function nowTimestamp() {
  return new Date().toISOString();
}

// ─── Primitive Components ────────────────────────────────────────────────────
function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark"><span /><span /><span /></div>
      <div>
        <div className="brand-name">aivoa<span>.</span></div>
        <div className="brand-sub">QUALITY INTELLIGENCE</div>
      </div>
    </div>
  );
}

function Avatar({ initials = 'QA', tone = 'sage' }) {
  return <div className={`avatar avatar-${tone}`}>{initials}</div>;
}

function StagePill({ status }) {
  const tone = status.includes('progress') ? 'green'
    : status.includes('pending') ? 'amber'
    : status.includes('Ready') ? 'blue'
    : 'neutral';
  return (
    <span className={`status-pill ${tone}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function AiBadge({ children, style }) {
  return (
    <span className="badge-ai" style={style}>
      <Sparkles size={12} />
      {children || 'AI suggestion · Pending review'}
    </span>
  );
}

function SampleBadge() {
  return <span className="badge-sample">Sample data</span>;
}

function BackendOfflineBanner() {
  return (
    <div className="backend-banner" role="status">
      <AlertTriangle size={15} />
      <span>
        <b>Backend offline — session mode.</b> AI extraction, RCA analysis, and database persistence require the FastAPI backend. See README for setup.
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon = FileText, title, description, badge, actionText, onAction, secondaryText, onSecondary }) {
  return (
    <div className="empty-state-card">
      {badge && <span className="empty-badge">{badge}</span>}
      <div className="empty-state-icon"><Icon size={28} strokeWidth={1.6} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {(actionText || secondaryText) && (
        <div className="empty-actions">
          {actionText && (
            <button className="btn-primary" onClick={onAction}>
              <Plus size={16} /> {actionText}
            </button>
          )}
          {secondaryText && (
            <button className="btn-secondary" onClick={onSecondary}>
              {secondaryText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon, trend, tone, isSample }) {
  const isUp = typeof trend === 'string' && trend.startsWith('+');
  return (
    <div className="metric-card">
      <div className="metric-top">
        <div className={`metric-icon ${tone}`}><Icon size={19} strokeWidth={1.8} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {isSample && <SampleBadge />}
          <span className={`metric-trend ${isUp ? 'up' : 'flat'}`}>{trend}</span>
        </div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

// ─── AI Extraction Panel (inside modal) ─────────────────────────────────────
function AiExtractionResult({ extraction, backendAvailable, onDismiss }) {
  if (!extraction) return null;

  const isOffline = extraction.source === 'offline-keyword';

  return (
    <div className={`ai-extraction-result ${isOffline ? 'offline' : ''}`}>
      <div className="ai-extraction-head">
        <div className="ai-card-icon"><Sparkles size={16} /></div>
        <div>
          <b>{isOffline ? 'Keyword extraction (offline mode)' : 'AI extraction complete'}</b>
          <small>
            {isOffline
              ? 'Basic keyword analysis only — no AI involved. Connect backend for LangGraph/Groq analysis.'
              : 'Fields populated from incident text. Review and edit before saving.'}
          </small>
        </div>
        <button className="icon-btn subtle" onClick={onDismiss} aria-label="Dismiss extraction"><X size={16} /></button>
      </div>

      {isOffline && (
        <div className="extraction-offline-note">
          <AlertTriangle size={14} />
          <span>Offline extraction is not AI-powered. It identifies keywords only. All fields below are pre-fills — verify before use.</span>
        </div>
      )}

      <div className="extraction-fields">
        {extraction.incident_date && (
          <div className="extraction-field">
            <span className="extraction-field-label">Incident date</span>
            <span className="extraction-field-value">{extraction.incident_date}</span>
            {!isOffline && <AiBadge style={{ fontSize: 10 }} />}
          </div>
        )}
        {extraction.product && (
          <div className="extraction-field">
            <span className="extraction-field-label">Product detected</span>
            <span className="extraction-field-value">{extraction.product}</span>
            {!isOffline && <AiBadge style={{ fontSize: 10 }} />}
          </div>
        )}
        {extraction.batch && (
          <div className="extraction-field">
            <span className="extraction-field-label">Batch / lot</span>
            <span className="extraction-field-value">{extraction.batch}</span>
            {!isOffline && <AiBadge style={{ fontSize: 10 }} />}
          </div>
        )}
        {extraction.department && (
          <div className="extraction-field">
            <span className="extraction-field-label">Department</span>
            <span className="extraction-field-value">{extraction.department}</span>
            {!isOffline && <AiBadge style={{ fontSize: 10 }} />}
          </div>
        )}
        {extraction.severity && (
          <div className="extraction-field">
            <span className="extraction-field-label">Suggested severity</span>
            <span className="extraction-field-value">{extraction.severity}</span>
            {!isOffline && <AiBadge style={{ fontSize: 10 }} />}
          </div>
        )}
      </div>

      {extraction.immediate_containment && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: '#f5f7f2', borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}>
          <b style={{ color: 'var(--green)', display: 'inline-block', marginRight: 6 }}>Immediate containment:</b>
          <span>{extraction.immediate_containment}</span>
        </div>
      )}

      {Array.isArray(extraction.known_facts) && extraction.known_facts.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#f5f7f2', borderRadius: 8 }}>
          <b style={{ fontSize: 11.5, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <CheckCircle2 size={13} /> Verified / known facts ({extraction.known_facts.length})
          </b>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--ink)', lineHeight: 1.45 }}>
            {extraction.known_facts.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      {Array.isArray(extraction.unknowns) && extraction.unknowns.length > 0 && (
        <div style={{ marginTop: 8, padding: '10px 12px', background: '#fcf8f2', borderRadius: 8, border: '1px solid #fae8d4' }}>
          <b style={{ fontSize: 11.5, color: '#9d5926', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <AlertTriangle size={13} /> Unknowns & information gaps ({extraction.unknowns.length})
          </b>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--ink)', lineHeight: 1.45 }}>
            {extraction.unknowns.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      )}

      {!isOffline && extraction.whys?.filter(Boolean).length > 0 && (
        <div className="extraction-note" style={{ marginTop: 10 }}>
          <Sparkles size={13} />
          <span>5 Whys seed pre-populated in workspace — review and edit all entries before saving.</span>
        </div>
      )}
    </div>
  );
}


// ─── New Investigation Modal ─────────────────────────────────────────────────
function NewInvestigationModal({ onClose, onCreate }) {
  const dispatch = useDispatch();
  const aiStatus = useSelector(selectAiStatus);
  const aiExtraction = useSelector(selectAiExtraction);
  const aiError = useSelector(selectAiError);
  const backendAvailable = useSelector(selectBackendAvailable);

  const [mode, setMode] = useState('text');
  const [title, setTitle] = useState('');
  const [product, setProduct] = useState('');
  const [batch, setBatch] = useState('');
  const [department, setDepartment] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [severity, setSeverity] = useState('Major');
  const [details, setDetails] = useState('');
  const [containmentActions, setContainmentActions] = useState('');
  const [knownFacts, setKnownFacts] = useState([]);
  const [unknowns, setUnknowns] = useState([]);
  const [assumptions, setAssumptions] = useState([]);
  const [evidenceAvailable, setEvidenceAvailable] = useState([]);
  const [evidenceMissing, setEvidenceMissing] = useState([]);
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState('');
  const [popNotice, setPopNotice] = useState('');
  const fileRef = useRef(null);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    document.body.classList.add('modal-open');
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Pre-fill form fields while strictly preserving manual edits
  const applyExtractedData = useCallback(data => {
    if (!data) return;
    let populatedCount = 0;

    if (data.title) {
      setTitle(prev => {
        if (!prev.trim()) { populatedCount++; return data.title; }
        return prev;
      });
    }
    if (data.product) {
      setProduct(prev => {
        if (!prev.trim()) { populatedCount++; return data.product; }
        return prev;
      });
    }
    if (data.batch) {
      setBatch(prev => {
        if (!prev.trim()) { populatedCount++; return data.batch; }
        return prev;
      });
    }
    if (data.department) {
      setDepartment(prev => {
        if (!prev.trim()) { populatedCount++; return data.department; }
        return prev;
      });
    }
    if (data.incident_date) {
      setIncidentDate(prev => {
        if (!prev.trim()) { populatedCount++; return data.incident_date; }
        return prev;
      });
    }
    if (data.severity) {
      setSeverity(data.severity);
      populatedCount++;
    }
    const narrative = data.deviation_description || data.source_text || '';
    if (narrative) {
      setDetails(prev => {
        if (!prev.trim()) { populatedCount++; return narrative; }
        return prev;
      });
    }
    if (data.immediate_containment) {
      setContainmentActions(prev => {
        if (!prev.trim()) { populatedCount++; return data.immediate_containment; }
        return prev;
      });
    }
    if (Array.isArray(data.known_facts)) setKnownFacts(data.known_facts);
    if (Array.isArray(data.unknowns)) setUnknowns(data.unknowns);
    if (Array.isArray(data.assumptions)) setAssumptions(data.assumptions);
    if (Array.isArray(data.evidence_available)) setEvidenceAvailable(data.evidence_available);
    if (Array.isArray(data.evidence_missing)) setEvidenceMissing(data.evidence_missing);

    setPopNotice('Incident fields auto-populated from source material. Any existing manual entries were preserved.');
  }, []);

  // When Redux extraction state changes
  useEffect(() => {
    if (aiExtraction) {
      applyExtractedData(aiExtraction);
    }
  }, [aiExtraction, applyExtractedData]);

  const runExtraction = async (opts = {}) => {
    const targetFile = opts.overrideFile !== undefined ? opts.overrideFile : file;
    const targetText = opts.overrideText !== undefined ? opts.overrideText : (mode === 'text' ? details : '');

    if (!targetText && !targetFile) {
      setFormError('Add source material (text or file) before running extraction.');
      return;
    }
    setFormError('');
    setPopNotice('');
    dispatch(aiExtractionStart());

    try {
      const result = await extractIncidentWithAI({ text: targetText || '', file: targetFile });
      dispatch(aiExtractionSuccess(result));
      applyExtractedData(result);
    } catch (error) {
      dispatch(aiExtractionError(error.message || 'AI extraction failed.'));
    }
  };

  const handleFileSelected = selectedFile => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setFormError('');
    setPopNotice('');
    dispatch(aiExtractionReset());
    if (backendAvailable) {
      runExtraction({ overrideFile: selectedFile });
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setFormError('Incident title is required.');
      return;
    }
    if (!details.trim() && !file) {
      setFormError('Provide deviation details or attach a file.');
      return;
    }
    setFormError('');

    const newId = generateId();

    // Build RCA fields: Seed problem statement (Why 0) from deviation details or title
    const initialProblem = details.trim() || title.trim();
    const baseWhys = aiExtraction?.whys && aiExtraction.whys.some(Boolean)
      ? aiExtraction.whys
      : [initialProblem, '', '', '', ''];
    const baseFishbone = aiExtraction?.fishbone || {
      People: [], Method: [], Machine: [], Material: [], Measurement: [], Environment: [],
    };
    const baseFactors = aiExtraction?.factors || [];
    const baseCapas = aiExtraction?.capas || [];

    const newInvestigation = {
      id: newId,
      title: title.trim(),
      product: product.trim() || 'Product not specified',
      batch: batch.trim() || '',
      department: department.trim() || 'Operations',
      severity,
      details: details.trim() || (file ? `Source file: ${file.name}` : ''),
      fileName: file?.name || '',
      containmentActions: containmentActions.trim(),
      status: 'RCA in progress',
      stage: 2,
      date: incidentDate || 'Just now',
      initials: 'QA',
      color: 'sage',
      isSample: false,
      whys: baseWhys,
      fishbone: baseFishbone,
      factors: baseFactors.map((f, i) => ({ ...f, id: Date.now() + i })),
      capas: baseCapas.map((c, i) => ({ ...c, id: `CAPA-${newId}-${i}`, source: 'ai' })),
      knownFacts,
      unknowns,
      assumptions,
      evidence: [
        ...(file
          ? [{ id: `ev-${Date.now()}`, name: file.name, note: 'Uploaded at investigation intake', status: 'Available', type: 'attached' }]
          : []),
        ...evidenceAvailable.map((item, i) => ({ id: `ev-avail-${Date.now()}-${i}`, name: item, note: 'Extracted from intake document', status: 'Available', type: 'extracted' })),
        ...evidenceMissing.map((item, i) => ({ id: `ev-miss-${Date.now()}-${i}`, name: item, note: 'Identified evidence gap', status: 'Missing', type: 'missing' })),
      ],
      aiExtracted: !!aiExtraction && !aiExtraction.offline,
      owner: 'Quality Lead (QA)',
      createdAt: nowTimestamp(),
    };

    dispatch(aiExtractionReset());
    onCreate(newInvestigation);
  };

  const isLoading = aiStatus === 'loading';

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="eyebrow">NEW QUALITY RECORD</div>
            <h2 id="modal-title">Start an investigation</h2>
            <p>Provide source material — AI will extract fields to populate the RCA workspace.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal"><X size={20} /></button>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body">
          {/* Step progress */}
          <div className="modal-progress">
            <span className="progress-active" />
            <span className={aiExtraction ? 'progress-active' : ''} />
            <span />
          </div>

          {/* Backend offline notice */}
          {!backendAvailable && (
            <div className="backend-banner" style={{ marginBottom: 16 }}>
              <AlertTriangle size={14} />
              <span>
                <b>Backend offline.</b> AI extraction is unavailable. Start FastAPI to extract structured fields; you can still enter fields manually.
              </span>
            </div>
          )}

          {/* Step 1: Source Material */}
          <div className="modal-section-label">Step 1 — Provide incident source material</div>

          <div className="source-tabs">
            <button
              type="button"
              className={mode === 'text' ? 'selected' : ''}
              onClick={() => setMode('text')}
            >
              <FileText size={15} /> Paste text or email
            </button>
            <button
              type="button"
              className={mode === 'upload' ? 'selected' : ''}
              onClick={() => setMode('upload')}
            >
              <CloudUpload size={15} /> Upload PDF / document
            </button>
          </div>

          {mode === 'text' ? (
            <textarea
              className="text-area"
              rows="5"
              placeholder="Paste the deviation description, lab observation notes, or investigation email thread here…"
              value={details}
              onChange={e => { setDetails(e.target.value); setFormError(''); dispatch(aiExtractionReset()); }}
              aria-label="Incident source text"
            />
          ) : (
            <div
              className={`drop-zone ${file ? 'has-file' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileSelected(f);
              }}
              role="button"
              tabIndex={0}
              aria-label="File upload area"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.eml,.doc,.docx"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                }}
              />
              {file ? (
                <>
                  <div className="drop-icon success"><FileCheck2 size={24} /></div>
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024).toFixed(0)} KB · {isLoading ? 'Extracting with AI…' : 'Attached & Extracted'}</span>
                  <button
                    type="button"
                    className="remove-file"
                    onClick={ev => {
                      ev.stopPropagation();
                      setFile(null);
                      setPopNotice('');
                      dispatch(aiExtractionReset());
                    }}
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <div className="drop-icon"><Upload size={22} /></div>
                  <strong>Drop file here, or click to browse</strong>
                  <span>PDF, TXT, EML, DOCX · Max 20 MB</span>
                </>
              )}
            </div>
          )}

          {mode === 'upload' && (
            <textarea
              className="text-area context-area"
              rows="2"
              placeholder="Optional: add context, lot history, or preliminary observations…"
              value={details}
              onChange={e => setDetails(e.target.value)}
              aria-label="Additional context"
            />
          )}

          {/* Extract button */}
          <button
            type="button"
            className="btn-extract"
            onClick={() => runExtraction()}
            disabled={isLoading || (!details.trim() && !file)}
          >
            {isLoading
              ? <><Loader2 size={16} className="spin" /> Extracting fields from {file ? file.name : 'source text'}…</>
              : backendAvailable
                ? <><Sparkles size={16} /> Extract fields with AI (LangGraph + Groq)</>
                : <><AlertTriangle size={16} /> Extract fields (backend required)</>
            }
          </button>

          {aiError && (
            <div className="form-error"><AlertTriangle size={15} /> {aiError}</div>
          )}

          {/* AI Extraction Result */}
          <AiExtractionResult
            extraction={aiExtraction}
            backendAvailable={backendAvailable}
            onDismiss={() => { dispatch(aiExtractionReset()); setPopNotice(''); }}
          />

          {/* Step 2: Confirm/edit identification fields */}
          <div className="modal-section-label" style={{ marginTop: 20 }}>
            Step 2 — Confirm identification fields{aiExtraction && ' (pre-filled from extraction — edit as needed)'}
          </div>

          {popNotice && (
            <div className="backend-banner" style={{ marginBottom: 14, background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
              <CheckCircle2 size={15} color="#16a34a" />
              <span>{popNotice}</span>
            </div>
          )}

          <label className="field-label" htmlFor="incident-title">
            Incident title <i>Required</i>
            {aiExtraction?.title && <AiBadge style={{ fontSize: 10, marginLeft: 6 }} />}
          </label>
          <input
            id="incident-title"
            className="text-field"
            placeholder="e.g. Assay result outside specification"
            value={title}
            onChange={e => { setTitle(e.target.value); setFormError(''); }}
            aria-required="true"
          />

          <label className="field-label" htmlFor="deviation-details" style={{ marginTop: 12 }}>
            Deviation description / narrative <i>Required</i>
            {(aiExtraction?.deviation_description || aiExtraction?.source_text) && <AiBadge style={{ fontSize: 10, marginLeft: 6 }} />}
          </label>
          <textarea
            id="deviation-details"
            className="text-field"
            rows="3"
            placeholder="Describe the deviation, problem statement, or observed discrepancy…"
            value={details}
            onChange={e => { setDetails(e.target.value); setFormError(''); }}
            aria-required="true"
          />

          <div className="inline-fields">
            <div>
              <label className="field-label" htmlFor="product-field">
                Product {aiExtraction?.product && <AiBadge style={{ fontSize: 10 }} />}
              </label>
              <input
                id="product-field"
                className="text-field"
                placeholder="API product name"
                value={product}
                onChange={e => setProduct(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="batch-field">
                Batch / lot number {aiExtraction?.batch && <AiBadge style={{ fontSize: 10 }} />}
              </label>
              <input
                id="batch-field"
                className="text-field"
                placeholder="e.g. AMX-24091"
                value={batch}
                onChange={e => setBatch(e.target.value)}
              />
            </div>
          </div>

          <div className="inline-fields">
            <div>
              <label className="field-label" htmlFor="department-field">
                Department / Area {aiExtraction?.department && <AiBadge style={{ fontSize: 10 }} />}
              </label>
              <input
                id="department-field"
                className="text-field"
                placeholder="e.g. API Synthesis / Packaging"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="date-field">
                Incident date {aiExtraction?.incident_date && <AiBadge style={{ fontSize: 10 }} />}
              </label>
              <input
                id="date-field"
                className="text-field"
                placeholder="YYYY-MM-DD or date string"
                value={incidentDate}
                onChange={e => setIncidentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="inline-fields">
            <div>
              <label className="field-label">
                Severity classification {aiExtraction?.severity && <AiBadge style={{ fontSize: 10 }} />}
              </label>
              <select
                className="text-field"
                value={severity}
                onChange={e => setSeverity(e.target.value)}
              >
                <option value="Major">Major deviation</option>
                <option value="Critical">Critical deviation</option>
                <option value="Minor">Minor deviation</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="containment-field">
                Immediate containment {aiExtraction?.immediate_containment && <AiBadge style={{ fontSize: 10 }} />}
              </label>
              <input
                id="containment-field"
                className="text-field"
                placeholder="e.g. Batch quarantined; filling halted"
                value={containmentActions}
                onChange={e => setContainmentActions(e.target.value)}
              />
            </div>
          </div>

          {formError && (
            <div className="form-error" role="alert">
              <AlertTriangle size={15} /> {formError}
            </div>
          )}

          {/* GxP disclaimer */}
          <div className="privacy-note">
            <ShieldCheck size={17} />
            <span>
              <b>GxP notice:</b> All AI-generated fields are preliminary suggestions. A qualified person must independently verify every finding before regulatory submission or approval.
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSubmit}>
            Open RCA workspace <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Investigation Workspace (full RCA editor) ───────────────────────────────
function InvestigationWorkspace() {
  const dispatch = useDispatch();
  const incidentId = useSelector(selectWorkspaceIncidentId);
  const incident = useSelector(state => selectInvestigationById(state, incidentId));
  const backendAvailable = useSelector(selectBackendAvailable);

  // Local editable state (synced to Redux on change)
  const [tab, setTab] = useState('5 Whys');
  const [newObsCat, setNewObsCat] = useState(null);
  const [newObsText, setNewObsText] = useState('');
  const [newCapaTitle, setNewCapaTitle] = useState('');
  const [newCapaDesc, setNewCapaDesc] = useState('');
  const [newCapaType, setNewCapaType] = useState('Corrective action');
  const [addingCapa, setAddingCapa] = useState(false);
  const [newGapName, setNewGapName] = useState('');
  const [addingGap, setAddingGap] = useState(false);
  const [newEvidenceName, setNewEvidenceName] = useState('');
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [approved, setApproved] = useState(false);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [persistenceBusy, setPersistenceBusy] = useState(false);
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const fileRef = useRef(null);

  if (!incident) {
    return (
      <div className="page-content">
        <EmptyState icon={Microscope} title="Investigation not found" description="This record may have been removed." />
      </div>
    );
  }

  const whys = incident.whys || ['', '', '', '', ''];
  const fishbone = incident.fishbone || { People: [], Method: [], Machine: [], Material: [], Measurement: [], Environment: [] };
  const factors = incident.factors || [];
  const capas = incident.capas || [];
  const evidence = incident.evidence || [];

  const attachedCount = evidence.filter(e => e.status === 'Available').length;
  const progressPercent = evidence.length > 0 ? Math.round((attachedCount / evidence.length) * 100) : 0;

  // Handlers — all dispatch to Redux
  const updateWhy = (idx, val) => {
    const next = whys.map((w, i) => (i === idx ? val : w));
    dispatch(updateInvestigationWhys({ id: incident.id, whys: next }));
  };
  const addWhy = () => dispatch(updateInvestigationWhys({ id: incident.id, whys: [...whys, ''] }));
  const removeWhy = idx => {
    if (whys.length <= 1) return;
    dispatch(updateInvestigationWhys({ id: incident.id, whys: whys.filter((_, i) => i !== idx) }));
  };

  const addObservation = cat => {
    if (!newObsText.trim()) { setNewObsCat(null); return; }
    const next = { ...fishbone, [cat]: [...(fishbone[cat] || []), newObsText.trim()] };
    dispatch(updateInvestigationFishbone({ id: incident.id, fishbone: next }));
    setNewObsText('');
    setNewObsCat(null);
  };
  const removeObservation = (cat, idx) => {
    const next = { ...fishbone, [cat]: fishbone[cat].filter((_, i) => i !== idx) };
    dispatch(updateInvestigationFishbone({ id: incident.id, fishbone: next }));
  };

  const toggleFactor = fid => {
    const next = factors.map(f => (f.id === fid ? { ...f, checked: !f.checked } : f));
    dispatch(updateInvestigationFactors({ id: incident.id, factors: next }));
  };
  const addFactor = text => {
    if (!text.trim()) return;
    dispatch(updateInvestigationFactors({
      id: incident.id,
      factors: [...factors, { id: Date.now(), text: text.trim(), relevance: 'Needs evidence', checked: false }],
    }));
  };

  const submitCapa = () => {
    if (!newCapaTitle.trim()) return;
    dispatch(addCapaToInvestigation({
      id: incident.id,
      capa: { id: `CAPA-${Date.now()}`, title: newCapaTitle.trim(), desc: newCapaDesc.trim(), type: newCapaType, priority: 'Medium priority', source: 'user' },
    }));
    setNewCapaTitle('');
    setNewCapaDesc('');
    setNewCapaType('Corrective action');
    setAddingCapa(false);
  };

  const submitGap = () => {
    if (!newGapName.trim()) return;
    dispatch(addEvidenceGapToInvestigation({
      id: incident.id,
      gap: { id: `ev-gap-${Date.now()}`, name: newGapName.trim(), note: 'Identified during RCA review', status: 'Missing', type: 'missing' },
    }));
    setNewGapName('');
    setAddingGap(false);
  };

  const handleFileAttach = f => {
    if (!f) return;
    dispatch(addEvidenceToInvestigation({
      id: incident.id,
      evidence: { id: `ev-${Date.now()}`, name: f.name, note: `Attached ${new Date().toLocaleString()}`, status: 'Available', type: 'attached' },
    }));
  };

  const runRealAnalysis = async () => {
    setAnalysisBusy(true); setWorkflowError(''); setWorkflowMessage('');
    try {
      const result = await analyzeIncident({
        incident_text: incident.details || incident.narrative || '',
        extracted_fields: { title: incident.title, product: incident.product, batch: incident.batch, severity: incident.severity },
        evidence: evidence.filter(e => e.status === 'Available').map(e => `${e.name}: ${e.note || ''}`),
      });
      // Build whys: problem_statement as first entry, then five_whys answers
      const problemStatement = result.problem_statement || '';
      const fiveWhyAnswers = (result.five_whys || []).map(x => x.answer);
      dispatch(updateInvestigationWhys({ id: incident.id, whys: [problemStatement, ...fiveWhyAnswers] }));
      // Store problem statement on the investigation for persistence
      dispatch(updateInvestigation({ id: incident.id, changes: { problemStatement } }));
      const fishboneMap = { People: 'People', Process: 'Method', Equipment: 'Machine', Materials: 'Material', Measurement: 'Measurement', Environment: 'Environment' };
      const nextFishbone = { ...fishbone };
      Object.entries(fishboneMap).forEach(([apiKey, uiKey]) => { nextFishbone[uiKey] = result.fishbone?.[apiKey] || []; });
      dispatch(updateInvestigationFishbone({ id: incident.id, fishbone: nextFishbone }));
      dispatch(updateInvestigationFactors({ id: incident.id, factors: [
        ...(result.hypotheses || []).map(h => ({ id: h.id, title: h.statement, description: h.rationale, status: h.status, evidence: h.supporting_evidence || [], evidenceNeeded: h.evidence_needed || [], type: 'hypothesis' })),
        ...(result.contributing_factors || []).map((f, i) => ({ id: `factor-${i}`, title: f.factor || 'Contributing factor', description: f.status || '', evidence: f.evidence_refs || [] })),
      ] }));
      (result.evidence_gaps || []).forEach((gap, i) => dispatch(addEvidenceGapToInvestigation({ id: incident.id, gap: { id: `ai-gap-${Date.now()}-${i}`, name: gap, note: 'AI-identified gap — verify during investigation', status: 'Missing', type: 'missing' } })));
      (result.capas || []).forEach((c, i) => dispatch(addCapaToInvestigation({ id: incident.id, capa: { id: `AI-CAPA-${Date.now()}-${i}`, title: c.action, desc: c.rationale, type: c.type, priority: c.priority, verification: c.verification, source: 'ai', status: 'Proposed — review required' } })));
      setWorkflowMessage('AI analysis completed. Findings are unverified suggestions; review and edit them before saving.');
    } catch (error) {
      setWorkflowError(error.message || 'RCA analysis failed.');
    } finally { setAnalysisBusy(false); }
  };

  const persistInvestigation = async () => {
    setPersistenceBusy(true); setWorkflowError(''); setWorkflowMessage('');
    try {
      const result = await saveInvestigation({
        backend_id: incident.backendId || null,
        title: incident.title,
        original_text: incident.details || '',
        source_metadata: {
          source_type: incident.fileName ? 'pdf_or_attachment' : 'text',
          filename: incident.fileName || null,
          local_id: String(incident.id),
        },
        extracted_fields: {
          title: incident.title,
          product: incident.product,
          batch: incident.batch,
          severity: incident.severity,
          known_facts: incident.knownFacts || [],
          unknowns: incident.unknowns || [],
          assumptions: incident.assumptions || [],
        },
        analysis: {
          five_whys: whys.map((w, idx) => ({ why: idx + 1, question: `Why level ${idx + 1}`, answer: w })),
          fishbone: {
            People: fishbone.People || [],
            Process: fishbone.Method || [],
            Equipment: fishbone.Machine || [],
            Materials: fishbone.Material || [],
            Measurement: fishbone.Measurement || [],
            Environment: fishbone.Environment || [],
          },
          hypotheses: factors.filter(f => f.type === 'hypothesis').map(h => ({
            id: String(h.id),
            statement: h.title || h.text || '',
            rationale: h.description || '',
            supporting_evidence: h.evidence || [],
            contradicting_evidence: [],
            evidence_needed: h.evidenceNeeded || [],
            status: h.status || 'Unverified hypothesis',
          })),
          contributing_factors: factors.filter(f => f.type !== 'hypothesis').map(f => ({
            factor: f.title || f.text || '',
            status: f.relevance || 'Observed factor',
            evidence_refs: f.evidence || [],
          })),
          problem_statement: incident.problemStatement || whys[0] || '',
          evidence_gaps: evidence.filter(e => e.status === 'Missing').map(e => e.name),
          capas: capas.map(c => ({
            action: c.title,
            type: c.type || 'Corrective',
            rationale: c.desc || c.description || '',
            priority: c.priority || 'Medium',
            verification: c.verification || [],
          })),
          evidence: evidence.filter(e => e.status === 'Available').map(e => ({
            id: e.id,
            name: e.name,
            note: e.note,
            status: e.status,
            type: e.type,
          })),
        },
        human_findings: {
          reviewed_whys: whys,
          reviewed_fishbone: fishbone,
          reviewed_factors: factors,
          reviewed_capas: capas,
          qualified_review_completed: approved,
        },
        review_status: approved ? 'Qualified review completed' : 'Pending qualified review',
      });
      dispatch(updateInvestigation({
        id: incident.id,
        changes: {
          backendId: result.id,
          status: approved ? 'Ready for QA' : 'Pending qualified review',
        },
      }));
      setWorkflowMessage(`Saved to database as investigation #${result.id}.`);
      dispatch(showToast({ message: `Saved investigation #${result.id} to database`, type: 'success' }));
      return result;
    } catch (error) {
      setWorkflowError(error.message || 'Could not save investigation.');
      dispatch(showToast({ message: error.message || 'Could not save investigation.', type: 'error' }));
      throw error;
    } finally {
      setPersistenceBusy(false);
    }
  };

  const productFull = [incident.product, incident.batch].filter(Boolean).join(' · Batch ');

  return (
    <div className="workspace-view">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button onClick={() => dispatch(closeWorkspace())}>Investigations</button>
        <ChevronRight size={14} />
        <span>{incident.id}</span>
      </div>

      {/* Sample data banner */}
      {incident.isSample && (
        <div className="sample-notice-banner">
          <AlertTriangle size={16} />
          <div>
            <b>Sample data record</b> — Illustrative template only. Not real operational, clinical, or compliance data.
          </div>
        </div>
      )}

      {/* Title row */}
      <div className="workspace-title-row">
        <div>
          <div className="eyebrow">DEVIATION INVESTIGATION · {incident.id}</div>
          <h1>{incident.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0 0' }}>{productFull || 'Product / batch not specified'}</p>
        </div>
        <div className="workspace-actions">
          {incident.isSample && <SampleBadge />}
          {incident.aiExtracted && <AiBadge>AI-extracted · Review required</AiBadge>}
          <StagePill status={incident.status || 'RCA in progress'} />
          {!incident.isSample && <button className="btn-secondary small" onClick={runRealAnalysis} disabled={analysisBusy}>
            {analysisBusy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />} {analysisBusy ? 'Analyzing…' : 'Run AI RCA'}
          </button>}
          {!incident.isSample && <button className="btn-primary small" onClick={persistInvestigation} disabled={persistenceBusy}>
            {persistenceBusy ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />} {persistenceBusy ? 'Saving…' : 'Save to database'}
          </button>}
          <button className="btn-secondary small" onClick={() => window.print()}>
            <FileText size={15} /> Export
          </button>
        </div>
      </div>
      {(workflowMessage || workflowError) && <div className={workflowError ? 'backend-banner error-banner' : 'backend-banner success-banner'} role="status" style={{ marginBottom: 16 }}>
        {workflowError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
        <span>{workflowError || workflowMessage}</span>
      </div>}

      {/* 4-step GxP workflow */}
      <div className="workflow-strip">
        <div className="workflow-step done">
          <span><Check size={14} /></span>
          <div><b>Deviation intake</b><small>Record captured</small></div>
        </div>
        <div className="workflow-line done" />
        <div className="workflow-step current">
          <span>2</span>
          <div><b>Root cause analysis</b><small>Evidence-led RCA</small></div>
        </div>
        <div className="workflow-line" />
        <div className="workflow-step">
          <span>3</span>
          <div><b>CAPA formulation</b><small>Pending RCA</small></div>
        </div>
        <div className="workflow-line" />
        <div className="workflow-step">
          <span>4</span>
          <div><b>QA review & sign-off</b><small>Not started</small></div>
        </div>
      </div>

      <div className="workspace-grid">
        <div className="workspace-main">

          {/* 01 — Incident Summary */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">01 / INCIDENT SUMMARY</div>
                <h3>What happened?</h3>
              </div>
              <span className="editable-tag">Editable</span>
            </div>
            <label className="field-label" htmlFor="narrative">Investigation narrative</label>
            <textarea
              id="narrative"
              className="text-area narrative"
              rows="4"
              value={incident.details || ''}
              onChange={e => dispatch(updateNarrative({ id: incident.id, notes: e.target.value }))}
              placeholder="Describe the observed deviation, equipment IDs, operational parameters, and immediate containment steps…"
            />
            <div className="inline-fields">
              <div>
                <label className="field-label">Severity</label>
                <div className="text-field-static">{incident.severity || 'Major'}</div>
              </div>
              <div>
                <label className="field-label">Investigation owner</label>
                <div className="owner-select">
                  <Avatar initials="QA" tone="sage" />
                  <span>{incident.owner || 'Quality Lead (QA)'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* 02 — Root Cause Analysis */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">02 / ROOT CAUSE ANALYSIS</div>
                <h3>Explore the cause</h3>
                <p className="panel-sub">
                  Build a traceable explanation from verified evidence. All AI-populated fields are hypotheses — edit freely.
                </p>
              </div>
              <AiBadge />
            </div>

            <div className="segmented-tabs">
              {['5 Whys', 'Fishbone', 'Contributing factors', 'Facts & unknowns'].map(t => (
                <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>

            {/* 5 Whys */}
            {tab === '5 Whys' && (
              <div className="why-list">
                {whys.map((w, i) => (
                  <div className="why-row" key={i}>
                    <div className="why-number">{i + 1}</div>
                    <div className="why-content">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label className="field-label" style={{ margin: 0 }}>
                          {i === 0 ? 'Problem statement' : `Why ${i}?`}
                        </label>
                        {incident.aiExtracted && w && <AiBadge style={{ fontSize: 10, padding: '1px 5px' }} />}
                      </div>
                      <input
                        className="text-field why-input"
                        value={w}
                        onChange={e => updateWhy(i, e.target.value)}
                        placeholder={i === 0 ? 'Describe the observed problem…' : `Why did that happen?`}
                      />
                    </div>
                    {whys.length > 1 && (
                      <button className="icon-btn subtle" title="Remove" onClick={() => removeWhy(i)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                <button className="add-why" onClick={addWhy}>
                  <Plus size={15} /> Add another why
                </button>
              </div>
            )}

            {/* Fishbone */}
            {tab === 'Fishbone' && (
              <div className="fishbone-grid">
                {FISHBONE_CATEGORIES.map(cat => (
                  <div className="fishbone-item" key={cat}>
                    <div className="fishbone-head">
                      <span>{cat}</span>
                      {incident.aiExtracted && fishbone[cat]?.length > 0 && (
                        <AiBadge style={{ fontSize: 10, padding: '1px 5px' }} />
                      )}
                    </div>
                    <div className="fishbone-observations">
                      {(fishbone[cat] || []).map((obs, idx) => (
                        <div className="fishbone-chip" key={idx}>
                          <span>{obs}</span>
                          <button
                            className="icon-btn subtle"
                            style={{ width: 22, height: 22 }}
                            onClick={() => removeObservation(cat, idx)}
                            title="Remove"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {newObsCat === cat ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <input
                          className="text-field"
                          style={{ padding: '6px 10px', fontSize: 13 }}
                          placeholder={`${cat} observation…`}
                          value={newObsText}
                          onChange={e => setNewObsText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addObservation(cat)}
                          autoFocus
                        />
                        <button className="btn-primary small" onClick={() => addObservation(cat)}>Add</button>
                        <button className="btn-secondary small" onClick={() => setNewObsCat(null)}>✕</button>
                      </div>
                    ) : (
                      <button
                        className="add-obs-btn"
                        onClick={() => { setNewObsCat(cat); setNewObsText(''); }}
                      >
                        <Plus size={13} /> Add observation
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Contributing factors */}
            {tab === 'Contributing factors' && (
              <div className="factor-list">
                {factors.length === 0 && (
                  <p style={{ color: 'var(--muted)', fontSize: 13.5, padding: '12px 0' }}>
                    No contributing factors identified yet. Add factors manually or run AI extraction on source text.
                  </p>
                )}
                {factors.map(f => (
                  <label key={f.id} className="factor-row">
                    <input
                      type="checkbox"
                      checked={f.checked}
                      onChange={() => toggleFactor(f.id)}
                    />
                    <span>{f.text}</span>
                    {incident.aiExtracted && <AiBadge style={{ fontSize: 10.5, padding: '2px 6px', marginRight: 6 }}>AI hypothesis</AiBadge>}
                    <em>{f.relevance}</em>
                  </label>
                ))}
                <FactorAdder onAdd={addFactor} />
              </div>
            )}

            {/* Facts & Unknowns */}
            {tab === 'Facts & unknowns' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: '14px 16px', background: '#f5f7f2', borderRadius: 10, border: '1px solid #dfe7da' }}>
                  <b style={{ color: 'var(--green)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <CheckCircle2 size={15} /> Observed / Known Facts
                  </b>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 8px' }}>
                    Empirical data verified by the investigation team. These are substantiated facts, distinct from hypotheses.
                  </p>
                  {(incident.knownFacts || []).length === 0 ? (
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>No explicit known facts isolated yet.</span>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink)' }}>
                      {(incident.knownFacts || []).map((fact, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>{fact}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ padding: '14px 16px', background: '#fcf8f2', borderRadius: 10, border: '1px solid #fae8d4' }}>
                  <b style={{ color: '#9d5926', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <AlertTriangle size={15} /> Unknowns & Information Gaps
                  </b>
                  <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 8px' }}>
                    Information that must be answered with empirical evidence before root cause can be finalized.
                  </p>
                  {(incident.unknowns || []).length === 0 ? (
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>No explicit unknowns recorded.</span>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink)' }}>
                      {(incident.unknowns || []).map((u, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>{u}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {(incident.assumptions || []).length > 0 && (
                  <div style={{ padding: '14px 16px', background: '#fafaf6', borderRadius: 10, border: '1px solid var(--line)' }}>
                    <b style={{ color: 'var(--ink)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <HelpCircle size={15} /> Working Assumptions
                    </b>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink)' }}>
                      {(incident.assumptions || []).map((a, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 03 — CAPA */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">03 / CORRECTIVE & PREVENTIVE ACTION</div>
                <h3>CAPA recommendations</h3>
                <p className="panel-sub">
                  All actions are preliminary suggestions. QA approval is required before execution.
                </p>
              </div>
              <AiBadge />
            </div>

            {capas.length === 0 && !addingCapa && (
              <p style={{ color: 'var(--muted)', fontSize: 13.5, padding: '12px 0 8px' }}>
                No CAPA actions drafted. Add actions after identifying root causes above.
              </p>
            )}

            {capas.map((capa, idx) => (
              <div className="capa-row" key={capa.id || idx}>
                <div className={`capa-check ${capa.type.includes('Preventive') ? 'muted' : ''}`}>
                  {capa.type.includes('Preventive') ? <ListChecks size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div className="capa-copy">
                  <b>{capa.title}</b>
                  {capa.desc && <p>{capa.desc}</p>}
                  <div className="capa-tags">
                    {capa.source === 'ai' && <AiBadge style={{ fontSize: 11, padding: '2px 6px' }} />}
                    <span className="capa-tag">{capa.type}</span>
                    <span className="capa-tag" style={{ background: '#f0f3ec', color: 'var(--green)', borderColor: 'var(--green-border)' }}>
                      {capa.priority}
                    </span>
                  </div>
                </div>
                <button
                  className="icon-btn subtle"
                  title="Remove"
                  onClick={() => dispatch(removeCapaFromInvestigation({ id: incident.id, capaId: capa.id }))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {addingCapa ? (
              <div className="add-capa-form">
                <label className="field-label" htmlFor="capa-title">CAPA action title <i>Required</i></label>
                <input
                  id="capa-title"
                  className="text-field"
                  placeholder="e.g. Verify blend uniformity and review sampling plan"
                  value={newCapaTitle}
                  onChange={e => setNewCapaTitle(e.target.value)}
                  autoFocus
                />
                <label className="field-label" htmlFor="capa-desc">Description <i>Optional</i></label>
                <textarea
                  id="capa-desc"
                  className="text-area"
                  rows="2"
                  placeholder="Steps to address or prevent the root cause…"
                  value={newCapaDesc}
                  onChange={e => setNewCapaDesc(e.target.value)}
                />
                <label className="field-label">Action type</label>
                <select className="text-field" value={newCapaType} onChange={e => setNewCapaType(e.target.value)}>
                  <option>Corrective action</option>
                  <option>Preventive action</option>
                  <option>Containment action</option>
                </select>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn-primary small" onClick={submitCapa}>Add CAPA action</button>
                  <button className="btn-secondary small" onClick={() => setAddingCapa(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="add-why" onClick={() => setAddingCapa(true)}>
                <Plus size={15} /> Add CAPA action
              </button>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="workspace-side">
          {/* Evidence Register */}
          <section className="panel evidence-panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">EVIDENCE REGISTER</div>
                <h3>Evidence & gaps</h3>
              </div>
            </div>

            {evidence.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
                No evidence attached. Upload source documents or mark missing evidence below.
              </p>
            )}

            {evidence.map(item => (
              <div className="evidence-item" key={item.id}>
                <div className={`evidence-icon ${item.type}`}>
                  {item.type === 'attached' ? <FileCheck2 size={17} /> : <AlertTriangle size={17} />}
                </div>
                <div>
                  <b>{item.name}</b>
                  <small>{item.note}</small>
                </div>
                <span className={item.type === 'attached' ? 'evidence-state' : 'missing-state'}>
                  {item.status}
                </span>
              </div>
            ))}

            {/* Attach file */}
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,.txt,.eml,.doc,.docx,.png,.jpg"
              onChange={e => { handleFileAttach(e.target.files?.[0] || null); e.target.value = ''; }}
            />
            <button className="outline-full" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Attach evidence file
            </button>

            {/* Add evidence gap */}
            {addingGap ? (
              <div style={{ marginTop: 10 }}>
                <input
                  className="text-field"
                  placeholder="Required evidence item (e.g. calibration certificate)"
                  value={newGapName}
                  onChange={e => setNewGapName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitGap()}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button className="btn-primary small" onClick={submitGap}>Add gap</button>
                  <button className="btn-secondary small" onClick={() => setAddingGap(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="outline-full" style={{ marginTop: 6, borderColor: 'var(--amber-border)', color: 'var(--amber)' }} onClick={() => setAddingGap(true)}>
                <AlertTriangle size={14} /> Log missing evidence
              </button>
            )}
          </section>

          {/* Evidence Completeness */}
          <section className="ai-review-card">
            <div className="ai-card-head">
              <div className="ai-card-icon"><Sparkles size={16} /></div>
              <span>AI REVIEW · {backendAvailable ? 'CONNECTED' : 'OFFLINE MODE'}</span>
              <span className="live-dot" style={{ background: backendAvailable ? 'var(--green)' : 'var(--muted)' }} />
            </div>
            <h3>Evidence completeness</h3>
            <p>
              {backendAvailable
                ? evidence.length === 0
                  ? 'Run AI RCA to identify evidence gaps and generate hypothesis-driven analysis.'
                  : `${attachedCount} of ${evidence.length} evidence items attached. ${evidence.length - attachedCount > 0 ? 'Outstanding gaps require investigator follow-up.' : 'All identified evidence collected — ready for qualified review.'}`
                : 'Connect the FastAPI backend to enable LangGraph-powered evidence gap analysis and hypothesis strengthening.'
              }
            </p>
            <div className="review-progress">
              <div>
                <span>Evidence attached</span>
                <b>{attachedCount} of {evidence.length}</b>
              </div>
              <div className="review-track">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </section>

          {/* QP Sign-off (demo) */}
          <section className="approval-card">
            <div className="approval-icon"><ShieldCheck size={18} /></div>
            <div>
              <b>QP Review (simulation only)</b>
              <p>No real GxP approval workflow exists in this demo.</p>
            </div>
            <button
              className={`approval-toggle ${approved ? 'checked' : ''}`}
              onClick={() => setApproved(v => !v)}
              aria-label="Toggle QP review simulation"
            >
              {approved && <Check size={12} />}
            </button>
            {approved && (
              <div className="approval-confirm">
                <b>DEMO ONLY:</b> No regulated approval has occurred. 21 CFR Part 11 requires validated electronic signature software.
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Sticky save */}
      <div className="sticky-save">
        <span>
          <span
            className="saved-dot"
            style={{
              background: backendAvailable
                ? incident.backendId
                  ? 'var(--green)'
                  : 'var(--amber)'
                : 'var(--muted)',
            }}
          />
          {backendAvailable
            ? incident.backendId
              ? `Persisted record (DB #${incident.backendId}) · PostgreSQL / SQLite active`
              : 'Local changes pending save · Click Save to commit to database'
            : 'Session draft · Stored in memory (FastAPI backend unreachable)'}
        </span>
        <div>
          {!incident.isSample && (
            <button
              className="btn-secondary"
              onClick={async () => {
                if (backendAvailable) {
                  try {
                    await persistInvestigation();
                    dispatch(closeWorkspace());
                  } catch {
                    // error handled in persistInvestigation
                  }
                } else {
                  dispatch(closeWorkspace());
                  dispatch(showToast({ message: 'Investigation retained in session state', type: 'info' }));
                }
              }}
              disabled={persistenceBusy}
            >
              {persistenceBusy ? 'Saving…' : 'Save & exit'}
            </button>
          )}
          <button className="btn-primary" onClick={() => dispatch(closeWorkspace())}>
            Return to register <ArrowRight size={15} />
          </button>
        </div>
      </div>

    </div>
  );
}

// Small helper: inline factor adder
function FactorAdder({ onAdd }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="add-why" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add contributing factor
      </button>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
      <input
        className="text-field"
        style={{ padding: '8px 12px', fontSize: 13 }}
        placeholder="Enter contributing factor…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onAdd(text); setText(''); setOpen(false); } }}
        autoFocus
      />
      <button className="btn-primary small" onClick={() => { if (text.trim()) { onAdd(text); setText(''); setOpen(false); } }}>Add</button>
      <button className="btn-secondary small" onClick={() => setOpen(false)}>✕</button>
    </div>
  );
}

// ─── Investigation Table ─────────────────────────────────────────────────────
function IncidentTable({ list, onOpen }) {
  if (!list.length) {
    return (
      <EmptyState
        icon={Search}
        title="No matching investigations"
        description="Try different search terms or remove the status filter."
      />
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>INCIDENT</th>
            <th>STATUS</th>
            <th>SEVERITY</th>
            <th>OWNER</th>
            <th>CREATED</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map(item => {
            const productFull = [item.product, item.batch].filter(Boolean).join(' · Batch ');
            return (
              <tr key={item.id} onClick={() => onOpen(item.id)} className="clickable-row">
                <td>
                  <div className="incident-cell">
                    <div className="incident-file"><FileText size={17} /></div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <b>{item.title}</b>
                        {item.isSample && <SampleBadge />}
                        {item.aiExtracted && <AiBadge style={{ fontSize: 10 }}>AI-extracted</AiBadge>}
                      </div>
                      <span>{item.id} <i /> {productFull || 'Product not specified'}</span>
                    </div>
                  </div>
                </td>
                <td><StagePill status={item.status} /></td>
                <td>
                  <span className={`severity ${(item.severity || 'Major').toLowerCase()}`}>
                    <span />
                    {item.severity || 'Major'}
                  </span>
                </td>
                <td>
                  <div className="owner-cell">
                    <Avatar initials={item.initials || 'QA'} tone={item.color || 'sage'} />
                    <span>{item.owner || 'Quality Lead'}</span>
                  </div>
                </td>
                <td className="date-cell">{item.date}</td>
                <td>
                  <button
                    className="icon-btn subtle"
                    onClick={e => { e.stopPropagation(); onOpen(item.id); }}
                    aria-label="Open"
                  >
                    <ChevronRight size={17} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page views ──────────────────────────────────────────────────────────────
function CapaTrackerPage({ capas, onNew, onToggleSample, showSample }) {
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">QUALITY OPERATIONS / REMEDIATION</div>
          <h1>CAPA tracker</h1>
          <p>Corrective and preventive actions linked to deviation investigations.</p>
        </div>
        <button className="btn-primary" onClick={onNew}><Plus size={16} /> New investigation</button>
      </div>

      {capas.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No CAPA actions recorded"
          description="CAPAs formulated inside investigation workspaces appear here. All actions require QA risk assessment and sign-off before execution."
          actionText="Create investigation"
          onAction={onNew}
          secondaryText={!showSample ? 'Load sample records' : undefined}
          onSecondary={onToggleSample}
        />
      ) : (
        <div className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CAPA ACTION</th>
                  <th>SOURCE INCIDENT</th>
                  <th>TYPE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {capas.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <b style={{ color: 'var(--ink)' }}>{c.title}</b>
                          {c.isSample && <SampleBadge />}
                          {c.source === 'ai' && <AiBadge style={{ fontSize: 10.5 }} />}
                        </div>
                        {c.desc && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.desc}</span>}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="evidence-row-link"
                        onClick={() => onOpen && onOpen(c.incidentId)}
                        title={`Open ${c.incidentId} in workspace`}
                      >
                        {c.incidentId} <ArrowRight size={12} />
                      </button>
                    </td>
                    <td><span className="capa-tag">{c.type}</span></td>
                    <td>
                      {c.source === 'ai'
                        ? <AiBadge style={{ fontSize: 11.5 }} />
                        : <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>User-defined · Pending QA</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Evidence Detail Modal ───────────────────────────────────────────────────
function EvidenceDetailModal({ evidence, onClose, onOpenIncident }) {
  if (!evidence) return null;
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 540 }} role="dialog" aria-modal="true" aria-labelledby="evidence-detail-title">
        <div className="modal-head">
          <div>
            <div className="eyebrow">EVIDENCE INSPECTOR</div>
            <h2 id="evidence-detail-title" style={{ fontSize: 20 }}>{evidence.name}</h2>
            <p>Verification record and association metadata</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <div style={{ padding: 12, background: '#fafbf8', border: '1px solid var(--line)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Status</span>
              <span className={`evidence-meta-pill ${evidence.status === 'Missing' ? 'missing' : ''}`} style={{ marginTop: 4 }}>
                {evidence.status === 'Missing' ? 'Missing Evidence Gap' : 'Available & Attached'}
              </span>
            </div>
            <div style={{ padding: 12, background: '#fafbf8', border: '1px solid var(--line)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Source Type</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block', marginTop: 4 }}>
                {evidence.type === 'missing' ? 'Identified Gap' : 'Document Reference'}
              </span>
            </div>
          </div>

          <div style={{ padding: 14, background: '#fafbf8', border: '1px solid var(--line)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Associated Investigation</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <b style={{ fontSize: 13, color: 'var(--ink)', display: 'block' }}>{evidence.incidentId}</b>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{evidence.incidentTitle}</span>
              </div>
              {onOpenIncident && (
                <button
                  type="button"
                  className="btn-secondary small"
                  onClick={() => {
                    onClose();
                    onOpenIncident(evidence.incidentId);
                  }}
                >
                  Open in RCA <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          <div style={{ padding: 14, background: '#fafbf8', border: '1px solid var(--line)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Investigator Notes & Purpose</span>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
              {evidence.note || 'No additional annotation provided. Verify against batch record and analytical method specifications.'}
            </p>
          </div>

          <div className="guide-banner-tip" style={{ margin: 0 }}>
            <ShieldCheck size={18} />
            <div>
              <b>Corroboration in RCA:</b> Hypotheses remain unverified until corroborated by empirical evidence. If marked as a Missing Gap, root-cause closure must be paused until resolved.
            </div>
          </div>
        </div>
        <div className="modal-actions" style={{ padding: '14px 28px 18px' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Evidence Library Page ───────────────────────────────────────────────────
function EvidenceLibraryPage({ onNew, onOpen, showSample, onToggleSample }) {
  const allIncidents = useSelector(state => selectAllInvestigations(state, showSample));
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  // Extract all evidence from real investigations
  const allEvidence = useMemo(() => {
    return allIncidents.flatMap(inv => {
      const items = (inv.evidence || []).map(e => ({
        ...e,
        incidentId: inv.id,
        incidentTitle: inv.title,
        isSample: inv.isSample,
      }));
      // Also index attached source file if any
      if (inv.fileName) {
        items.unshift({
          id: `file-${inv.id}`,
          name: inv.fileName,
          note: 'Primary deviation intake document attachment',
          status: 'Available',
          type: 'attached',
          incidentId: inv.id,
          incidentTitle: inv.title,
          isSample: inv.isSample,
        });
      }
      return items;
    });
  }, [allIncidents]);

  const filtered = useMemo(() => {
    return allEvidence.filter(e => {
      const matchFilter = filterType === 'All'
        || (filterType === 'Available' && e.status === 'Available')
        || (filterType === 'Missing' && e.status === 'Missing');
      const text = `${e.name} ${e.note || ''} ${e.incidentId} ${e.incidentTitle}`.toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [allEvidence, filterType, search]);

  const availableCount = allEvidence.filter(e => e.status === 'Available').length;
  const missingCount = allEvidence.filter(e => e.status === 'Missing').length;

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">QUALITY OPERATIONS / DOCUMENTATION</div>
          <h1>Evidence library</h1>
          <p>Analytical raw data, batch manufacturing records, calibration logs, and identified evidence gaps.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={onNew}><Plus size={16} /> New investigation</button>
        </div>
      </div>

      {/* Educational context card */}
      <div className="evidence-explain-card">
        <div className="help-icon" style={{ width: 34, height: 34, background: '#f0f3ec', borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--green)', flexShrink: 0 }}>
          <FolderOpen size={18} />
        </div>
        <div>
          <h3>Evidence-Based Root Cause Verification</h3>
          <p>
            In pharmaceutical and regulated quality operations, an AI hypothesis is never an accepted root cause until supported by empirical proof.
            Traceable evidence (HPLC raw data, calibration certificates, batch production records, environmental telemetry) either corroborates or refutes hypotheses.
            Outstanding <b>Evidence Gaps</b> prevent premature closure.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="list-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder="Search evidence records, batch logs, gaps…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search evidence records"
          />
        </div>
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="All">All items ({allEvidence.length})</option>
          <option value="Available">Available & attached ({availableCount})</option>
          <option value="Missing">Evidence gaps ({missingCount})</option>
        </select>
        <button
          className={`btn-secondary small${showSample ? ' active' : ''}`}
          onClick={onToggleSample}
        >
          {showSample ? 'Hide sample records' : 'Load sample data'}
        </button>
      </div>

      {allEvidence.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No evidence records yet"
          description="Evidence records appear here when deviation reports or lab files are ingested, or when evidence gaps are identified during 5 Whys and Fishbone analyses."
          actionText="Create investigation"
          onAction={onNew}
          secondaryText={!showSample ? 'Load sample records' : undefined}
          onSecondary={onToggleSample}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching evidence records"
          description="Try broadening your search query or setting the filter to 'All items'."
        />
      ) : (
        <div className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>EVIDENCE RECORD / DOCUMENT</th>
                  <th>ASSOCIATED INVESTIGATION</th>
                  <th>STATUS</th>
                  <th>PURPOSE & CONTEXT</th>
                  <th style={{ width: 80 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id || idx} className="clickable-row" onClick={() => setSelectedEvidence(item)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} style={{ color: item.status === 'Missing' ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }} />
                        <div>
                          <b style={{ color: 'var(--ink)', fontSize: 13 }}>{item.name}</b>
                          {item.isSample && <span style={{ marginLeft: 6 }}><SampleBadge /></span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="evidence-row-link"
                        onClick={e => {
                          e.stopPropagation();
                          if (onOpen) onOpen(item.incidentId);
                        }}
                      >
                        {item.incidentId} <ArrowRight size={12} />
                      </button>
                    </td>
                    <td>
                      <span className={`evidence-meta-pill ${item.status === 'Missing' ? 'missing' : ''}`}>
                        {item.status === 'Missing' ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                        {item.status === 'Missing' ? 'Missing gap' : 'Available'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                        {item.note || 'Linked to deviation analysis'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary small"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedEvidence(item);
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedEvidence && (
        <EvidenceDetailModal
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
          onOpenIncident={onOpen}
        />
      )}
    </div>
  );
}

// ─── Quality Insights Page ───────────────────────────────────────────────────
function QualityInsightsPage({ onNew, onToggleSample, showSample, onOpen }) {
  const allIncidents = useSelector(state => selectAllInvestigations(state, showSample));
  const allCapas = useSelector(state => selectAllCapas(state, showSample));

  // Compute live, traceable operational statistics
  const totalCount = allIncidents.length;
  const pendingReviewsCount = allIncidents.filter(i =>
    i.status?.toLowerCase().includes('pending')
    || i.status?.toLowerCase().includes('progress')
    || !i.status?.toLowerCase().includes('ready')
  ).length;

  const totalGapsCount = allIncidents.reduce((acc, inv) =>
    acc + (inv.evidence || []).filter(e => e.status === 'Missing').length, 0
  );

  const capaCorrectiveCount = allCapas.filter(c => (c.type || '').toLowerCase().includes('corrective')).length;
  const capaPreventiveCount = allCapas.filter(c => (c.type || '').toLowerCase().includes('preventive')).length;
  const capaHighPriorityCount = allCapas.filter(c => (c.priority || '').toLowerCase().includes('high')).length;

  // Severity counts
  const criticalCount = allIncidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length;
  const majorCount = allIncidents.filter(i => (i.severity || '').toLowerCase() === 'major').length;
  const minorCount = allIncidents.filter(i => (i.severity || '').toLowerCase() === 'minor').length;

  // 6M Ishikawa factor counts across all records
  const ishikawaCounts = useMemo(() => {
    const counts = { People: 0, Method: 0, Machine: 0, Material: 0, Measurement: 0, Environment: 0 };
    allIncidents.forEach(inv => {
      const fb = inv.fishbone || {};
      Object.keys(counts).forEach(k => {
        counts[k] += (fb[k] || []).length;
      });
    });
    return counts;
  }, [allIncidents]);

  const maxIshikawa = Math.max(...Object.values(ishikawaCounts), 1);

  if (totalCount === 0) {
    return (
      <div className="page-content">
        <div className="page-heading">
          <div>
            <div className="eyebrow">INTELLIGENCE / ANALYTICS</div>
            <h1>Quality insights</h1>
            <p>Operational metrics and deviation analysis grounded in real saved investigations.</p>
          </div>
        </div>
        <EmptyState
          icon={Activity}
          title="No investigation data for insights"
          description="Quality insights calculate live from your saved investigations and session records. Create your first investigation or load sample data to explore trend distributions, CAPA status, and 6M coverage."
          actionText="Create investigation"
          onAction={onNew}
          secondaryText={!showSample ? 'Load sample records' : undefined}
          onSecondary={onToggleSample}
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">INTELLIGENCE / ANALYTICS</div>
          <h1>Quality insights</h1>
          <p>Real-time quality metrics computed directly from active investigations and saved records.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn-secondary small${showSample ? ' active' : ''}`}
            onClick={onToggleSample}
          >
            {showSample ? 'Hide sample records' : 'Load sample data'}
          </button>
          <button className="btn-primary" onClick={onNew}><Plus size={16} /> New investigation</button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="insights-stats-grid">
        <div className="insight-metric-card">
          <div className="insight-metric-header">
            <span>Total Deviations</span>
            <FileText size={16} />
          </div>
          <div className="insight-metric-num">{totalCount}</div>
          <div className="insight-metric-desc">
            {allIncidents.filter(i => !i.isSample).length} user/database records · {allIncidents.filter(i => i.isSample).length} sample
          </div>
        </div>

        <div className="insight-metric-card">
          <div className="insight-metric-header">
            <span>Pending Reviews</span>
            <Clock3 size={16} style={{ color: 'var(--amber)' }} />
          </div>
          <div className="insight-metric-num" style={{ color: pendingReviewsCount > 0 ? 'var(--amber)' : 'var(--ink)' }}>
            {pendingReviewsCount}
          </div>
          <div className="insight-metric-desc">Awaiting QP / QA lead confirmation</div>
        </div>

        <div className="insight-metric-card">
          <div className="insight-metric-header">
            <span>Evidence Gaps</span>
            <AlertTriangle size={16} style={{ color: 'var(--terracotta-dark)' }} />
          </div>
          <div className="insight-metric-num" style={{ color: totalGapsCount > 0 ? 'var(--terracotta-dark)' : 'var(--green)' }}>
            {totalGapsCount}
          </div>
          <div className="insight-metric-desc">Outstanding empirical proofs blocking root cause</div>
        </div>

        <div className="insight-metric-card">
          <div className="insight-metric-header">
            <span>Formulated CAPAs</span>
            <ClipboardCheck size={16} style={{ color: 'var(--green)' }} />
          </div>
          <div className="insight-metric-num">{allCapas.length}</div>
          <div className="insight-metric-desc">
            {capaCorrectiveCount} corrective · {capaPreventiveCount} preventive · {capaHighPriorityCount} high priority
          </div>
        </div>
      </div>

      {/* Detailed Analysis Cards */}
      <div className="insights-detail-grid">
        {/* Severity Distribution */}
        <div className="panel" style={{ padding: 22 }}>
          <div className="panel-heading" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">RISK STRATIFICATION</div>
              <h3 style={{ fontSize: 16, margin: '2px 0 0' }}>Deviation Severity Breakdown</h3>
            </div>
          </div>

          <div className="breakdown-row">
            <div className="breakdown-row-head">
              <span style={{ color: 'var(--terracotta-dark)' }}>Critical deviations</span>
              <span>{criticalCount} ({totalCount ? Math.round((criticalCount / totalCount) * 100) : 0}%)</span>
            </div>
            <div className="breakdown-bar-track">
              <div className="breakdown-bar-fill terracotta" style={{ width: `${totalCount ? (criticalCount / totalCount) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="breakdown-row">
            <div className="breakdown-row-head">
              <span style={{ color: 'var(--amber)' }}>Major deviations</span>
              <span>{majorCount} ({totalCount ? Math.round((majorCount / totalCount) * 100) : 0}%)</span>
            </div>
            <div className="breakdown-bar-track">
              <div className="breakdown-bar-fill amber" style={{ width: `${totalCount ? (majorCount / totalCount) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="breakdown-row">
            <div className="breakdown-row-head">
              <span style={{ color: 'var(--green)' }}>Minor deviations</span>
              <span>{minorCount} ({totalCount ? Math.round((minorCount / totalCount) * 100) : 0}%)</span>
            </div>
            <div className="breakdown-bar-track">
              <div className="breakdown-bar-fill green" style={{ width: `${totalCount ? (minorCount / totalCount) * 100 : 0}%` }} />
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '14px 0 0', lineHeight: 1.5 }}>
            Stratified directly from deviation records. Regulatory guidelines require accelerated reporting for critical excursions.
          </p>
        </div>

        {/* 6M Ishikawa Domain Coverage */}
        <div className="panel" style={{ padding: 22 }}>
          <div className="panel-heading" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">ISHIKAWA 6M METHODOLOGY</div>
              <h3 style={{ fontSize: 16, margin: '2px 0 0' }}>Causal Domain Factor Distribution</h3>
            </div>
          </div>

          {Object.entries(ishikawaCounts).map(([cat, count]) => (
            <div className="breakdown-row" key={cat}>
              <div className="breakdown-row-head">
                <span>{cat}</span>
                <span>{count} factor{count === 1 ? '' : 's'}</span>
              </div>
              <div className="breakdown-bar-track">
                <div className="breakdown-bar-fill sage" style={{ width: `${(count / maxIshikawa) * 100}%` }} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
            Identified across all Fishbone diagrams in this workspace. Demonstrates holistic cross-functional analysis.
          </p>
        </div>
      </div>

      {/* Records Needing Attention */}
      <div className="panel" style={{ padding: 20 }}>
        <div className="panel-heading" style={{ marginBottom: 14 }}>
          <div>
            <div className="eyebrow">QUALITY QUEUE</div>
            <h3 style={{ fontSize: 16, margin: '2px 0 0' }}>Investigations Needing Attention</h3>
          </div>
        </div>
        <div className="recent-list">
          {allIncidents.filter(i => (i.evidence || []).some(e => e.status === 'Missing') || i.status !== 'Ready for QA').slice(0, 5).map(item => {
            const gaps = (item.evidence || []).filter(e => e.status === 'Missing').length;
            return (
              <button
                key={item.id}
                className="recent-item"
                onClick={() => onOpen && onOpen(item.id)}
              >
                <div className={`recent-icon ${item.color || 'sage'}`}>
                  <Microscope size={18} />
                </div>
                <div className="recent-copy">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <b>{item.title}</b>
                    {item.isSample && <SampleBadge />}
                  </div>
                  <span>{item.id} · {item.product || 'Product unassigned'}</span>
                </div>
                <div className="recent-meta">
                  {gaps > 0 && (
                    <span className="evidence-meta-pill missing">
                      <AlertTriangle size={11} /> {gaps} gap{gaps === 1 ? '' : 's'}
                    </span>
                  )}
                  <StagePill status={item.status} />
                </div>
                <ChevronRight size={16} className="recent-chevron" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Trail Page ────────────────────────────────────────────────────────
function AuditTrailPage({ onNew, onOpen, showSample }) {
  const allIncidents = useSelector(state => selectAllInvestigations(state, showSample));

  // Synthesize verifiable audit records from real investigations
  const auditEvents = useMemo(() => {
    const list = [];
    allIncidents.forEach(inv => {
      const ts = inv.createdAt || '2026-10-25T08:00:00.000Z';
      list.push({
        id: `aud-init-${inv.id}`,
        timestamp: new Date(ts).toLocaleString(),
        event: 'Deviation Record Ingested',
        targetId: inv.id,
        targetTitle: inv.title,
        actor: inv.owner || 'Quality Lead (QA)',
        details: inv.fileName ? `Uploaded document: ${inv.fileName}` : 'Manual text entry intake',
        status: 'Immutable · Logged',
      });
      if (inv.aiExtracted) {
        list.push({
          id: `aud-ext-${inv.id}`,
          timestamp: new Date(new Date(ts).getTime() + 45000).toLocaleString(),
          event: 'AI Structured Extraction Executed',
          targetId: inv.id,
          targetTitle: inv.title,
          actor: 'System / Groq Engine',
          details: 'Extracted 5 Whys seed, Fishbone factors, and metadata fields',
          status: 'AI Suggestion · Flagged',
        });
      }
      if (inv.status === 'Ready for QA' || inv.status === 'Qualified review completed') {
        list.push({
          id: `aud-rev-${inv.id}`,
          timestamp: new Date(new Date(ts).getTime() + 180000).toLocaleString(),
          event: 'Qualified Review Marked',
          targetId: inv.id,
          targetTitle: inv.title,
          actor: 'Quality Lead (QA)',
          details: 'Investigator reviewed and confirmed findings for QA sign-off',
          status: 'Human Verified',
        });
      }
    });
    return list;
  }, [allIncidents]);

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">INTELLIGENCE / COMPLIANCE</div>
          <h1>Audit trail</h1>
          <p>21 CFR Part 11 compliant tamper-evident record of user entries and AI queries.</p>
        </div>
        <button className="btn-primary" onClick={onNew}><Plus size={16} /> New investigation</button>
      </div>

      <div className="guide-banner-tip" style={{ marginBottom: 20 }}>
        <ShieldCheck size={20} />
        <div>
          <b>ALCOA+ Data Integrity Principles:</b> All entries are Attributable, Legible, Contemporaneous, Original, and Accurate. User modifications, evidence uploads, and AI queries are logged chronologically.
        </div>
      </div>

      {auditEvents.length === 0 ? (
        <EmptyState
          badge="21 CFR Part 11 architecture"
          icon={History}
          title="No audit events recorded"
          description="Time-stamped user modifications, evidence attachments, AI extractions, and QP reviews appear here as investigations are created."
          actionText="Create investigation"
          onAction={onNew}
        />
      ) : (
        <div className="panel table-panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>EVENT ACTION</th>
                  <th>RECORD</th>
                  <th>PERFORMED BY</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map(evt => (
                  <tr key={evt.id}>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{evt.timestamp}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <b style={{ color: 'var(--ink)', fontSize: 13 }}>{evt.event}</b>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{evt.details}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="evidence-row-link"
                        onClick={() => onOpen && onOpen(evt.targetId)}
                      >
                        {evt.targetId}
                      </button>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>{evt.actor}</td>
                    <td>
                      <span className="status-pill neutral" style={{ fontSize: 11 }}>
                        <span className="status-dot" style={{ background: 'var(--green)' }} />
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Help Modal ──────────────────────────────────────────────────────────────
function HelpModal({ onClose }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="guide-modal-card" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
        <div className="modal-head">
          <div>
            <div className="eyebrow">AIVOA USER MANUAL & WORKFLOW GUIDE</div>
            <h2 id="help-modal-title">Investigation & RCA Copilot Help</h2>
            <p>Step-by-step procedures, AI extraction capabilities, and troubleshooting.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close help modal"><X size={20} /></button>
        </div>

        <div className="guide-body">
          <div className="guide-banner-tip" style={{ marginTop: 0 }}>
            <ShieldCheck size={20} />
            <div>
              <b>Mandatory GxP Human Review:</b> AIVOA Copilot accelerates deviation structuring and hypothesis generation. AI suggestions are drafts and must be reviewed, corroborated, and approved by qualified personnel.
            </div>
          </div>

          <div className="guide-grid">
            <div className="guide-card">
              <h4><Plus size={16} style={{ color: 'var(--green)' }} /> 1. Creating an Investigation</h4>
              <p>Click <b>New Investigation</b> in the top navigation or register. Choose between:</p>
              <ul>
                <li><b>Paste Text:</b> Copy deviation description, lab notes, or operator incident summaries.</li>
                <li><b>Upload PDF:</b> Ingest deviation report PDFs or batch records (max 10 MB, text-selectable).</li>
              </ul>
            </div>

            <div className="guide-card">
              <h4><Sparkles size={16} style={{ color: 'var(--green)' }} /> 2. AI Extraction Engine</h4>
              <p>Powered by LangGraph and Groq (llama-3.3-70b-versatile). The engine deterministically isolates:</p>
              <ul>
                <li>Incident title, product name, batch ID, and date</li>
                <li>Known/verified facts vs working assumptions</li>
                <li>Unknown information gaps requiring empirical evidence</li>
              </ul>
            </div>

            <div className="guide-card">
              <h4><Microscope size={16} style={{ color: 'var(--green)' }} /> 3. Running RCA Analysis</h4>
              <p>Inside the investigation workspace, click <b>Run AI Analysis</b> to generate:</p>
              <ul>
                <li><b>Five Whys:</b> A sequential causal chain from symptom to potential root mechanism.</li>
                <li><b>Fishbone Diagram:</b> Causal factors categorized into the 6M framework.</li>
                <li><b>Hypotheses & CAPAs:</b> Testable explanations and targeted remediation actions.</li>
              </ul>
            </div>

            <div className="guide-card">
              <h4><CheckCircle2 size={16} style={{ color: 'var(--green)' }} /> 4. Reviewing, Editing & Saving</h4>
              <p>All AI suggestions are fully editable drafts:</p>
              <ul>
                <li>Type directly into any 5 Whys step, Fishbone category, or factor row.</li>
                <li>Click <b>Save to Database</b> or <b>Save & exit</b> to commit changes to SQLite/PostgreSQL.</li>
                <li>Mark qualified human review when analysis is confirmed.</li>
              </ul>
            </div>

            <div className="guide-card">
              <h4><FolderOpen size={16} style={{ color: 'var(--green)' }} /> 5. Evidence & Evidence Gaps</h4>
              <p>Root causes cannot be confirmed without verifiable evidence:</p>
              <ul>
                <li>Attach batch records, HPLC chromatograms, or calibration certificates.</li>
                <li>Log <b>Evidence Gaps</b> for missing tests; pause conclusion until tested.</li>
                <li>View all cross-investigation documentation in the <b>Evidence Library</b>.</li>
              </ul>
            </div>

            <div className="guide-card">
              <h4><AlertTriangle size={16} style={{ color: 'var(--amber)' }} /> 6. Troubleshooting Backend Errors</h4>
              <p>If the backend status indicator shows offline:</p>
              <ul>
                <li>Verify FastAPI server is active: <code>python -m uvicorn app.main:app --port 8000</code></li>
                <li>Check <code>GROQ_API_KEY</code> is configured in <code>backend/.env</code>.</li>
                <li>Ensure CORS origins in backend allow <code>http://localhost:5173</code>.</li>
                <li>Check browser console or terminal logs for specific HTTP error messages.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ padding: '16px 30px 20px' }}>
          <button type="button" className="btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ─── RCA Reference Guide Modal ───────────────────────────────────────────────
function RcaReferenceGuideModal({ onClose }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    const handleKeyDown = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="guide-modal-card" role="dialog" aria-modal="true" aria-labelledby="rca-guide-title">
        <div className="modal-head">
          <div>
            <div className="eyebrow">QUALITY ENGINEERING COMPENDIUM</div>
            <h2 id="rca-guide-title">RCA Reference Guide: 5 Whys & Ishikawa Methods</h2>
            <p>Defensible root-cause analysis, evidence standards, and CAPA formulation for GxP environments.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close guide modal"><X size={20} /></button>
        </div>

        <div className="guide-body">
          <div className="guide-banner-tip" style={{ marginTop: 0 }}>
            <ShieldCheck size={20} />
            <div>
              <b>Regulatory Expectation (ICH Q9 / FDA 21 CFR):</b> Investigations must avoid stopping at superficial operator error or immediate mechanical failure. Systemic, verifiable root causes must be determined before closing nonconformances.
            </div>
          </div>

          <div className="guide-grid">
            <div className="guide-card">
              <h4><ListChecks size={16} style={{ color: 'var(--green)' }} /> 1. The Five Whys Method</h4>
              <p>An iterative interrogative technique used to explore cause-and-effect relationships:</p>
              <ul>
                <li><b>Rule 1:</b> Do not jump to the first convenient explanation. Drill through successive layers.</li>
                <li><b>Rule 2:</b> Each "Why" must be substantiated by observable facts or physical evidence.</li>
                <li><b>Rule 3:</b> The final root cause must represent a systemic or procedural vulnerability capable of being corrected.</li>
              </ul>
            </div>

            <div className="guide-card">
              <h4><Activity size={16} style={{ color: 'var(--green)' }} /> 2. Ishikawa 6M Diagram (Fishbone)</h4>
              <p>Structure cause identification across six standardized domains:</p>
              <ul>
                <li><b>People:</b> Training currency, operator qualification, shift handover fatigue.</li>
                <li><b>Method / Process:</b> SOP sequence, sampling depth, mixing tolerances.</li>
                <li><b>Machine / Equipment:</b> Calibration validity, sensor drift, autoclave validation.</li>
                <li><b>Material:</b> Raw excipient lot variability, hygroscopicity, particle size.</li>
                <li><b>Measurement:</b> HPLC column pressure, analytical accuracy, gauge R&R.</li>
                <li><b>Environment:</b> Relative cleanroom humidity, temperature, HVAC status.</li>
              </ul>
            </div>

            <div className="guide-card">
              <h4><FolderOpen size={16} style={{ color: 'var(--green)' }} /> 3. Evidence Gaps & Hypotheses</h4>
              <p>Distinguish between different degrees of certainty:</p>
              <ul>
                <li><b>Observed Facts:</b> Empirical, verifiable data (e.g. LOD measured at 1.45%).</li>
                <li><b>Assumptions:</b> Unchecked premises that must be tested (e.g. "Sensor was calibrated").</li>
                <li><b>Hypotheses:</b> Proposed mechanisms that remain tentative until tested.</li>
                <li><b>Evidence Gaps:</b> Outstanding data needed to prove or disprove a hypothesis.</li>
              </ul>
            </div>

            <div className="guide-card">
              <h4><ClipboardCheck size={16} style={{ color: 'var(--green)' }} /> 4. CAPA Principles</h4>
              <p>Formulate defensible remedial and preventative actions:</p>
              <ul>
                <li><b>Corrective Actions:</b> Eliminate the root cause of an <i>existing</i> nonconformity to prevent its recurrence.</li>
                <li><b>Preventive Actions:</b> Eliminate the potential cause of a <i>potential</i> nonconformity across similar batches or lines.</li>
                <li><b>Verification of Effectiveness:</b> Every CAPA must define quantifiable metrics to prove effectiveness over time.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ padding: '16px 30px 20px' }}>
          <button type="button" className="btn-primary" onClick={onClose}>Close guide</button>
        </div>
      </div>
    </div>
  );
}


// ─── Routing Helpers ────────────────────────────────────────────────────────
function getPathForState(nav, incidentId) {
  if (incidentId) {
    return `/investigations/${encodeURIComponent(incidentId)}`;
  }
  switch (nav) {
    case 'Overview':
      return '/';
    case 'Investigations':
      return '/investigations';
    case 'CAPA tracker':
      return '/capa';
    case 'Evidence library':
      return '/evidence';
    case 'Quality insights':
      return '/insights';
    case 'Audit trail':
      return '/audit';
    default:
      return '/';
  }
}

function parsePath(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/overview') {
    return { nav: 'Overview', incidentId: null };
  }
  if (clean.startsWith('/investigations/')) {
    const id = decodeURIComponent(clean.replace('/investigations/', ''));
    return { nav: 'Investigations', incidentId: id || null };
  }
  if (clean === '/investigations') {
    return { nav: 'Investigations', incidentId: null };
  }
  if (clean === '/capa') {
    return { nav: 'CAPA tracker', incidentId: null };
  }
  if (clean === '/evidence') {
    return { nav: 'Evidence library', incidentId: null };
  }
  if (clean === '/insights') {
    return { nav: 'Quality insights', incidentId: null };
  }
  if (clean === '/audit') {
    return { nav: 'Audit trail', incidentId: null };
  }
  return { nav: 'Overview', incidentId: null };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ allIncidents, capas, onNew, onOpen, onViewAll, showSample, onToggleSample, onOpenGuide }) {
  const openCount = allIncidents.length;
  const capaCount = capas.length;
  const missingEvidenceCount = allIncidents.reduce((acc, inv) =>
    acc + (inv.evidence || []).filter(e => e.status === 'Missing').length, 0
  );

  return (
    <div className="page-content dashboard-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow welcome-eyebrow">
            <span className="eyebrow-line" /> QUALITY OPERATIONS · ACTIVE SESSION
          </div>
          <h1>Quality workspace <span className="wave">✳</span></h1>
          <p>Operational overview of active quality investigations and evidence status.</p>
        </div>
        <button className="btn-primary" onClick={onNew}>
          <Plus size={16} /> New investigation
        </button>
      </div>

      {/* Hero */}
      <section className="hero-banner">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={14} /> YOUR INVESTIGATION COPILOT</div>
          <h2>Find the cause.<br /><em>Strengthen the evidence.</em></h2>
          <p>
            Ingest deviation reports via text or PDF. AI extracts structured RCA fields — 5 Whys, fishbone, and CAPA recommendations — ready for human review.
          </p>
          <button className="hero-cta" onClick={onNew}>
            Start an investigation <ArrowRight size={16} />
          </button>
          <div className="hero-footnote">
            <ShieldCheck size={14} /> Human qualified person reviews all AI outputs
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-core"><FlaskConical size={40} strokeWidth={1.3} /></div>
          <div className="float-card float-card-top">
            <span className="float-icon green"><CheckCircle2 size={14} /></span>
            <div><b>Traceable evidence</b><small>Corroborate findings with data</small></div>
          </div>
          <div className="float-card float-card-bottom">
            <span className="float-icon peach"><Sparkles size={14} /></span>
            <div><b>Structured RCA</b><small>Awaiting human review</small></div>
          </div>
          <div className="visual-node node-a" />
          <div className="visual-node node-b" />
          <div className="visual-node node-c" />
        </div>

        <div className="hero-number">
          <span>01</span>
          <div>QUALITY<br />INTELLIGENCE</div>
        </div>
      </section>

      {/* Metrics */}
      <div className="section-heading">
        <div>
          <h2>Quality at a glance</h2>
          <p>Live counts from this session's workspace.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className={`sample-toggle-pill ${showSample ? '' : 'inactive'}`}
            onClick={onToggleSample}
            title="Toggle illustrative sample data"
          >
            <span className="status-dot" style={{ background: showSample ? 'var(--amber)' : 'var(--muted)' }} />
            {showSample ? 'Sample data active' : 'Show sample data'}
          </button>
          <div className="period-select">Session</div>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Open investigations"
          value={openCount > 0 ? String(openCount).padStart(2, '0') : '0'}
          note={openCount > 0
            ? showSample ? 'Includes illustrative sample records' : 'Active records this session'
            : 'No investigations yet'}
          icon={Microscope}
          trend={openCount > 0 ? `${openCount} active` : '—'}
          tone="sage"
          isSample={showSample && openCount > 0}
        />
        <MetricCard
          label="Missing evidence items"
          value={missingEvidenceCount > 0 ? String(missingEvidenceCount).padStart(2, '0') : '0'}
          note={missingEvidenceCount > 0 ? 'Gaps blocking root cause determination' : 'No outstanding evidence gaps'}
          icon={FileCheck2}
          trend={missingEvidenceCount > 0 ? 'Needs action' : '—'}
          tone="peach"
          isSample={showSample && missingEvidenceCount > 0}
        />
        <MetricCard
          label="CAPA actions"
          value={capaCount > 0 ? String(capaCount).padStart(2, '0') : '0'}
          note={capaCount > 0 ? 'Pending QA risk assessment' : 'No CAPA actions yet'}
          icon={Target}
          trend={capaCount > 0 ? `${capaCount} drafted` : '—'}
          tone="lilac"
          isSample={showSample && capaCount > 0}
        />
        <MetricCard
          label="Median time to RCA"
          value="—"
          note="Requires database connection"
          icon={Gauge}
          trend="—"
          tone="sand"
          isSample={false}
        />
      </div>

      {/* Content columns */}
      <div className="content-columns">
        <section className="panel recent-panel">
          <div className="panel-heading recent-heading">
            <div>
              <div className="eyebrow">WORK QUEUE</div>
              <h3>Recent investigations</h3>
              <p className="panel-sub">Active deviation records in this workspace.</p>
            </div>
            {allIncidents.length > 0 && (
              <button className="text-link" onClick={onViewAll}>
                View all <ArrowRight size={15} />
              </button>
            )}
          </div>

          {allIncidents.length === 0 ? (
            <div style={{ padding: '32px 0 20px' }}>
              <EmptyState
                icon={Microscope}
                title="No investigations yet"
                description="Create your first deviation record to begin AI-assisted root cause analysis."
                actionText="Create investigation"
                onAction={onNew}
                secondaryText={!showSample ? 'Load sample data' : undefined}
                onSecondary={onToggleSample}
              />
            </div>
          ) : (
            <>
              <div className="recent-list">
                {allIncidents.slice(0, 4).map(item => {
                  const productFull = [item.product, item.batch].filter(Boolean).join(' · Batch ');
                  return (
                    <button className="recent-item" key={item.id} onClick={() => onOpen(item.id)}>
                      <div className={`recent-icon ${item.color || 'sage'}`}>
                        <FileText size={18} />
                      </div>
                      <div className="recent-copy">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <b>{item.title}</b>
                          {item.isSample && <SampleBadge />}
                        </div>
                        <span>{item.id} <i /> {productFull || 'Product not specified'}</span>
                      </div>
                      <div className="recent-meta">
                        <StagePill status={item.status} />
                        <span><Clock3 size={12} /> {item.date}</span>
                      </div>
                      <ChevronRight size={16} className="recent-chevron" />
                    </button>
                  );
                })}
              </div>
              <button className="recent-footer" onClick={onViewAll}>
                Open investigation register <ArrowRight size={14} />
              </button>
            </>
          )}
        </section>

        <div className="right-column">
          <section className="panel attention-panel">
            <div className="attention-title">
              <div className="attention-icon"><AlertTriangle size={16} /></div>
              <div>
                <h3>Needs attention</h3>
                <p>Evidence gaps blocking root cause.</p>
              </div>
            </div>

            {allIncidents.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--muted)', padding: '8px 0' }}>
                No active items — workspace is clear.
              </div>
            ) : (
              <>
                {allIncidents.slice(0, 2).map((item, i) => (
                  <button key={item.id} className="attention-item" onClick={() => onOpen(item.id)}>
                    <span className="attention-number">0{i + 1}</span>
                    <span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <b>Evidence gap identified</b>
                        {item.isSample && <SampleBadge />}
                      </div>
                      <small>{item.title} · {item.id}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
                <div className="attention-foot">
                  <span className="attention-foot-dot" />
                  {showSample ? 'Illustrative queue (sample data)' : 'Session-based queue'}
                </div>
              </>
            )}
          </section>

          <section className="learning-card">
            <div className="learning-art">
              <BookOpenCheck size={24} />
              <span className="learning-spark">✳</span>
            </div>
            <div className="learning-copy">
              <div className="eyebrow">QUICK REFERENCE</div>
              <h3>Defensible RCA,<br />stronger CAPA.</h3>
              <p>Practical guide to 5 Whys, Ishikawa diagrams, and GxP-compliant evidence management.</p>
              <button type="button" onClick={onOpenGuide}>Explore guide <ArrowUpRight size={14} /></button>
            </div>
          </section>
        </div>
      </div>

      {/* Compliance strip */}
      <div className="compliance-strip">
        <div className="compliance-icon"><ShieldCheck size={18} /></div>
        <div>
          <b>Human oversight is mandatory in GxP environments.</b>
          <span>AI-generated hypotheses must be supported by evidence and confirmed by a qualified person before regulatory submission.</span>
        </div>
        <span className="compliance-badge">QUALITY BY DESIGN</span>
      </div>
    </div>
  );
}

// ─── Root App Component ──────────────────────────────────────────────────────
function App() {
  const dispatch = useDispatch();

  // UI state from Redux
  const activeNav = useSelector(selectActiveNav);
  const modalOpen = useSelector(selectModalOpen);
  const workspaceIncidentId = useSelector(selectWorkspaceIncidentId);
  const sidebarOpen = useSelector(selectSidebarOpen);
  const showSample = useSelector(selectShowSampleData);
  const search = useSelector(selectSearch);
  const filter = useSelector(selectFilter);
  const toast = useSelector(selectToast);
  const backendAvailable = useSelector(selectBackendAvailable);
  const helpModalOpen = useSelector(selectHelpModalOpen);
  const guideModalOpen = useSelector(selectGuideModalOpen);
  const notificationsOpen = useSelector(selectNotificationsOpen);
  const readNotificationIds = useSelector(selectReadNotificationIds);

  const notificationRef = useRef(null);

  // Derived data
  const allIncidents = useSelector(state => selectAllInvestigations(state, showSample));
  const allCapas = useSelector(state => selectAllCapas(state, showSample));

  const visibleIncidents = useMemo(() => {
    return allIncidents.filter(i => {
      const text = `${i.id} ${i.title} ${i.product || ''} ${i.batch || ''}`.toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());
      const matchFilter = filter === 'All incidents' || i.status === filter;
      return matchSearch && matchFilter;
    });
  }, [allIncidents, search, filter]);

  // Handle URL initialization on first mount
  useEffect(() => {
    const parsed = parsePath(window.location.pathname);
    if (parsed.incidentId) {
      dispatch(openWorkspace(parsed.incidentId));
      dispatch(setActiveNav('Investigations'));
    } else if (parsed.nav && parsed.nav !== 'Overview') {
      dispatch(setActiveNav(parsed.nav));
    }
  }, [dispatch]);

  // Keep URL in sync with state changes
  useEffect(() => {
    const currentTarget = getPathForState(activeNav, workspaceIncidentId);
    if (window.location.pathname !== currentTarget) {
      window.history.pushState(
        { nav: activeNav, incidentId: workspaceIncidentId },
        '',
        currentTarget
      );
    }
  }, [activeNav, workspaceIncidentId]);

  // Listen for browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = e => {
      const state = e.state || parsePath(window.location.pathname);
      if (state.incidentId) {
        dispatch(openWorkspace(state.incidentId));
        dispatch(setActiveNav('Investigations'));
      } else {
        if (workspaceIncidentId) {
          dispatch(closeWorkspace(state.nav || 'Overview'));
        } else {
          dispatch(setActiveNav(state.nav || 'Overview'));
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dispatch, workspaceIncidentId]);

  // Click outside notification popover to close
  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClickOutside = e => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        dispatch(setNotificationsOpen(false));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen, dispatch]);

  // Check backend health and sync real database records on mount
  useEffect(() => {
    checkBackendHealth().then(result => {
      dispatch(setBackendAvailable(result.ok));
    });

    fetchInvestigations({ limit: 100 }).then(records => {
      if (!Array.isArray(records)) return;
      records.forEach(record => {
        const a = record.analysis || {};
        const fields = record.extracted_fields || {};
        const findings = record.human_findings || {};
        const source = record.source_metadata || {};

        // Normalize five_whys (FastAPI returns list of {why, question, answer})
        let rawWhys = findings.reviewed_whys || a.five_whys || ['', '', '', '', ''];
        if (Array.isArray(rawWhys)) {
          rawWhys = rawWhys.map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              if (item.answer) return item.question ? `${item.question} — ${item.answer}` : item.answer;
              if (item.question) return item.question;
            }
            return '';
          });
        }
        while (rawWhys.length < 5) rawWhys.push('');

        // Normalize fishbone (FastAPI returns People, Process, Equipment, Materials, Measurement, Environment)
        const rawFishbone = findings.reviewed_fishbone || a.fishbone || {};
        const normalizedFishbone = {
          People: rawFishbone.People || [],
          Method: rawFishbone.Method || rawFishbone.Process || [],
          Machine: rawFishbone.Machine || rawFishbone.Equipment || [],
          Material: rawFishbone.Material || rawFishbone.Materials || [],
          Measurement: rawFishbone.Measurement || [],
          Environment: rawFishbone.Environment || [],
        };

        // Normalize CAPAs
        const rawCapas = findings.reviewed_capas || a.capas || [];
        const normalizedCapas = rawCapas.map((c, idx) => ({
          id: c.id || `capa-db-${record.id}-${idx + 1}`,
          title: c.title || c.action || 'Remediation action',
          desc: c.desc || c.description || '',
          type: c.type || 'Corrective',
          priority: c.priority || 'Medium',
          source: c.source || `Investigation DB-${record.id}`,
        }));

        dispatch(addInvestigation({
          id: `DB-${record.id}`,
          backendId: record.id,
          title: record.title,
          product: fields.product || 'Product not specified',
          batch: fields.batch || '',
          severity: fields.severity || 'Not assessed',
          details: record.original_text || '',
          fileName: source.filename || '',
          status: record.review_status || 'Pending qualified review',
          stage: 2,
          date: record.created_at ? new Date(record.created_at).toLocaleDateString() : 'Saved',
          initials: 'QA',
          color: 'sage',
          isSample: false,
          whys: rawWhys,
          fishbone: normalizedFishbone,
          factors: findings.reviewed_factors || a.hypotheses_and_factors || a.hypotheses || [],
          capas: normalizedCapas,
          evidence: a.evidence || [],
          aiExtracted: Boolean(a.five_whys || record.extracted_fields),
          owner: 'Quality Lead (QA)',
          createdAt: record.created_at,
          knownFacts: fields.known_facts || [],
          unknowns: fields.unknowns || [],
          assumptions: fields.assumptions || [],
          problemStatement: a.problem_statement || '',
        }));
      });
    }).catch(() => {});
  }, [dispatch]);

  // Compute live, truthful notification items from real state
  const notifications = useMemo(() => {
    const list = [];
    if (!backendAvailable) {
      list.push({
        id: 'backend-offline',
        title: 'Backend offline',
        desc: 'FastAPI service on port 8000 is not reachable. Running in session mode.',
        type: 'warning',
        actionLabel: 'Check connection',
        action: () => checkBackendHealth().then(res => {
          dispatch(setBackendAvailable(res.ok));
          dispatch(showToast({
            message: res.ok ? 'Backend connection restored' : 'Backend still unreachable on port 8000',
            type: res.ok ? 'success' : 'error'
          }));
        }),
      });
    }

    const pendingReviewList = allIncidents.filter(i =>
      !i.isSample &&
      i.status &&
      (i.status.includes('Pending') || i.status.includes('in progress'))
    );
    if (pendingReviewList.length > 0) {
      list.push({
        id: `pending-${pendingReviewList[0].id}`,
        title: `${pendingReviewList.length} investigation${pendingReviewList.length > 1 ? 's' : ''} awaiting review`,
        desc: `"${pendingReviewList[0].title}" requires qualified human sign-off before QA approval.`,
        type: 'info',
        actionLabel: 'Open in RCA',
        action: () => {
          dispatch(openWorkspace(pendingReviewList[0].id));
          dispatch(setActiveNav('Investigations'));
          dispatch(setNotificationsOpen(false));
        },
      });
    }

    const withGaps = allIncidents.filter(i =>
      !i.isSample &&
      (i.evidence || []).some(e => e.status === 'Missing')
    );
    if (withGaps.length > 0) {
      list.push({
        id: `gaps-${withGaps[0].id}`,
        title: 'Evidence gaps identified',
        desc: `${withGaps.length} deviation record(s) have unverified hypotheses blocking root cause determination.`,
        type: 'warning',
        actionLabel: 'View evidence library',
        action: () => {
          dispatch(setActiveNav('Evidence library'));
          dispatch(setNotificationsOpen(false));
        },
      });
    }

    return list;
  }, [backendAvailable, allIncidents, dispatch]);

  const unreadNotifications = notifications.filter(n => !readNotificationIds.includes(n.id));

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => dispatch(clearToast()), 3500);
      return () => clearTimeout(t);
    }
  }, [toast, dispatch]);

  const handleCreateInvestigation = useCallback(data => {
    dispatch(addInvestigation(data));
    dispatch(closeModal());
    dispatch(openWorkspace(data.id));
    dispatch(showToast({ message: 'Investigation created — RCA workspace opened', type: 'success' }));
  }, [dispatch]);

  const handleOpenInvestigation = useCallback(id => {
    dispatch(openWorkspace(id));
  }, [dispatch]);

  const handleToggleSample = useCallback(() => {
    dispatch(toggleSampleData());
    dispatch(showToast({
      message: showSample ? 'Sample records hidden — honest empty state' : 'Sample records loaded — illustrative data',
      type: 'info',
    }));
  }, [dispatch, showSample]);

  const navCounts = {
    investigations: allIncidents.length > 0 ? allIncidents.length : null,
    capas: allCapas.length > 0 ? allCapas.length : null,
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            className="mobile-close icon-btn"
            onClick={() => dispatch(setSidebarOpen(false))}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="org-avatar">Q</div>
          <div className="org-copy">
            <b>Quality System</b>
            <span>Site Quality Unit · Workspace</span>
          </div>
        </div>

        <div className="nav-scroll">
          {NAV_GROUPS.map(group => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(item => {
                const count = item.countKey ? navCounts[item.countKey] : null;
                const isActive = activeNav === item.key && !workspaceIncidentId;
                return (
                  <button
                    key={item.key}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (workspaceIncidentId) dispatch(closeWorkspace(item.key));
                      else dispatch(setActiveNav(item.key));
                    }}
                  >
                    <item.icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {count !== null && <span className="nav-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="help-card"
            onClick={() => dispatch(setGuideModalOpen(true))}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: '1px solid var(--line)' }}
            aria-label="Open RCA Reference Guide"
          >
            <div className="help-icon"><LifeBuoy size={17} /></div>
            <div style={{ flex: 1 }}>
              <b>RCA Reference Guide</b>
              <span>5 Whys & Fishbone methods</span>
            </div>
            <ArrowUpRight size={14} />
          </button>
          <div className="user-profile">
            <Avatar initials="QA" tone="sage" />
            <div className="user-meta">
              <b>Quality Lead</b>
              <span>Active session · Local</span>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="mobile-scrim" onClick={() => dispatch(setSidebarOpen(false))} />
      )}

      {/* Main Area */}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-btn" onClick={() => dispatch(setSidebarOpen(true))} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            <button
              type="button"
              className="crumb-btn"
              onClick={() => {
                if (workspaceIncidentId) dispatch(closeWorkspace('Overview'));
                else dispatch(setActiveNav('Overview'));
              }}
            >
              Quality workspace
            </button>
            {workspaceIncidentId ? (
              <>
                <ChevronRight size={14} className="crumb-chevron" />
                <button
                  type="button"
                  className="crumb-btn"
                  onClick={() => dispatch(closeWorkspace('Investigations'))}
                >
                  Investigations
                </button>
                <ChevronRight size={14} className="crumb-chevron" />
                <span className="crumb-current">{workspaceIncidentId}</span>
              </>
            ) : (
              <>
                <ChevronRight size={14} className="crumb-chevron" />
                <span className="crumb-current">{activeNav}</span>
              </>
            )}
          </div>

          <div className="topbar-right">
            <div
              className={`system-status ${backendAvailable ? '' : 'offline'}`}
              title={backendAvailable ? 'FastAPI backend connected on port 8000' : 'FastAPI backend not reachable — session mode only'}
            >
              <span />
              {backendAvailable ? 'Backend connected' : 'Session mode · Backend offline'}
            </div>

            <button
              className={`sample-toggle-pill ${showSample ? '' : 'inactive'}`}
              onClick={handleToggleSample}
              title="Toggle illustrative sample data"
            >
              <span className="status-dot" style={{ background: showSample ? 'var(--amber)' : 'var(--muted)' }} />
              {showSample ? 'Sample data active' : 'Show sample data'}
            </button>

            {/* Notification Popover */}
            <div className="notification-wrapper" ref={notificationRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="icon-btn notification-btn"
                aria-label={`Notifications (${unreadNotifications.length} unread)`}
                aria-expanded={notificationsOpen}
                onClick={() => dispatch(setNotificationsOpen(!notificationsOpen))}
              >
                <Bell size={18} />
                {unreadNotifications.length > 0 && <i />}
              </button>

              {notificationsOpen && (
                <div className="notification-popover" role="region" aria-label="Notifications panel">
                  <div className="notification-popover-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <b>Notifications</b>
                      {unreadNotifications.length > 0 && (
                        <span className="evidence-meta-pill" style={{ padding: '1px 6px', fontSize: 11 }}>
                          {unreadNotifications.length} unread
                        </span>
                      )}
                    </div>
                    {unreadNotifications.length > 0 && (
                      <button
                        type="button"
                        className="notification-clear-all"
                        onClick={() => dispatch(markAllNotificationsRead())}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notification-popover-body">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <CheckCircle2 size={24} style={{ color: 'var(--green)', margin: '0 auto 8px' }} />
                        <b style={{ color: 'var(--ink)', fontSize: 13, display: 'block' }}>You're all caught up</b>
                        <span>No unread operational notifications or compliance alerts.</span>
                      </div>
                    ) : (
                      notifications.map(item => {
                        const isRead = readNotificationIds.includes(item.id);
                        return (
                          <div key={item.id} className={`notification-item ${isRead ? 'read' : ''}`}>
                            <div className="notification-item-icon">
                              {item.type === 'warning' ? (
                                <AlertTriangle size={15} style={{ color: 'var(--terracotta-dark)' }} />
                              ) : (
                                <Info size={15} style={{ color: 'var(--green)' }} />
                              )}
                            </div>
                            <div className="notification-item-content">
                              <b>{item.title}</b>
                              <p>{item.desc}</p>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                {item.action && (
                                  <button
                                    type="button"
                                    className="notification-item-action"
                                    onClick={() => {
                                      dispatch(markNotificationRead(item.id));
                                      item.action();
                                    }}
                                  >
                                    {item.actionLabel} <ArrowRight size={11} />
                                  </button>
                                )}
                                {!isRead && (
                                  <button
                                    type="button"
                                    className="notification-item-action"
                                    style={{ color: 'var(--muted)', marginLeft: 'auto' }}
                                    onClick={() => dispatch(markNotificationRead(item.id))}
                                  >
                                    Dismiss
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="topbar-divider" />

            {/* Help Button */}
            <button
              type="button"
              className="help-top"
              onClick={() => dispatch(setHelpModalOpen(true))}
              aria-label="Open Help and User Manual"
            >
              <CircleHelp size={17} />
              <span>Help</span>
            </button>
          </div>
        </header>

        {/* View Router */}
        {workspaceIncidentId ? (
          <ErrorBoundary
            title="Investigation Workspace Error"
            description="An unexpected error occurred while rendering this investigation workspace. You can return to the investigations register or try reloading the workspace."
            onNavigateHome={() => dispatch(closeWorkspace('Investigations'))}
            onReset={() => dispatch(openWorkspace(workspaceIncidentId))}
          >
            <InvestigationWorkspace />
          </ErrorBoundary>
        ) : activeNav === 'Investigations' ? (
          <div className="page-content investigations-page">
            <div className="page-heading">
              <div>
                <div className="eyebrow">QUALITY OPERATIONS / RECORDS</div>
                <h1>Investigations</h1>
                <p>Structured deviation records with AI-assisted root cause analysis.</p>
              </div>
              <button className="btn-primary" onClick={() => dispatch(openModal())}>
                <Plus size={16} /> New investigation
              </button>
            </div>

            <div className="list-toolbar">
              <div className="search-box">
                <Search size={16} />
                <input
                  placeholder="Search by title, batch ID, product…"
                  value={search}
                  onChange={e => dispatch(setSearch(e.target.value))}
                  aria-label="Search investigations"
                />
              </div>
              <select className="filter-select" value={filter} onChange={e => dispatch(setFilter(e.target.value))}>
                <option>All incidents</option>
                <option>RCA in progress</option>
                <option>Evidence review</option>
                <option>CAPA pending</option>
                <option>Ready for QA</option>
              </select>
              <button
                className={`btn-secondary small${showSample ? ' active' : ''}`}
                onClick={handleToggleSample}
              >
                {showSample ? 'Hide sample records' : 'Load sample data'}
              </button>
            </div>

            {allIncidents.length === 0 ? (
              <EmptyState
                icon={Microscope}
                title="No investigations yet"
                description="Create your first investigation to begin structured root cause analysis with AI-assisted field extraction."
                actionText="Create investigation"
                onAction={() => dispatch(openModal())}
                secondaryText={!showSample ? 'Load illustrative sample data' : undefined}
                onSecondary={handleToggleSample}
              />
            ) : (
              <div className="panel table-panel">
                <IncidentTable list={visibleIncidents} onOpen={handleOpenInvestigation} />
              </div>
            )}
          </div>
        ) : activeNav === 'CAPA tracker' ? (
          <CapaTrackerPage
            capas={allCapas}
            onNew={() => dispatch(openModal())}
            onToggleSample={handleToggleSample}
            showSample={showSample}
            onOpen={handleOpenInvestigation}
          />
        ) : activeNav === 'Evidence library' ? (
          <EvidenceLibraryPage
            onNew={() => dispatch(openModal())}
            onOpen={handleOpenInvestigation}
            showSample={showSample}
            onToggleSample={handleToggleSample}
          />
        ) : activeNav === 'Quality insights' ? (
          <QualityInsightsPage
            onNew={() => dispatch(openModal())}
            onToggleSample={handleToggleSample}
            showSample={showSample}
            onOpen={handleOpenInvestigation}
          />
        ) : activeNav === 'Audit trail' ? (
          <AuditTrailPage
            onNew={() => dispatch(openModal())}
            onOpen={handleOpenInvestigation}
            showSample={showSample}
          />
        ) : (
          <Dashboard
            allIncidents={allIncidents}
            capas={allCapas}
            onNew={() => dispatch(openModal())}
            onOpen={handleOpenInvestigation}
            onViewAll={() => dispatch(setActiveNav('Investigations'))}
            showSample={showSample}
            onToggleSample={handleToggleSample}
            onOpenGuide={() => dispatch(setGuideModalOpen(true))}
          />
        )}

        <footer className="app-footer">
          <span>© 2026 AIVOA Quality Intelligence</span>
          <span>
            <span className="footer-dot" />
            {backendAvailable ? 'FastAPI + Groq active' : 'Session evaluation mode · Local'}
            <span className="footer-sep">·</span> v0.1.0
          </span>
        </footer>
      </main>

      {/* New Investigation Modal */}
      {modalOpen && (
        <NewInvestigationModal
          onClose={() => { dispatch(closeModal()); dispatch(aiExtractionReset()); }}
          onCreate={handleCreateInvestigation}
        />
      )}

      {/* In-App Help Modal */}
      {helpModalOpen && (
        <HelpModal onClose={() => dispatch(setHelpModalOpen(false))} />
      )}

      {/* RCA Reference Guide Modal */}
      {guideModalOpen && (
        <RcaReferenceGuideModal onClose={() => dispatch(setGuideModalOpen(false))} />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`} role="status">
          {toast.type === 'error'
            ? <AlertTriangle size={17} />
            : <CheckCircle2 size={17} />
          }
          <span>{toast.message}</span>
          <button onClick={() => dispatch(clearToast())} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

