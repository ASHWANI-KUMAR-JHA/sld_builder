import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  CheckCircle2, Send, MapPin, ChevronLeft, ChevronRight, Check,
  FolderOpen, MapPinned, Cpu, ClipboardCheck, AlertCircle, LogOut, UserCircle,
  Paperclip, Image as ImageIcon, FileText, X, Loader2, Camera,
} from 'lucide-react';
import Logo from './Logo';
import { emptyInstallation, insertInstallations } from '../utils/installations';
import {
  fetchWorkOrders,
  fetchWorkOrderItems,
  markItemsUsed,
} from '../utils/workorders';
import { uploadInstallationFiles } from '../utils/storageUploads';
import { getCurrentUser, isBuiltInAdmin } from '../utils/auth';
import { getUserStatusByEmail } from '../utils/users';
import { getCurrentPosition, stampCoordinatesOnImage, formatCoord, reverseGeocode } from '../utils/geoImage';
import './PublicInstallationForm.css';

// Each step is one section of the form. `required` keys are used to decide
// whether the step is "complete" (shows a check on the stepper).
const STEPS = [
  {
    id: 'project',
    title: 'Project',
    hint: 'Start with what project this installation belongs to. If you are unsure, ask your supervisor.',
    icon: FolderOpen,
    required: ['project_name'],
    fields: [
      { key: 'project_name', label: 'Project Name', placeholder: 'e.g., Solar Street Light Phase-1', help: 'The name of the overall project.' },
      { key: 'work_order', label: 'Work Order', placeholder: 'e.g., WO/2026/00123', help: 'The work order number, if you have one.' },
    ],
  },
  {
    id: 'location',
    title: 'Location',
    hint: 'Start by capturing the site photo — it fills the coordinates and place details for you. Then check the rest.',
    icon: MapPinned,
    required: ['village'],
    fields: [
      { key: 'sno', label: 'S.No.', placeholder: 'e.g., 1', help: 'Serial number of this pole in your list.' },
      { key: 'exact_location', label: 'Exact Location (Landmark)', placeholder: 'e.g., Near village temple', help: 'A nearby landmark so the spot is easy to find.' },
      { key: 'village', label: 'Village / Gram Panchayat', placeholder: 'Village / Gram Panchayat name', help: 'Auto-filled from the site photo. You can edit it.' },
      { key: 'block', label: 'Name of Block', placeholder: 'Block name', help: 'The administrative block.' },
      { key: 'assembly_constituency', label: 'Assembly Constituency', placeholder: 'Constituency name', help: 'Auto-filled from the site photo. You can edit it.' },
      { key: 'state', label: 'State', placeholder: 'State name', help: 'Auto-filled from the site photo. You can edit it.' },
      { key: 'latitude', label: 'Latitude', placeholder: 'Captured from the site photo', help: 'Locked once the site photo is captured.', locked: 'site_image' },
      { key: 'longitude', label: 'Longitude', placeholder: 'Captured from the site photo', help: 'Locked once the site photo is captured.', locked: 'site_image' },
    ],
  },
  {
    id: 'equipment',
    title: 'Equipment',
    hint: 'Enter the serial numbers printed on the equipment and the commissioning date.',
    icon: Cpu,
    required: ['commissioning_date', 'photo_date', 'module_serial', 'battery_serial', 'luminaire_serial', 'rms'],
    fields: [
      { key: 'commissioning_date', label: 'Date of Commissioning', type: 'date', help: 'The day the light was switched on.' },
      { key: 'photo_date', label: 'Photo Date', type: 'date', help: 'The day the site photo was taken.' },
      { key: 'module_serial', label: 'Module Serial Number', placeholder: 'Printed on the solar module', help: 'Serial number on the solar panel.' },
      { key: 'battery_serial', label: 'Battery Serial Number', placeholder: 'Printed on the battery', help: 'Serial number on the battery.' },
      { key: 'luminaire_serial', label: 'Luminaire Serial Number', placeholder: 'Printed on the light fitting', help: 'Serial number on the light.' },
      { key: 'rms', label: 'RMS', type: 'radio', options: ['YES', 'NO'], required: true, help: 'Is remote monitoring (RMS) installed?' },
    ],
  },
  {
    id: 'files',
    title: 'Files',
    hint: 'Attach the signed PDF and any other supporting files. The site photo was captured in the Location step.',
    icon: Paperclip,
    required: [],
    fields: [],
  },
];

