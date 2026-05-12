'use client';

import React, {
  useState, useEffect, useRef, useCallback, memo,
} from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Plus, Trash2, Eye, EyeOff, Check, X,
  Image as ImageIcon, AlertCircle, Loader2,
  ChevronDown, ChevronUp, GripVertical,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// FIX #3 — KaTeX singleton loader
// ─────────────────────────────────────────────────────────────────────────────
let katexReady = false;
let katexPromise = null;

const loadKaTeX = () => {
  if (katexReady) return Promise.resolve();
  if (katexPromise) return katexPromise;
  katexPromise = new Promise((resolve) => {
    if (document.getElementById('katex-css')) { katexReady = true; resolve(); return; }
    const link = document.createElement('link');
    link.id = 'katex-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);
    const s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
      s2.onload = () => { katexReady = true; resolve(); };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });
  return katexPromise;
};

// FIX #3 — shared hook so every LatexPreview reuses the same promise
const useKaTeX = () => {
  const [ready, setReady] = useState(katexReady);
  useEffect(() => {
    if (!katexReady) loadKaTeX().then(() => setReady(true));
  }, []);
  return ready;
};

// ─────────────────────────────────────────────────────────────────────────────
// FIX #7 — payload utility: strip undefined/null fields recursively
// ─────────────────────────────────────────────────────────────────────────────
const cleanPayload = (obj) => JSON.parse(JSON.stringify(obj, (_, v) => (v == null ? undefined : v)));

