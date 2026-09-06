import { useState, useCallback, useMemo } from 'react';
import {
  CheckCircle2, Send, MapPin, ChevronLeft, ChevronRight, Check,
  FolderOpen, MapPinned, Cpu, ClipboardCheck, AlertCircle,
} from 'lucide-react';
import Logo from './Logo';
import { emptyInstallation, insertInstallations } from '../utils/installations';
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
    hint: 'Tell us where the light is installed. Coordinates help us find it on a map.',
    icon: MapPinned,
    required: ['village'],
    fields: [
      { key: 'sno', label: 'S.No.', placeholder: 'e.g., 1', help: 'Serial number of this pole in your list.' },
      { key: 'exact_location', label: 'Exact Location (Landmark)', placeholder: 'e.g., Near village temple', help: 'A nearby landmark so the spot is easy to find.' },
      { key: 'village', label: 'Village / Gram Panchayat', placeholder: 'Village / Gram Panchayat name', help: 'Name of the village or gram panchayat.' },
      { key: 'block', label: 'Name of Block', placeholder: 'Block name', help: 'The administrative block.' },
      { key: 'assembly_constituency', label: 'Assembly Constituency', placeholder: 'Constituency name', help: 'The assembly constituency, if known.' },
      { key: 'latitude', label: 'Latitude', placeholder: 'e.g., 30.7333', help: 'GPS latitude from your phone.' },
      { key: 'longitude', label: 'Longitude', placeholder: 'e.g., 76.7794', help: 'GPS longitude from your phone.' },
    ],
  },
  {
    id: 'equipment',
    title: 'Equipment',
    hint: 'Enter the serial numbers printed on the equipment and the commissioning date.',
    icon: Cpu,
    required: [],
    fields: [
      { key: 'commissioning_date', label: 'Date of Commissioning', placeholder: 'DD/MM/YYYY', help: 'The day the light was switched on.' },
      { key: 'photo_date', label: 'Photo Date', placeholder: 'DD/MM/YYYY', help: 'The day the site photo was taken.' },
      { key: 'module_serial', label: 'Module Serial Number', placeholder: 'Printed on the solar module', help: 'Serial number on the solar panel.' },
      { key: 'battery_serial', label: 'Battery Serial Number', placeholder: 'Printed on the battery', help: 'Serial number on the battery.' },
      { key: 'luminaire_serial', label: 'Luminaire Serial Number', placeholder: 'Printed on the light fitting', help: 'Serial number on the light.' },
      { key: 'rms', label: 'RMS', type: 'radio', options: ['YES', 'NO'], help: 'Is remote monitoring (RMS) installed?' },
    ],
  },
];

function isStepComplete(step, form) {
  if (!step.required || step.required.length === 0) return true;
  return step.required.every((k) => String(form[k] ?? '').trim() !== '');
}

function PublicInstallationForm() {
  const [form, setForm] = useState(() => emptyInstallation());
  const [current, setCurrent] = useState(0); // 0..STEPS.length (last index = review)
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const reviewIndex = STEPS.length; // review is the final "virtual" step
  const isReview = current === reviewIndex;

  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  const goToStep = useCallback((idx) => {
    setError(null);
    setCurrent(idx);
  }, []);

  const doSubmit = useCallback(async () => {
    setShowConfirm(false);
    setError(null);
    setSubmitting(true);
    try {
      const { inserted } = await insertInstallations([form]);
      if (inserted === 0) {
        setError('Please fill in at least a few fields before submitting.');
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  const submitAnother = () => {
    setForm(emptyInstallation());
    setCurrent(0);
    setSubmitted(false);
    setError(null);
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
        </header>

        {/* Stepper */}
        <nav className="pf-stepper" aria-label="Progress">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = completed[i];
            const active = i === current;
            return (
              <button
                type="button"
                key={s.id}
                className={`pf-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                onClick={() => goToStep(i)}
              >
                <span className="pf-step-dot">
                  {done && !active ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <span className="pf-step-label">{s.title}</span>
              </button>
            );
          })}
          <button
            type="button"
            className={`pf-step ${isReview ? 'active' : ''}`}
            onClick={() => goToStep(reviewIndex)}
          >
            <span className="pf-step-dot"><ClipboardCheck size={16} /></span>
            <span className="pf-step-label">Review</span>
          </button>
        </nav>

        <div className="pf-progress">
          <div
            className="pf-progress-bar"
            style={{ width: `${Math.round((current / reviewIndex) * 100)}%` }}
          />
        </div>

        {/* Body */}
        <div className="pf-body">
          {!isReview ? (
            <section className="pf-panel">
              <div className="pf-panel-head">
                <h2>{step.title}</h2>
                <p className="pf-guidance">
                  <AlertCircle size={15} /> {step.hint}
                </p>
              </div>

              <div className="pf-grid">
                {step.fields.map((f) =>
                  f.type === 'radio' ? (
                    <div className="pf-field pf-field-full" key={f.key}>
                      <label>{f.label}</label>
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
                  ) : (
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
                      />
                      {f.help && <span className="pf-help">{f.help}</span>}
                    </div>
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
            <ReviewPanel form={form} onEdit={goToStep} />
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
              <Send size={16} /> {submitting ? 'Submitting…' : 'Submit'}
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

      <p className="pf-footnote">Sunfeed · Installation Data Collection</p>
    </div>
  );
}

function ReviewPanel({ form, onEdit }) {
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
          <dl className="pf-review-list">
            {s.fields.map((f) => (
              <div className="pf-review-item" key={f.key}>
                <dt>{f.label}</dt>
                <dd>{String(form[f.key] ?? '').trim() || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}

export default PublicInstallationForm;