// The rest of the app stores dates as DD/MM/YYYY, but a native date input
// works with ISO (YYYY-MM-DD). These helpers convert between the two.
function ddmmyyyyToISO(value) {
  const v = String(value ?? '').trim();
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function isoToDDMMYYYY(value) {
  const v = String(value ?? '').trim();
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function isStepComplete(step, form) {
  if (!step.required || step.required.length === 0) return true;
  return step.required.every((k) => String(form[k] ?? '').trim() !== '');
}

// Maps the equipment serial field keys to the work order item categories.
const WO_FIELD_TO_CATEGORY = {
  module_serial: 'module',
  battery_serial: 'battery',
  luminaire_serial: 'luminaire',
};

function PublicInstallationForm({ onLogout, initialWorkOrder = '' }) {
  const currentUser = getCurrentUser();
  const [form, setForm] = useState(() => emptyInstallation());

  // ===== Work order integration =====
  // The list of saved work orders (for the dropdown selector).
  const [workOrders, setWorkOrders] = useState([]);
  // The currently selected work order object (or null for free-entry mode).
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  // Available (unused) serials for the selected work order, grouped by category.
  const [woItems, setWoItems] = useState({ module: [], battery: [], luminaire: [] });
  const [woLoading, setWoLoading] = useState(false);

  // Load the saved work orders once so the dropdown can be populated and the
  // URL param (?workorder=test) can be matched by name.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchWorkOrders();
        if (cancelled) return;
        setWorkOrders(list);
        if (initialWorkOrder) {
          const match = list.find(
            (o) => o.name.toLowerCase() === initialWorkOrder.toLowerCase()
          );
          if (match) setSelectedWorkOrder(match);
        }
      } catch {
        // Work orders are optional; ignore load failures.
      }
    })();
    return () => { cancelled = true; };
  }, [initialWorkOrder]);

  // Load the available serials whenever the selected work order changes.
  const loadWoItems = useCallback(async (workOrderId) => {
    if (!workOrderId) {
      setWoItems({ module: [], battery: [], luminaire: [] });
      return;
    }
    setWoLoading(true);
    try {
      const items = await fetchWorkOrderItems(workOrderId);
      const grouped = { module: [], battery: [], luminaire: [] };
      for (const it of items) {
        if (it.status === 'available' && grouped[it.category]) grouped[it.category].push(it);
      }
      setWoItems(grouped);
    } catch {
      setWoItems({ module: [], battery: [], luminaire: [] });
    } finally {
      setWoLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWoItems(selectedWorkOrder?.id || null);
  }, [selectedWorkOrder, loadWoItems]);
  // Selected (not-yet-uploaded) files. Keys preserved: site_image, signed_pdf, attachments.
  const [files, setFiles] = useState({ site_image: null, signed_pdf: null, attachments: [] });
  const [current, setCurrent] = useState(0); // 0..STEPS.length (last index = review)
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total, label } while uploading
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const reviewIndex = STEPS.length; // review is the final "virtual" step
  const isReview = current === reviewIndex;

  // On load, verify the logged-in user is still active. If they were
  // deactivated or removed after logging in, end their session immediately.
  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.email || isBuiltInAdmin(currentUser.email)) return undefined;
    (async () => {
      try {
        const { exists, active } = await getUserStatusByEmail(currentUser.email);
        if (!cancelled && (!exists || !active) && onLogout) onLogout();
      } catch {
        // Ignore lookup failures here; submission is still guarded separately.
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.email, onLogout]);

  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Select a work order by id. Also stamps its name into the work_order field
  // and clears any equipment serials picked for a previous work order.
  const selectWorkOrder = useCallback((id) => {
    const wo = workOrders.find((o) => o.id === id) || null;
    setSelectedWorkOrder(wo);
    setForm((prev) => ({
      ...prev,
      work_order: wo ? wo.name : prev.work_order,
      module_serial: '',
      battery_serial: '',
      luminaire_serial: '',
    }));
  }, [workOrders]);

  // When a work order is selected, keep the work_order field in sync with it.
  useEffect(() => {
    if (selectedWorkOrder) {
      setForm((prev) =>
        prev.work_order === selectedWorkOrder.name
          ? prev
          : { ...prev, work_order: selectedWorkOrder.name }
      );
    }
  }, [selectedWorkOrder]);

  // Set a single-file field (site_image / signed_pdf).
  const setSingleFile = useCallback((key, file) => {
    setFiles((prev) => ({ ...prev, [key]: file || null }));
  }, []);

  // Add one or more files to the attachments list.
  const addAttachments = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    setFiles((prev) => ({ ...prev, attachments: [...prev.attachments, ...incoming] }));
  }, []);

  // Remove one attachment by index.
  const removeAttachment = useCallback((idx) => {
    setFiles((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }));
  }, []);

  const completed = useMemo(
    () => STEPS.map((s) => isStepComplete(s, form)),
    [form]
  );

  const goNext = useCallback(() => {
    setError(null);
    const step = STEPS[current];
    if (step && !isStepComplete(step, form)) {
      setError('Please fill the required field(s) before continuing.');
      return;
    }
    setCurrent((c) => Math.min(c + 1, reviewIndex));
  }, [current, form, reviewIndex]);

  const goBack = useCallback(() => {
    setError(null);
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  // A step is reachable only when every step before it is complete. This
  // prevents jumping ahead via the stepper and skipping required fields.
  const isStepReachable = useCallback(
    (idx) => {
      for (let i = 0; i < idx && i < STEPS.length; i += 1) {
        if (!isStepComplete(STEPS[i], form)) return false;
      }
      return true;
    },
    [form]
  );

  const goToStep = useCallback(
    (idx) => {
      setError(null);
      // Always allow going back to earlier steps. Forward jumps require every
      // preceding step to be complete.
      if (idx <= current || isStepReachable(idx)) {
        setCurrent(idx);
      } else {
        setError('Please complete the earlier steps first.');
      }
    },
    [current, isStepReachable]
  );

  const doSubmit = useCallback(async () => {
    setShowConfirm(false);
    setError(null);
    setSubmitting(true);
    try {
      // Block stale sessions: a user who was deactivated or removed after
      // logging in must not be able to submit. Built-in admins are exempt
      // because they are not stored in the users table.
      if (currentUser?.email && !isBuiltInAdmin(currentUser.email)) {
        const { exists, active } = await getUserStatusByEmail(currentUser.email);
        if (!exists || !active) {
          setSubmitting(false);
          setError(
            !exists
              ? 'Your account no longer exists. Please contact an administrator.'
              : 'Your account is inactive. Please contact an administrator.'
          );
          if (onLogout) onLogout();
          return;
        }
      }

      // Upload any selected files first, then attach the returned metadata
      // (keys preserved: site_image / signed_pdf / attachments).
      const uploaded = await uploadInstallationFiles(files, setProgress);
      setProgress(null);
      const record = {
        ...form,
        site_image: uploaded.site_image,
        signed_pdf: uploaded.signed_pdf,
        attachments: uploaded.attachments,
        ...(currentUser ? { submitted_by: currentUser.name || currentUser.email } : {}),
      };
      const { inserted } = await insertInstallations([record]);
      if (inserted === 0) {
        setError('Please fill in at least a few fields before submitting.');
      } else {
        // If a work order is selected, mark the chosen serials as used in a
        // single batched request to keep the request count low.
        if (selectedWorkOrder) {
          const usedBy = currentUser?.name || currentUser?.email || '';
          const ids = Object.entries(WO_FIELD_TO_CATEGORY)
            .map(([fieldKey, category]) => {
              const serial = String(form[fieldKey] ?? '').trim();
              if (!serial) return null;
              const item = (woItems[category] || []).find((it) => it.serial === serial);
              return item ? item.id : null;
            })
            .filter(Boolean);
          if (ids.length > 0) {
            try {
              await markItemsUsed(ids, usedBy);
            } catch {
              // Non-fatal: the installation is already saved.
            }
          }
        }
        setSubmitted(true);
      }
    } catch (err) {
      setError(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  }, [form, files, currentUser, onLogout, selectedWorkOrder, woItems]);

  const submitAnother = () => {
    // Preserve the selected work order across submissions and refresh its
    // available serials so the ones just used drop out of the dropdowns.
    setForm({
      ...emptyInstallation(),
      ...(selectedWorkOrder ? { work_order: selectedWorkOrder.name } : {}),
    });
    setFiles({ site_image: null, signed_pdf: null, attachments: [] });
    setCurrent(0);
    setSubmitted(false);
    setError(null);
    if (selectedWorkOrder) loadWoItems(selectedWorkOrder.id);
  };

  if (submitted) {
    return (
      <div className="pf-page">
        <div className="pf-shell pf-success-shell">
          <div className="pf-success">
            <CheckCircle2 size={64} className="pf-success-icon" />
            <h2>Thank you!</h2>
            <p>Your installation details have been submitted successfully.</p>
            <button className="pf-btn pf-btn-primary" onClick={submitAnother}>
              Submit another installation
            </button>
          </div>
        </div>
      </div>
    );
  }

  const step = STEPS[current];

  return (
    <div className="pf-page">
      <div className="pf-shell">
        <header className="pf-header">
          <Logo size="medium" />
          <div className="pf-title">
            <h1>Installation Details</h1>
            <span>Solar Street Light — Field Data Entry</span>
          </div>
          {currentUser && (
            <div className="pf-user">
              <span className="pf-user-chip">
                <UserCircle size={18} />
                <span className="pf-user-name">{currentUser.name || currentUser.email}</span>
              </span>
              {onLogout && (
                <button type="button" className="pf-logout" onClick={onLogout} title="Logout">
                  <LogOut size={16} />
                </button>
              )}
            </div>
          )}
        </header>

        {/* Stepper */}
        <nav className="pf-stepper" aria-label="Progress">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = completed[i];
            const active = i === current;
            const locked = i > current && !isStepReachable(i);
            return (
              <button
                type="button"
                key={s.id}
                className={`pf-step ${active ? 'active' : ''} ${done ? 'done' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => goToStep(i)}
                disabled={locked}
                aria-disabled={locked}
              >
                <span className="pf-step-dot">
                  {done && !active ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <span className="pf-step-label">{s.title}</span>
              </button>
            );
          })}
          {(() => {
            const reviewLocked = reviewIndex > current && !isStepReachable(reviewIndex);
            return (
              <button
                type="button"
                className={`pf-step ${isReview ? 'active' : ''} ${reviewLocked ? 'locked' : ''}`}
                onClick={() => goToStep(reviewIndex)}
                disabled={reviewLocked}
                aria-disabled={reviewLocked}
              >
                <span className="pf-step-dot"><ClipboardCheck size={16} /></span>
                <span className="pf-step-label">Review</span>
              </button>
            );
          })()}
        </nav>

        <div className="pf-progress">
          <div
            className="pf-progress-bar"
            style={{ width: `${Math.round((current / reviewIndex) * 100)}%` }}
          />
        </div>

        {/* Body */}
        <div className="pf-body">
          {!isReview && step.id === 'files' ? (
            <FilesPanel
              step={step}
              files={files}
              onSetSingle={setSingleFile}
              onAddAttachments={addAttachments}
              onRemoveAttachment={removeAttachment}
            />
          ) : !isReview ? (
            <section className="pf-panel">
              <div className="pf-panel-head">
                <h2>{step.title}</h2>
                <p className="pf-guidance">
                  <AlertCircle size={15} /> {step.hint}
                </p>
              </div>

              {step.id === 'project' && workOrders.length > 0 && (
                <div className="pf-field pf-field-full pf-wo-select">
                  <label htmlFor="pf-workorder">
                    Work Order
                    <span className="pf-count">
                      {selectedWorkOrder ? 'serials restricted to this order' : 'optional'}
                    </span>
                  </label>
                  <select
                    id="pf-workorder"
                    value={selectedWorkOrder?.id || ''}
                    onChange={(e) => selectWorkOrder(e.target.value)}
                  >
                    <option value="">— No work order (free entry) —</option>
                    {workOrders.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <span className="pf-help">
                    Pick a work order to choose equipment serials from its uploaded list.
                  </span>
                </div>
              )}

              {step.id === 'location' && (
                <SiteImageField
                  file={files.site_image}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onSelect={(f) => setSingleFile('site_image', f)}
                  onClear={() => setSingleFile('site_image', null)}
                  onSetCoords={(lat, lng) => {
                    update('latitude', formatCoord(lat));
                    update('longitude', formatCoord(lng));
                  }}
                  onSetPlace={(place) => {
                    if (place.village) update('village', place.village);
                    if (place.assembly) update('assembly_constituency', place.assembly);
                    if (place.state) update('state', place.state);
                  }}
                />
              )}

              <div className="pf-grid">
                {step.fields.map((f) =>
                  f.type === 'radio' ? (
                    <div className="pf-field pf-field-full" key={f.key}>
                      <label>
                        {f.label}
                        {step.required?.includes(f.key) && <span className="pf-req">*</span>}
                      </label>
                      <div className="pf-radio-row">
                        {f.options.map((opt) => (
                          <label key={opt} className="pf-radio">
                            <input
                              type="radio"
                              name={f.key}
                              value={opt}
                              checked={String(form[f.key]).toUpperCase() === opt}
                              onChange={(e) => update(f.key, e.target.value)}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      {f.help && <span className="pf-help">{f.help}</span>}
                    </div>
                  ) : f.type === 'date' ? (
                    <div className="pf-field" key={f.key}>
                      <label htmlFor={f.key}>
                        {f.label}
                        {step.required?.includes(f.key) && <span className="pf-req">*</span>}
                      </label>
                      <input
                        id={f.key}
                        type="date"
                        value={ddmmyyyyToISO(form[f.key])}
                        onChange={(e) => update(f.key, isoToDDMMYYYY(e.target.value))}
                      />
                      {f.help && <span className="pf-help">{f.help}</span>}
                    </div>
                  ) : selectedWorkOrder && WO_FIELD_TO_CATEGORY[f.key] ? (
                    (() => {
                      const category = WO_FIELD_TO_CATEGORY[f.key];
                      const options = woItems[category] || [];
                      // Keep the current value visible even if it's the one just
                      // picked (it stays "available" until submit).
                      return (
                        <div className="pf-field" key={f.key}>
                          <label htmlFor={f.key}>
                            {f.label}
                            {step.required?.includes(f.key) && <span className="pf-req">*</span>}
                            <span className="pf-count">{options.length} available</span>
                          </label>
                          <select
                            id={f.key}
                            value={form[f.key] ?? ''}
                            onChange={(e) => update(f.key, e.target.value)}
                            disabled={woLoading || options.length === 0}
                          >
                            <option value="">
                              {woLoading
                                ? 'Loading…'
                                : options.length === 0
                                  ? 'No serials available'
                                  : `— Select ${f.label} —`}
                            </option>
                            {options.map((it) => (
                              <option key={it.id} value={it.serial}>{it.serial}</option>
                            ))}
                          </select>
                          <span className="pf-help">
                            {f.help} Choices come from work order “{selectedWorkOrder.name}”.
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    (() => {
                      const isLocked = f.locked && Boolean(files[f.locked]);
                      return (
                        <div className="pf-field" key={f.key}>
                          <label htmlFor={f.key}>
                            {f.label}
                            {step.required?.includes(f.key) && <span className="pf-req">*</span>}
                          </label>
                          <input
                            id={f.key}
                            type="text"
                            value={form[f.key] ?? ''}
                            placeholder={f.placeholder}
                            onChange={(e) => update(f.key, e.target.value)}
                            disabled={isLocked}
                            readOnly={isLocked}
                          />
                          {f.help && <span className="pf-help">{f.help}</span>}
                        </div>
                      );
                    })()
                  )
                )}
              </div>

              {step.id === 'location' && form.latitude && form.longitude && (
                <a
                  className="pf-map-link"
                  href={`https://maps.google.com/?q=${form.latitude},${form.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={14} /> Preview this location on a map
                </a>
              )}
            </section>
          ) : (
            <ReviewPanel form={form} files={files} onEdit={goToStep} />
          )}

          {error && (
            <div className="pf-error">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <footer className="pf-footer">
          <button
            type="button"
            className="pf-btn pf-btn-ghost"
            onClick={goBack}
            disabled={current === 0}
          >
            <ChevronLeft size={18} /> Back
          </button>

          <span className="pf-step-count">
            Step {Math.min(current + 1, reviewIndex + 1)} of {reviewIndex + 1}
          </span>

          {!isReview ? (
            <button type="button" className="pf-btn pf-btn-primary" onClick={goNext}>
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="pf-btn pf-btn-primary"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 size={16} className="pf-spin" /> Submitting…</>
              ) : (
                <><Send size={16} /> Submit</>
              )}
            </button>
          )}
        </footer>
      </div>

      {/* Confirmation popup */}
      {showConfirm && (
        <div className="pf-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <AlertCircle size={40} className="pf-modal-icon" />
            <h3>Submit these details?</h3>
            <p>Please make sure everything looks correct. You can go back and edit if needed.</p>
            <div className="pf-modal-actions">
              <button className="pf-btn pf-btn-ghost" onClick={() => setShowConfirm(false)}>
                Review again
              </button>
              <button className="pf-btn pf-btn-primary" onClick={doSubmit} disabled={submitting}>
                <Check size={16} /> Yes, submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting overlay */}
      {submitting && (
        <div className="pf-loading-overlay">
          <div className="pf-loading-card">
            <Loader2 size={40} className="pf-spin" />
            {progress && progress.total > 0 ? (
              <>
                <h3>Uploading files…</h3>
                <p>{progress.done} of {progress.total} · {progress.label}</p>
                <div className="pf-loading-bar">
                  <div
                    className="pf-loading-bar-fill"
                    style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <h3>Saving installation…</h3>
                <p>Please wait a moment.</p>
              </>
            )}
          </div>
        </div>
      )}

      <p className="pf-footnote">Sunfeed · Installation Data Collection</p>
    </div>
  );
}

function ReviewPanel({ form, files, onEdit }) {
  return (
    <section className="pf-panel">
      <div className="pf-panel-head">
        <h2>Review your details</h2>
        <p className="pf-guidance">
          <AlertCircle size={15} /> Check everything below. Tap “Edit” on any section to make changes.
        </p>
      </div>

      {STEPS.map((s, i) => (
        <div className="pf-review-card" key={s.id}>
          <div className="pf-review-head">
            <h3>{s.title}</h3>
            <button type="button" className="pf-edit-link" onClick={() => onEdit(i)}>
              Edit
            </button>
          </div>
          {s.id === 'files' ? (
            <dl className="pf-review-list">
              <div className="pf-review-item">
                <dt>Site Image</dt>
                <dd>
                  {files.site_image ? (
                    <ReviewImage
                      file={files.site_image}
                      latitude={form.latitude}
                      longitude={form.longitude}
                    />
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div className="pf-review-item">
                <dt>Signed PDF</dt>
                <dd>{files.signed_pdf?.name || '—'}</dd>
              </div>
              <div className="pf-review-item">
                <dt>Attachments</dt>
                <dd>
                  {files.attachments.length
                    ? files.attachments.map((f) => f.name).join(', ')
                    : '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <dl className="pf-review-list">
              {s.fields.map((f) => (
                <div className="pf-review-item" key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{String(form[f.key] ?? '').trim() || '—'}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}
    </section>
  );
}

// Small image preview used in the review step. The GPS coordinates are already
// stamped into the bottom-right of the picture; we also show them as a caption.
function ReviewImage({ file, latitude, longitude }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) return undefined;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="pf-review-image">
      {url && <img src={url} alt={file.name} />}
      <span className="pf-review-image-name">{file.name}</span>
      {latitude && longitude && (
        <span className="pf-review-image-coords">
          <MapPin size={12} /> {latitude}, {longitude}
        </span>
      )}
    </div>
  );
}

// Files step: site image (single), signed PDF (single), attachments (multiple).
function FilesPanel({ step, files, onSetSingle, onAddAttachments, onRemoveAttachment }) {
  return (
    <section className="pf-panel">
      <div className="pf-panel-head">
        <h2>{step.title}</h2>
        <p className="pf-guidance">
          <AlertCircle size={15} /> {step.hint}
        </p>
      </div>

      <div className="pf-files">
        <SingleFileField
          icon={FileText}
          label="Signed PDF"
          help="The signed inspection / commissioning PDF."
          accept="application/pdf,.pdf"
          file={files.signed_pdf}
          onSelect={(f) => onSetSingle('signed_pdf', f)}
          onClear={() => onSetSingle('signed_pdf', null)}
        />

        <div className="pf-file-field pf-field-full">
          <label>Attachments</label>
          <span className="pf-help">Any other supporting files. You can add more than one.</span>
          <label className="pf-file-btn">
            <Paperclip size={16} /> Add attachments
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                onAddAttachments(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {files.attachments.length > 0 && (
            <ul className="pf-file-list">
              {files.attachments.map((f, i) => (
                <li key={`${f.name}-${i}`} className="pf-file-chip">
                  <Paperclip size={13} />
                  <span className="pf-file-name">{f.name}</span>
                  <button
                    type="button"
                    className="pf-file-remove"
                    onClick={() => onRemoveAttachment(i)}
                    title="Remove"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// Site image field: capture from the camera (with GPS) or choose an existing
// photo. When a photo is captured/chosen, we read the device location, stamp
// the coordinates onto the bottom-right of the image, and auto-fill the
// latitude / longitude fields on the form.
function SiteImageField({ file, latitude, longitude, onSelect, onClear, onSetCoords, onSetPlace }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [localError, setLocalError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = useCallback(
    async (picked) => {
      if (!picked) return;
      setLocalError('');
      setBusy(true);
      try {
        setStatus('Getting your location…');
        const { latitude: lat, longitude: lng } = await getCurrentPosition();
        onSetCoords?.(lat, lng);

        setStatus('Looking up place details…');
        const place = await reverseGeocode(lat, lng);
        onSetPlace?.(place);

        setStatus('Stamping details onto photo…');
        const stamped = await stampCoordinatesOnImage(picked, lat, lng, place);
        onSelect(stamped);
      } catch (err) {
        // If location fails, still keep the photo but warn the user.
        setLocalError(err.message || 'Could not capture location.');
        onSelect(picked);
      } finally {
        setBusy(false);
        setStatus('');
      }
    },
    [onSelect, onSetCoords, onSetPlace]
  );

  return (
    <div className="pf-file-field">
      <label>Site Image</label>
      <span className="pf-help">
        Capture a live photo — the GPS coordinates are recorded and stamped onto the picture.
      </span>

      <div className="pf-capture-row">
        <label className={`pf-file-btn pf-capture-btn ${busy ? 'is-busy' : ''}`}>
          <Camera size={16} /> {file ? 'Retake photo' : 'Capture photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            disabled={busy}
            onChange={(e) => {
              handleFile(e.target.files?.[0] || null);
              e.target.value = '';
            }}
          />
        </label>

        <label className="pf-file-btn pf-file-btn-ghost">
          <ImageIcon size={16} /> Choose photo
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={busy}
            onChange={(e) => {
              handleFile(e.target.files?.[0] || null);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {busy && (
        <div className="pf-capture-status">
          <Loader2 size={14} className="pf-spin" /> {status}
        </div>
      )}

      {localError && (
        <div className="pf-capture-warn">
          <AlertCircle size={13} /> {localError}
        </div>
      )}

      {file && previewUrl && (
        <div className="pf-capture-preview">
          <img src={previewUrl} alt={file.name} />
          <button type="button" className="pf-capture-clear" onClick={onClear} title="Remove photo">
            <X size={14} />
          </button>
          {latitude && longitude && (
            <span className="pf-capture-coords">
              <MapPin size={12} /> {latitude}, {longitude}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// A single-file picker showing the chosen file with a clear button.
function SingleFileField({ icon: Icon, label, help, accept, file, onSelect, onClear }) {
  return (
    <div className="pf-file-field">
      <label>{label}</label>
      {help && <span className="pf-help">{help}</span>}
      <label className="pf-file-btn">
        <Icon size={16} /> {file ? 'Change file' : 'Choose file'}
        <input
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => {
            onSelect(e.target.files?.[0] || null);
            e.target.value = '';
          }}
        />
      </label>
      {file && (
        <div className="pf-file-chip">
          <Icon size={13} />
          <span className="pf-file-name">{file.name}</span>
          <button type="button" className="pf-file-remove" onClick={onClear} title="Remove">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export default PublicInstallationForm;