// ─────────────────────────────────────────────────────────────────────────────
// FIX #8 — Draft persistence helpers
// ─────────────────────────────────────────────────────────────────────────────
const DRAFT_KEY = 'upload-question-draft';
const saveDraft = (state) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch {}
};
const loadDraft = () => {
  try { const s = localStorage.getItem(DRAFT_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
};
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

// ─────────────────────────────────────────────────────────────────────────────
// Default factories
// ─────────────────────────────────────────────────────────────────────────────
const defaultOption     = () => ({ text: '', images: [], isCorrect: false });
const defaultSubQ       = () => ({
  questionText: '', questionImages: [],
  options: [defaultOption(), defaultOption(), defaultOption(), defaultOption()],
  answerText: '', answerImages: [],
});
const defaultWrittenPart = () => ({ questionText: '', questionImages: [], answerText: '', answerImages: [] });

// ─────────────────────────────────────────────────────────────────────────────
// LatexPreview — FIX #3 (useKaTeX hook) + FIX #4 (textContent then render)
// ─────────────────────────────────────────────────────────────────────────────
const LatexPreview = memo(function LatexPreview({ text }) {
  const ref   = useRef(null);
  const ready = useKaTeX();

  useEffect(() => {
    if (!ready || !ref.current) return;
    // FIX #4 — set textContent first (safe), then let KaTeX parse
    ref.current.textContent = text || '';
    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(ref.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$',  right: '$',  display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        });
      }
    } catch {}
  }, [ready, text]);

  if (!text?.trim()) return <p className="text-xs text-gray-400 italic py-1">Preview will appear here…</p>;
  return <div ref={ref} className="text-sm text-gray-800 leading-relaxed break-words min-h-[1.5rem]" />;
});

// ─────────────────────────────────────────────────────────────────────────────
// ImageUploader
// ─────────────────────────────────────────────────────────────────────────────
const ImageUploader = memo(function ImageUploader({ images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('images', f));
      const res = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newImgs = res.data.files.map((f) => ({ url: f.presignedUrl, key: f.key, label: '' }));
      onChange([...images, ...newImgs]);
    } catch (e) {
      alert('Upload failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const updateLabel = (i, label) => onChange(images.map((img, idx) => (idx === i ? { ...img, label } : img)));
  const remove      = (i)       => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2 mt-2">
      {images.map((img, i) => (
        <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-xl">
          <img src={img.url} alt="" className="w-16 h-12 object-cover rounded-lg border border-gray-200 shrink-0" />
          <input
            type="text"
            placeholder="Label (e.g. Figure 1)"
            value={img.label}
            onChange={(e) => updateLabel(i, e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
          />
          <button type="button" onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl text-xs text-gray-400 hover:text-blue-500 transition-colors w-full justify-center disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        {uploading ? 'Uploading…' : 'Add images'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// RichField — FIX #6 (memo)
// ─────────────────────────────────────────────────────────────────────────────
const RichField = memo(function RichField({
  label, value, onChange, images, onImagesChange,
  required, placeholder, rows = 3, hint,
}) {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">
          {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        <button type="button" onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>
      <div className={`grid ${showPreview ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="p-4 border-r border-gray-100">
          {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'Type text or LaTeX… e.g. $x^2 + y^2 = r^2$'}
            rows={rows}
            className="w-full text-sm border-0 outline-none resize-none text-gray-800 placeholder-gray-300 font-mono leading-relaxed"
          />
          {onImagesChange && <ImageUploader images={images || []} onChange={onImagesChange} />}
        </div>
        {showPreview && (
          <div className="p-4 bg-white border-l border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Preview</p>
            {(images || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(images || []).map((img, i) => (
                  <figure key={i} className="flex flex-col items-center">
                    <img src={img.url} alt={img.label} className="max-h-28 rounded-lg border border-gray-200 object-contain" />
                    {img.label && <figcaption className="text-xs text-gray-400 mt-0.5 italic">{img.label}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            <LatexPreview text={value} />
          </div>
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MultiSelect — modal with search + create
// ─────────────────────────────────────────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, valueKey = 'id', labelKey = 'name' }) {
  const [open, setOpen]               = useState(false);
  const [query, setQuery]             = useState('');
  const [localOptions, setLocalOptions] = useState(options);
  const inputRef = useRef(null);

  useEffect(() => setLocalOptions(options), [options]);

  const selectedSet    = new Set(selected);
  const filtered       = localOptions.filter((o) => o[labelKey].toLowerCase().includes(query.toLowerCase()));
  const selectedItems  = filtered.filter((o) => selectedSet.has(o[valueKey]));
  const unselectedItems = filtered.filter((o) => !selectedSet.has(o[valueKey]));
  const exactMatch     = localOptions.some((o) => o[labelKey].toLowerCase() === query.toLowerCase());

  const toggle = (val) => {
    if (selectedSet.has(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };

  const createNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const tempId  = `custom_${Date.now()}`;
    const newOpt  = { [valueKey]: tempId, [labelKey]: trimmed };
    setLocalOptions((prev) => [...prev, newOpt]);
    onChange([...selected, tempId]);
    setQuery('');
    inputRef.current?.focus();
  };

  const openModal = () => { setQuery(''); setOpen(true); setTimeout(() => inputRef.current?.focus(), 60); };

  const selectedLabels = selected
    .map((v) => localOptions.find((o) => o[valueKey] === v)?.[labelKey])
    .filter(Boolean);

  return (
    <>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
        <button
          type="button"
          onClick={openModal}
          className="w-full flex items-center justify-between px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-gray-300 transition-colors min-h-[44px]"
        >
          <span className="flex flex-wrap gap-1.5 flex-1 text-left">
            {selectedLabels.length === 0
              ? <span className="text-gray-400">Select {label.toLowerCase()}…</span>
              : selectedLabels.map((l) => (
                <span key={l} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">{l}</span>
              ))}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md flex flex-col shadow-xl"
            style={{ maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">Select {label}</h3>
                <button type="button" onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                  fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                  <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && query && !exactMatch) createNew(); }}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
              {selectedItems.length > 0 && (
                <>
                  <p className="px-3 pt-1 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">Selected</p>
                  {selectedItems.map((opt) => (
                    <button key={opt[valueKey]} type="button" onClick={() => toggle(opt[valueKey])}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors mb-0.5">
                      <span className="w-4 h-4 rounded border border-blue-500 bg-blue-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      {opt[labelKey]}
                    </button>
                  ))}
                  {unselectedItems.length > 0 && (
                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">All</p>
                  )}
                </>
              )}
              {unselectedItems.map((opt) => (
                <button key={opt[valueKey]} type="button" onClick={() => toggle(opt[valueKey])}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors mb-0.5">
                  <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center shrink-0" />
                  {opt[labelKey]}
                </button>
              ))}
              {query && !exactMatch && (
                <button type="button" onClick={createNew}
                  className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-xl text-sm text-gray-500 hover:text-blue-600 border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Create <span className="font-semibold ml-1">"{query}"</span>
                </button>
              )}
              {filtered.length === 0 && !query && (
                <p className="text-center text-sm text-gray-400 py-8">No options available</p>
              )}
              {filtered.length === 0 && query && (
                <p className="text-center text-sm text-gray-400 py-6">No matches — press Enter or click below to create</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {selected.length > 0
                  ? <><span className="font-semibold text-blue-600">{selected.length}</span> selected</>
                  : 'None selected'}
              </span>
              <div className="flex gap-2">
                {selected.length > 0 && (
                  <button type="button" onClick={() => onChange([])}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                    Clear all
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OptionRow — FIX #5 (radio behavior) + FIX #6 (memo)
// ─────────────────────────────────────────────────────────────────────────────
const OptionRow = memo(function OptionRow({ opt, index, onChange, onRemove, canRemove, onSelectCorrect }) {
  const letter = String.fromCharCode(65 + index);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${opt.isCorrect ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
          {letter}
        </span>
        <span className="text-sm font-semibold text-gray-600 flex-1">Option {letter}</span>
        {/* FIX #5 — radio (single correct) */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
          <input
            type="radio"
            name="correct-option"
            checked={opt.isCorrect}
            onChange={onSelectCorrect}
            className="w-3.5 h-3.5 accent-emerald-500"
          />
          Correct answer
        </label>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="grid md:grid-cols-2">
        <div className="p-4 border-r border-gray-100">
          <textarea
            value={opt.text}
            onChange={(e) => onChange({ ...opt, text: e.target.value })}
            placeholder={`Option ${letter} text or LaTeX…`}
            rows={2}
            className="w-full text-sm border-0 outline-none resize-none font-mono text-gray-800 placeholder-gray-300"
          />
          <ImageUploader images={opt.images || []} onChange={(imgs) => onChange({ ...opt, images: imgs })} />
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Preview</p>
          {(opt.images || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {opt.images.map((img, i) => (
                <figure key={i}>
                  <img src={img.url} alt={img.label} className="max-h-16 rounded border border-gray-200 object-contain" />
                  {img.label && <figcaption className="text-xs text-gray-400 italic">{img.label}</figcaption>}
                </figure>
              ))}
            </div>
          )}
          <LatexPreview text={opt.text} />
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SubQuestionEditor — FIX #6 (memo)
// ─────────────────────────────────────────────────────────────────────────────
const SubQuestionEditor = memo(function SubQuestionEditor({ sq, index, type, onChange, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  const addOption    = () => onChange({ ...sq, options: [...(sq.options || []), defaultOption()] });
  const removeOption = (i) => onChange({ ...sq, options: sq.options.filter((_, idx) => idx !== i) });
  const updateOption = (i, opt) => onChange({ ...sq, options: sq.options.map((o, idx) => idx === i ? opt : o) });
  // FIX #5 applied inside cluster sub-questions too
  const selectCorrect = (i) => onChange({
    ...sq,
    options: sq.options.map((o, idx) => ({ ...o, isCorrect: idx === i })),
  });

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
        <span className="text-sm font-semibold text-gray-700 flex-1">Sub-question {index + 1}</span>
        <button type="button" onClick={() => setCollapsed(!collapsed)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        <button type="button" onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {!collapsed && (
        <div className="p-4 space-y-4">
          <RichField
            label="Question Text" required
            value={sq.questionText || ''}
            onChange={(v) => onChange({ ...sq, questionText: v })}
            images={sq.questionImages || []}
            onImagesChange={(imgs) => onChange({ ...sq, questionImages: imgs })}
            placeholder="Sub-question text or LaTeX…"
          />
          {type === 'MCQ_CLUSTER' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Options <span className="text-red-500">*</span></label>
                <button type="button" onClick={addOption} disabled={(sq.options || []).length >= 10}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </button>
              </div>
              {(sq.options || []).map((opt, i) => (
                <OptionRow
                  key={i} opt={opt} index={i}
                  onChange={(o) => updateOption(i, o)}
                  onRemove={() => removeOption(i)}
                  canRemove={(sq.options || []).length > 2}
                  onSelectCorrect={() => selectCorrect(i)}
                />
              ))}
            </div>
          )}
          <RichField
            label="Answer / Explanation"
            value={sq.answerText || ''}
            onChange={(v) => onChange({ ...sq, answerText: v })}
            images={sq.answerImages || []}
            onImagesChange={(imgs) => onChange({ ...sq, answerImages: imgs })}
            placeholder="Answer explanation or LaTeX…"
          />
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// WrittenPartEditor — FIX #6 (memo)
// ─────────────────────────────────────────────────────────────────────────────
const WrittenPartEditor = memo(function WrittenPartEditor({ part, index, onChange, onRemove, canRemove }) {
  const [collapsed, setCollapsed] = useState(false);
  const partLabel = String.fromCharCode(97 + index);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
          {partLabel}
        </span>
        <span className="text-sm font-semibold text-gray-700 flex-1">Part ({partLabel})</span>
        <button type="button" onClick={() => setCollapsed(!collapsed)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="p-4 space-y-4">
          <RichField
            label="Question" required
            value={part.questionText || ''}
            onChange={(v) => onChange({ ...part, questionText: v })}
            images={part.questionImages || []}
            onImagesChange={(imgs) => onChange({ ...part, questionImages: imgs })}
            placeholder={`Part (${partLabel}) question text or LaTeX…`}
            rows={3}
          />
          <RichField
            label="Answer / Explanation"
            value={part.answerText || ''}
            onChange={(v) => onChange({ ...part, answerText: v })}
            images={part.answerImages || []}
            onImagesChange={(imgs) => onChange({ ...part, answerImages: imgs })}
            placeholder={`Model answer for part (${partLabel})…`}
            rows={3}
          />
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section card
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, children, accent = 'blue', action }) {
  const colors = { blue: 'border-l-blue-500', violet: 'border-l-violet-500', emerald: 'border-l-emerald-500', amber: 'border-l-amber-500' };
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl border-l-4 ${colors[accent]} shadow-sm`}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle
// ─────────────────────────────────────────────────────────────────────────────
function Toggle({ enabled, onToggle, label, description }) {
  return (
    <button type="button" onClick={onToggle}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
        enabled ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
      }`}>
      <div>
        <p className={`text-sm font-semibold ${enabled ? 'text-amber-700' : 'text-gray-600'}`}>{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ml-4 ${enabled ? 'bg-amber-500' : 'bg-gray-300'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FieldError
// ─────────────────────────────────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {msg}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function UploadQuestionPage() {
  const router = useRouter();

  // Location
  const [archives, setArchives]           = useState([]);
  const [chapters, setChapters]           = useState([]);
  const [topics, setTopics]               = useState([]);
  const [selectedArchive, setSelectedArchive] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic]     = useState('');

  // Metadata
  const [questionType, setQuestionType]           = useState('MCQ');
  const [difficulties, setDifficulties]           = useState([]);
  const [allTags, setAllTags]                     = useState([]);
  const [allSources, setAllSources]               = useState([]);
  const [allAcademicLevels, setAllAcademicLevels] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty]         = useState('');
  const [selectedTags, setSelectedTags]                     = useState([]);
  const [selectedSources, setSelectedSources]               = useState([]);
  const [selectedAcademicLevels, setSelectedAcademicLevels] = useState([]);

  // Stem
  const [stemEnabled, setStemEnabled] = useState(false);
  const [stemText, setStemText]       = useState('');
  const [stemImages, setStemImages]   = useState([]);

  // MCQ
  const [questionText, setQuestionText]   = useState('');
  const [questionImages, setQuestionImages] = useState([]);
  const [answerText, setAnswerText]       = useState('');
  const [answerImages, setAnswerImages]   = useState([]);
  // FIX #5 — radio: only one correct at a time
  const [options, setOptions] = useState([defaultOption(), defaultOption(), defaultOption(), defaultOption()]);

  // MCQ_CLUSTER
  const [subQuestions, setSubQuestions] = useState([defaultSubQ()]);

  // FIX #2 — WRITTEN: single source of truth, no writtenPartCount
  const [writtenParts, setWrittenParts] = useState([defaultWrittenPart()]);

  // Form state
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // ── Load initial data ──
  useEffect(() => {
    Promise.all([
      api.get('/archives'),
      api.get('/difficulties'),
      api.get('/tags'),
      api.get('/sources'),
      api.get('/academic-levels'),
    ]).then(([a, d, t, s, al]) => {
      setArchives(a.data);
      setDifficulties(d.data);
      setAllTags(t.data);
      setAllSources(s.data);
      setAllAcademicLevels(al.data);
    }).catch(console.error);
  }, []);

  // ── FIX #8 — Restore draft on mount ──
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    if (!window.confirm('A saved draft was found. Restore it?')) { clearDraft(); return; }
    setQuestionType(draft.questionType ?? 'MCQ');
    setSelectedDifficulty(draft.selectedDifficulty ?? '');
    setSelectedTags(draft.selectedTags ?? []);
    setSelectedSources(draft.selectedSources ?? []);
    setSelectedAcademicLevels(draft.selectedAcademicLevels ?? []);
    setStemEnabled(draft.stemEnabled ?? false);
    setStemText(draft.stemText ?? '');
    setStemImages(draft.stemImages ?? []);
    setQuestionText(draft.questionText ?? '');
    setQuestionImages(draft.questionImages ?? []);
    setAnswerText(draft.answerText ?? '');
    setAnswerImages(draft.answerImages ?? []);
    setOptions(draft.options ?? [defaultOption(), defaultOption(), defaultOption(), defaultOption()]);
    setSubQuestions(draft.subQuestions ?? [defaultSubQ()]);
    setWrittenParts(draft.writtenParts ?? [defaultWrittenPart()]);
    setDraftRestored(true);
  }, []);

  // ── FIX #8 — Auto-save draft whenever relevant state changes ──
  useEffect(() => {
    saveDraft({
      questionType, selectedDifficulty, selectedTags, selectedSources, selectedAcademicLevels,
      stemEnabled, stemText, stemImages,
      questionText, questionImages, answerText, answerImages,
      options, subQuestions, writtenParts,
    });
  }, [
    questionType, selectedDifficulty, selectedTags, selectedSources, selectedAcademicLevels,
    stemEnabled, stemText, stemImages,
    questionText, questionImages, answerText, answerImages,
    options, subQuestions, writtenParts,
  ]);

  useEffect(() => {
    if (!selectedArchive) { setChapters([]); setSelectedChapter(''); return; }
    api.get(`/chapters/archive/${selectedArchive}`).then((r) => setChapters(r.data)).catch(() => setChapters([]));
    setSelectedChapter('');
    setSelectedTopic('');
  }, [selectedArchive]);

  useEffect(() => {
    if (!selectedChapter) { setTopics([]); setSelectedTopic(''); return; }
    api.get(`/topics/chapter/${selectedChapter}`).then((r) => setTopics(r.data)).catch(() => setTopics([]));
    setSelectedTopic('');
  }, [selectedChapter]);

  // Reset content on type change (keep metadata)
  useEffect(() => {
    setSubQuestions([defaultSubQ()]);
    setOptions([defaultOption(), defaultOption(), defaultOption(), defaultOption()]);
    setWrittenParts([defaultWrittenPart()]);
    setStemEnabled(false);
    setStemText('');
    setStemImages([]);
    setQuestionText('');
    setQuestionImages([]);
    setAnswerText('');
    setAnswerImages([]);
  }, [questionType]);

  // ── FIX #2 — written parts: single source of truth helpers ──
  // Derived count — never stored separately
  const partCount = writtenParts.length;

  const setPartCount = useCallback((raw) => {
    const n = Math.max(1, Math.min(20, parseInt(raw) || 1));
    setWrittenParts((prev) =>
      Array.from({ length: n }, (_, i) => prev[i] ?? defaultWrittenPart())
    );
  }, []);

  const updateWrittenPart = useCallback((i, part) =>
    setWrittenParts((p) => p.map((x, idx) => idx === i ? part : x)), []);

  const removeWrittenPart = useCallback((i) =>
    setWrittenParts((p) => p.filter((_, idx) => idx !== i)), []);

  const addWrittenPart = useCallback(() =>
    setWrittenParts((p) => [...p, defaultWrittenPart()]), []);

  // ── Option helpers ──
  const addOption    = useCallback(() => setOptions((o) => [...o, defaultOption()]), []);
  const removeOption = useCallback((i) => setOptions((o) => o.filter((_, idx) => idx !== i)), []);
  const updateOption = useCallback((i, opt) => setOptions((o) => o.map((x, idx) => idx === i ? opt : x)), []);

  // FIX #5 — radio: mark only one correct
  const selectCorrectOption = useCallback((i) =>
    setOptions((prev) => prev.map((o, idx) => ({ ...o, isCorrect: idx === i }))), []);

  // ── Sub-question helpers ──
  const addSubQuestion    = useCallback(() => setSubQuestions((s) => [...s, defaultSubQ()]), []);
  const removeSubQuestion = useCallback((i) => setSubQuestions((s) => s.filter((_, idx) => idx !== i)), []);
  const updateSubQuestion = useCallback((i, sq) => setSubQuestions((s) => s.map((x, idx) => idx === i ? sq : x)), []);

  // ── FIX #1 — Validation (clean MCQ_CLUSTER stem rule) ──
  const validate = () => {
    const e = {};
    if (!selectedTopic) e.topic = 'Please select a topic';

    if (questionType === 'MCQ') {
      if (!questionText.trim()) e.questionText = 'Question text is required';
      if (options.length < 2)   e.options = 'At least 2 options required';
      if (!options.some((o) => o.isCorrect)) e.options = 'Mark the correct answer';
      options.forEach((o, i) => {
        if (!o.text.trim() && (!o.images || o.images.length === 0))
          e[`option_${i}`] = `Option ${String.fromCharCode(65 + i)}: text or image required`;
      });
    }

    if (questionType === 'MCQ_CLUSTER') {
      // FIX #1 — stem is always required for cluster; no stemEnabled check
      if (!stemText.trim() && stemImages.length === 0)
        e.stem = 'Stem is required for Cluster MCQ';
      if (subQuestions.length === 0) e.subQuestions = 'At least one sub-question required';
      subQuestions.forEach((sq, i) => {
        if (!sq.questionText?.trim())                   e[`sq_text_${i}`]    = `Sub-question ${i + 1}: text required`;
        if (!sq.options || sq.options.length < 2)       e[`sq_opts_${i}`]    = `Sub-question ${i + 1}: at least 2 options`;
        if (sq.options && !sq.options.some((o) => o.isCorrect)) e[`sq_correct_${i}`] = `Sub-question ${i + 1}: mark a correct answer`;
      });
    }

    if (questionType === 'WRITTEN') {
      const hasMain  = questionText.trim() || questionImages.length > 0;
      const hasParts = writtenParts.some((p) => p.questionText?.trim());
      if (!hasMain && !hasParts) e.questionText = 'Main question text or at least one part is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── FIX #7 — Submit with cleanPayload ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setSubmitting(true);
    try {
      const toStorable = (imgs) => imgs.map((img) => ({ url: img.key || img.url, label: img.label }));

      const payload = {
        topicId:        selectedTopic,
        type:           questionType,
        difficultyId:   selectedDifficulty || undefined,
        academicLevels: selectedAcademicLevels,
        tags:           selectedTags,
        sources:        selectedSources,
      };

      // Stem — included if has content (regardless of stemEnabled for MCQ_CLUSTER)
      if (stemText || stemImages.length > 0) {
        payload.stemText   = stemText || undefined;
        payload.stemImages = stemImages.length > 0 ? toStorable(stemImages) : undefined;
      }

      if (questionType === 'MCQ') {
        payload.questionText   = questionText;
        payload.questionImages = questionImages.length > 0 ? toStorable(questionImages) : undefined;
        payload.answerText     = answerText || undefined;
        payload.answerImages   = answerImages.length > 0 ? toStorable(answerImages) : undefined;
        payload.options        = options.map((o) => ({
          text:      o.text,
          images:    o.images.length > 0 ? toStorable(o.images) : undefined,
          isCorrect: o.isCorrect,
        }));
      }

      if (questionType === 'MCQ_CLUSTER') {
        payload.subQuestions = subQuestions.map((sq) => ({
          questionText:   sq.questionText,
          questionImages: sq.questionImages?.length > 0 ? toStorable(sq.questionImages) : undefined,
          options:        sq.options.map((o) => ({
            text:      o.text,
            images:    o.images?.length > 0 ? toStorable(o.images) : undefined,
            isCorrect: o.isCorrect,
          })),
          answerText:   sq.answerText || undefined,
          answerImages: sq.answerImages?.length > 0 ? toStorable(sq.answerImages) : undefined,
        }));
      }

      if (questionType === 'WRITTEN') {
        payload.questionText   = questionText || undefined;
        payload.questionImages = questionImages.length > 0 ? toStorable(questionImages) : undefined;
        payload.answerText     = answerText || undefined;
        payload.answerImages   = answerImages.length > 0 ? toStorable(answerImages) : undefined;
        if (writtenParts.some((p) => p.questionText?.trim())) {
          payload.subQuestions = writtenParts.map((p) => ({
            questionText:   p.questionText,
            questionImages: p.questionImages?.length > 0 ? toStorable(p.questionImages) : undefined,
            answerText:     p.answerText || undefined,
            answerImages:   p.answerImages?.length > 0 ? toStorable(p.answerImages) : undefined,
          }));
        }
      }

      // FIX #7 — strip all undefined/null before sending
      await api.post('/questions', cleanPayload(payload));
      clearDraft();
      setSuccess(true);
      setTimeout(() => router.push('/questions'), 1500);
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400 outline-none';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="py-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Question</h1>
        <p className="text-gray-500 text-sm mt-1">All text fields support LaTeX — use $…$ for inline, $$…$$ for display math</p>
        {draftRestored && (
          <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Draft restored — your previous work has been loaded
          </p>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">Question saved! Redirecting…</span>
        </div>
      )}

      {/* Global errors */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl">
          <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Please fix the following errors:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {Object.values(errors).map((msg, i) => (
              <li key={i} className="text-xs text-red-600">{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Location */}
        <Section title="1. Location" accent="blue">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Archive <span className="text-red-500">*</span></label>
              <select className={selectClass} value={selectedArchive} onChange={(e) => setSelectedArchive(e.target.value)}>
                <option value="">Select archive…</option>
                {archives.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Chapter <span className="text-red-500">*</span></label>
              <select className={selectClass} value={selectedChapter} onChange={(e) => setSelectedChapter(e.target.value)} disabled={!selectedArchive}>
                <option value="">Select chapter…</option>
                {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Topic <span className="text-red-500">*</span></label>
              <select className={selectClass} value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} disabled={!selectedChapter}>
                <option value="">Select topic…</option>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <FieldError msg={errors.topic} />
            </div>
          </div>
        </Section>

        {/* 2. Type & Metadata */}
        <Section title="2. Type & Metadata" accent="violet">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Question Type <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {[
                { value: 'MCQ',         label: 'MCQ',         desc: 'Single correct answer' },
                { value: 'MCQ_CLUSTER', label: 'Cluster MCQ', desc: 'Stem + multiple MCQs' },
                { value: 'WRITTEN',     label: 'Written',     desc: 'Descriptive / structured' },
              ].map((t) => (
                <button key={t.value} type="button" onClick={() => setQuestionType(t.value)}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    questionType === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <p className={`text-sm font-bold ${questionType === t.value ? 'text-blue-700' : 'text-gray-700'}`}>{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Difficulty</label>
              <select className={selectClass} value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
                <option value="">Select difficulty…</option>
                {difficulties.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <MultiSelect label="Academic Levels" options={allAcademicLevels} selected={selectedAcademicLevels} onChange={setSelectedAcademicLevels} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <MultiSelect label="Tags"    options={allTags}    selected={selectedTags}    onChange={setSelectedTags} />
            <MultiSelect label="Sources" options={allSources} selected={selectedSources} onChange={setSelectedSources} />
          </div>
        </Section>

        {/* 3. Stem */}
        <Section title="3. Stem" accent="amber">
          {/* FIX #1 — MCQ_CLUSTER: stem is mandatory, show a clear message instead of toggle */}
          {questionType === 'MCQ_CLUSTER' ? (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              A stem (shared passage / context) is <strong>required</strong> for Cluster MCQ questions.
            </div>
          ) : (
            <Toggle
              enabled={stemEnabled}
              onToggle={() => setStemEnabled((v) => !v)}
              label={stemEnabled ? 'Stem enabled' : 'Add a stem (shared passage / context)'}
              description={stemEnabled ? 'Toggle off to remove the stem' : 'Optional — provides shared context for the question'}
            />
          )}

          {/* Show stem editor when: MCQ_CLUSTER (always) or other types with toggle on */}
          {(questionType === 'MCQ_CLUSTER' || stemEnabled) && (
            <div className="mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <RichField
                label="Stem Text"
                required={questionType === 'MCQ_CLUSTER'}
                value={stemText}
                onChange={setStemText}
                images={stemImages}
                onImagesChange={setStemImages}
                placeholder="Common passage, diagram description, or context…"
                rows={4}
              />
              {errors.stem && <FieldError msg={errors.stem} />}
            </div>
          )}
        </Section>

        {/* 4–6. Question content (type-dependent) */}

        {/* MCQ */}
        {questionType === 'MCQ' && (
          <>
            <Section title="4. Question" accent="blue">
              <RichField
                label="Question Text" required
                value={questionText}
                onChange={setQuestionText}
                images={questionImages}
                onImagesChange={setQuestionImages}
                placeholder="Enter the question text or LaTeX…"
                rows={3}
              />
              {errors.questionText && <FieldError msg={errors.questionText} />}
            </Section>

            <Section title="5. Options" accent="emerald">
              <p className="text-xs text-gray-400 -mt-2">Add 2–10 options. Select the single correct answer.</p>
              <div className="space-y-4">
                {options.map((opt, i) => (
                  <OptionRow
                    key={i} opt={opt} index={i}
                    onChange={(o) => updateOption(i, o)}
                    onRemove={() => removeOption(i)}
                    canRemove={options.length > 2}
                    onSelectCorrect={() => selectCorrectOption(i)}
                  />
                ))}
              </div>
              {errors.options && <FieldError msg={errors.options} />}
              {options.length < 10 && (
                <button type="button" onClick={addOption}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl text-sm text-gray-500 hover:text-blue-600 w-full justify-center transition-colors mt-2">
                  <Plus className="w-4 h-4" /> Add Option
                </button>
              )}
            </Section>

            <Section title="6. Answer / Explanation" accent="emerald">
              <RichField
                label="Answer Explanation"
                value={answerText}
                onChange={setAnswerText}
                images={answerImages}
                onImagesChange={setAnswerImages}
                placeholder="Explain the correct answer, show working…"
                rows={3}
              />
            </Section>
          </>
        )}

        {/* MCQ_CLUSTER */}
        {questionType === 'MCQ_CLUSTER' && (
          <Section title="4. Sub-questions" accent="blue">
            <p className="text-xs text-gray-400 -mt-2">Each sub-question is a full MCQ based on the stem above.</p>
            <div className="space-y-4">
              {subQuestions.map((sq, i) => (
                <SubQuestionEditor
                  key={i} sq={sq} index={i} type="MCQ_CLUSTER"
                  onChange={(s) => updateSubQuestion(i, s)}
                  onRemove={() => removeSubQuestion(i)}
                />
              ))}
            </div>
            {errors.subQuestions && <FieldError msg={errors.subQuestions} />}
            <button type="button" onClick={addSubQuestion}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl text-sm text-gray-500 hover:text-blue-600 w-full justify-center transition-colors mt-2">
              <Plus className="w-4 h-4" /> Add Sub-question
            </button>
          </Section>
        )}

        {/* WRITTEN */}
        {questionType === 'WRITTEN' && (
          <>
            <Section title="4. Main Question" accent="blue">
              <p className="text-xs text-gray-400 -mt-2">For single-part questions. Leave blank if all content is in the parts below.</p>
              <RichField
                label="Question Text"
                value={questionText}
                onChange={setQuestionText}
                images={questionImages}
                onImagesChange={setQuestionImages}
                placeholder="Enter the question text or LaTeX…"
                rows={3}
              />
              {errors.questionText && <FieldError msg={errors.questionText} />}
            </Section>

            <Section title="5. Answer / Explanation" accent="emerald">
              <RichField
                label="Answer"
                value={answerText}
                onChange={setAnswerText}
                images={answerImages}
                onImagesChange={setAnswerImages}
                placeholder="Model answer or marking scheme…"
                rows={4}
              />
            </Section>

            {/* FIX #2 — partCount is derived from writtenParts.length */}
            <Section
              title="6. Parts"
              accent="amber"
              action={
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Number of parts</label>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setPartCount(partCount - 1)} disabled={partCount <= 1}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg leading-none">
                      −
                    </button>
                    <input
                      type="number" min={1} max={20} value={partCount}
                      onChange={(e) => setPartCount(e.target.value)}
                      className="w-10 text-center text-sm font-semibold text-gray-800 border-0 outline-none py-1 bg-white"
                    />
                    <button type="button" onClick={() => setPartCount(partCount + 1)} disabled={partCount >= 20}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg leading-none">
                      +
                    </button>
                  </div>
                </div>
              }
            >
              <p className="text-xs text-gray-400 -mt-2">
                Set how many parts (a, b, c…) this question has. Each part gets its own question and answer fields.
              </p>
              <div className="space-y-4">
                {writtenParts.map((part, i) => (
                  <WrittenPartEditor
                    key={i} part={part} index={i}
                    onChange={(p) => updateWrittenPart(i, p)}
                    onRemove={() => removeWrittenPart(i)}
                    canRemove={writtenParts.length > 1}
                  />
                ))}
              </div>
              <button type="button" onClick={addWrittenPart}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 hover:border-amber-400 rounded-xl text-sm text-gray-500 hover:text-amber-600 w-full justify-center transition-colors mt-2">
                <Plus className="w-4 h-4" /> Add Part
              </button>
            </Section>
          </>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button type="button" onClick={() => router.back()}
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting || success}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 text-sm font-semibold transition-all shadow-sm">
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            ) : success ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : (
              'Save Question'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}