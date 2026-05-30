'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import {
  Search, FileQuestion, Edit, Copy,
  MoveRight, ChevronLeft, ChevronRight, X,
  ChevronDown, ChevronUp, Filter, MapPin,
  User, Clock, Check, Calendar, Video, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

// ─── KaTeX loader ─────────────────────────────────────────────────────────────
let katexLoaded = false;
let katexLoadPromise = null;

const loadKaTeX = () => {
  if (katexLoaded) return Promise.resolve();
  if (katexLoadPromise) return katexLoadPromise;

  katexLoadPromise = new Promise((resolve) => {
    if (document.getElementById('katex-css')) {
      katexLoaded = true;
      resolve();
      return;
    }

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
      s2.onload = () => {
        katexLoaded = true;
        resolve();
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });

  return katexLoadPromise;
};

function MathText({ text, className = '' }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(katexLoaded);

  useEffect(() => {
    loadKaTeX().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || !text) return;

    ref.current.innerHTML = text;

    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(ref.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        });
      }
    } catch {}
  }, [ready, text]);

  if (!text) return null;
  return <span ref={ref} className={className} />;
}

function MathPreview({ text }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(katexLoaded);

  useEffect(() => {
    loadKaTeX().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || !text) return;

    ref.current.innerHTML = text;

    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(ref.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true },
          ],
          throwOnError: false,
        });
      }
    } catch {}
  }, [ready, text]);

  if (!text?.trim()) return null;

  return (
    <div
      ref={ref}
      className="text-sm text-gray-700 leading-relaxed line-clamp-2 [&_.katex-display]:my-0.5 [&_.katex-display]:text-sm"
    />
  );
}

// ─── Safe helpers ─────────────────────────────────────────────────────────────
const safeParse = (value, fallback = null) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const splitCSV = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const firstValue = (...values) =>
  values.find((v) => v !== undefined && v !== null && v !== '');

// ─── Normalize source-year display from many possible backend shapes ──────────
function normalizeQuestionSources(question) {
  const direct = safeParse(
    question.sources ||
      question.question_sources ||
      question.source_years ||
      question.sourceYears ||
      question.sources_with_years,
    null
  );

  let rows = [];

  if (Array.isArray(direct)) {
    rows = direct;
  } else if (direct && typeof direct === 'object') {
    rows = [direct];
  } else {
    const sourceIds = splitCSV(question.source_ids || question.source_id);

    const sourceNames = splitCSV(
      question.source_labels ||
        question.source_names ||
        question.sources_name ||
        question.source_name ||
        question.source ||
        question.sourceName
    );

    const yearIds = splitCSV(question.year_ids || question.year_id);

    const yearValues = splitCSV(
      question.year_values ||
        question.years ||
        question.year_name ||
        question.year_value ||
        question.year
    );

    rows = sourceNames.map((name, index) => ({
      sourceId: sourceIds[index] || null,
      sourceName: name,
      yearId: yearIds[index] || null,
      yearValue: yearValues[index] || yearValues[0] || null,
    }));
  }

  const normalized = rows
    .map((row) => {
      if (typeof row === 'string' || typeof row === 'number') {
        return {
          sourceName: String(row),
          yearValue: '',
          displayName: String(row),
        };
      }

      const sourceName = firstValue(
        row.sourceName,
        row.source_name,
        row.name,
        row.source,
        row.source_title
      );

      const yearValue = firstValue(
        row.yearValue,
        row.year_value,
        row.year,
        row.value,
        row.yearName,
        row.year_name
      );

      const explicitLabel = firstValue(
        row.sourceLabel,
        row.source_label,
        row.displayName,
        row.display_name,
        row.source_label
      );

      const displayName =
        explicitLabel ||
        (sourceName ? `${sourceName}${yearValue ? ` (${yearValue})` : ''}` : '');

      return {
        sourceId: firstValue(row.sourceId, row.source_id, row.id),
        yearId: firstValue(row.yearId, row.year_id),
        sourceName: sourceName ? String(sourceName) : '',
        yearValue: yearValue ? String(yearValue) : '',
        displayName: displayName ? String(displayName) : '',
      };
    })
    .filter((row) => row.displayName || row.sourceName);

  const seen = new Set();

  return normalized.filter((row) => {
    const key = `${row.sourceId || row.sourceName}|${row.yearId || row.yearValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getQuestionMaxYear(question) {
  const fromPairs = normalizeQuestionSources(question)
    .map((s) => parseInt(s.yearValue, 10))
    .filter((n) => !Number.isNaN(n));

  const fromFlat = splitCSV(
    question.year_values || question.years || question.year_value || question.year
  )
    .map((y) => parseInt(y, 10))
    .filter((n) => !Number.isNaN(n));

  const all = [...fromPairs, ...fromFlat];

  return all.length ? Math.max(...all) : 0;
}

function normalizeVideoLinks(question) {
  const raw = safeParse(question.video_links || question.videoLinks || question.videos, []);

  if (!Array.isArray(raw)) return [];

  return raw
    .map((v) => {
      if (typeof v === 'string') {
        return { url: v, label: '', platform: '' };
      }

      return {
        url: v.url || v.link || '',
        label: v.label || v.title || '',
        platform: v.platform || '',
      };
    })
    .filter((v) => v.url);
}

function sortQuestionsClient(list, sortBy) {
  const arr = [...list];

  const time = (q, key) => {
    if (!q[key]) return 0;
    return new Date(q[key]).getTime() || 0;
  };

  const sourceText = (q) =>
    normalizeQuestionSources(q)
      .map((s) => s.displayName)
      .join(' ')
      .toLowerCase();

  const unitText = (q) => {
  const raw = safeParse(q.units, []);
  if (!Array.isArray(raw)) return '';

  return raw
    .map((u) => u.name || u.unit_name || '')
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

  switch (sortBy) {
    case 'oldest':
      return arr.sort((a, b) => time(a, 'created_at') - time(b, 'created_at'));

    case 'updated_desc':
      return arr.sort((a, b) => time(b, 'updated_at') - time(a, 'updated_at'));

    case 'updated_asc':
      return arr.sort((a, b) => time(a, 'updated_at') - time(b, 'updated_at'));

    case 'year_desc':
      return arr.sort((a, b) => getQuestionMaxYear(b) - getQuestionMaxYear(a));

    case 'year_asc':
      return arr.sort((a, b) => getQuestionMaxYear(a) - getQuestionMaxYear(b));

    case 'source_az':
      return arr.sort((a, b) => sourceText(a).localeCompare(sourceText(b)));

    case 'source_za':
      return arr.sort((a, b) => sourceText(b).localeCompare(sourceText(a)));

    case 'unit_az':
      return arr.sort((a, b) => unitText(a).localeCompare(unitText(b)));

    case 'unit_za':
      return arr.sort((a, b) => unitText(b).localeCompare(unitText(a)));

    case 'newest':
    default:
      return arr.sort((a, b) => time(b, 'created_at') - time(a, 'created_at'));
  }
}

// ─── Presigned URL cache ──────────────────────────────────────────────────────
const presignCache = new Map();

async function getDisplayUrl(urlOrKey) {
  if (!urlOrKey) return null;
  if (urlOrKey.startsWith('http')) return urlOrKey;

  if (presignCache.has(urlOrKey)) return presignCache.get(urlOrKey);

  try {
    const res = await api.get('/upload/presign', {
      params: { key: urlOrKey },
    });

    presignCache.set(urlOrKey, res.data.url);
    return res.data.url;
  } catch {
    return null;
  }
}

function ImageBlock({ images }) {
  const [resolved, setResolved] = useState([]);

  const raw = (() => {
    if (!images) return [];
    if (typeof images === 'string') {
      try {
        return JSON.parse(images);
      } catch {
        return [];
      }
    }
    return images;
  })();

  const rawStr = JSON.stringify(raw);

  useEffect(() => {
    if (!raw || raw.length === 0) {
      setResolved([]);
      return;
    }

    Promise.all(
      raw.map(async (img) => ({
        ...img,
        displayUrl: await getDisplayUrl(img.url),
      }))
    ).then(setResolved);
  }, [rawStr]);

  if (!resolved.length) return null;

  return (
    <div className="flex flex-wrap gap-3 my-2">
      {resolved.map((img, i) =>
        img.displayUrl ? (
          <figure key={i} className="flex flex-col items-center">
            <img
              src={img.displayUrl}
              alt={img.label || `Image ${i + 1}`}
              className="max-h-40 rounded-lg border border-gray-200 object-contain bg-gray-50"
            />
            {img.label && (
              <figcaption className="text-xs text-gray-500 mt-1 italic">
                {img.label}
              </figcaption>
            )}
          </figure>
        ) : null
      )}
    </div>
  );
}

function TypeBadge({ type }) {
  const map = {
    MCQ: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    MCQ_CLUSTER: 'bg-blue-100 text-blue-800 border border-blue-200',
    WRITTEN: 'bg-amber-100 text-amber-800 border border-amber-200',
  };

  const label = {
    MCQ: 'MCQ',
    MCQ_CLUSTER: 'Cluster',
    WRITTEN: 'Written',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
        map[type] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {label[type] || type}
    </span>
  );
}

function DiffBadge({ name }) {
  if (!name) return null;

  const map = {
    Easy: 'bg-green-50 text-green-700 border border-green-200',
    Medium: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    Hard: 'bg-red-50 text-red-700 border border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
        map[name] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {name}
    </span>
  );
}

function SourceYearBadges({ question }) {
  const pairs = normalizeQuestionSources(question);

  if (!pairs.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {pairs.map((item, i) => (
        <span
          key={`${item.sourceId || item.sourceName}-${item.yearId || item.yearValue}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 text-xs font-medium"
        >
          <Calendar className="w-3 h-3" />
          {item.displayName}
        </span>
      ))}
    </div>
  );
}

function VideoLinksBlock({ question }) {
  const links = normalizeVideoLinks(question);

  if (!links.length) return null;

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Video className="w-3.5 h-3.5" />
        Video Links
      </p>

      <div className="space-y-2">
        {links.map((video, i) => (
          <a
            key={`${video.url}-${i}`}
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 px-3 py-2 bg-white border border-violet-100 rounded-lg text-sm text-violet-700 hover:text-violet-900 hover:border-violet-300 transition-colors"
          >
            <span className="min-w-0 truncate">
              {video.label || video.platform || `Video ${i + 1}`}
            </span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Multi-select filter modal ────────────────────────────────────────────────
function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  valueKey = 'id',
  labelKey = 'name',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery('');
  }, [open]);

  const toggle = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const filtered = options.filter((o) =>
    String(o[labelKey] || '')
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const selectedItems = filtered.filter((o) => selected.includes(o[valueKey]));
  const unselectedItems = filtered.filter((o) => !selected.includes(o[valueKey]));

  const selectedLabels = selected
    .map((v) => options.find((o) => o[valueKey] === v)?.[labelKey])
    .filter(Boolean);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full min-w-0 flex items-center justify-between px-2.5 py-2 border rounded-xl text-xs sm:text-sm transition-colors ${
          selected.length > 0
            ? 'border-blue-400 bg-blue-50 text-blue-800'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
        }`}
      >
        <span className="truncate text-left flex-1">
          {selectedLabels.length === 0
            ? `All ${label}`
            : selectedLabels.length === 1
              ? selectedLabels[0]
              : `${selectedLabels.length} ${label} selected`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-1" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 w-full max-w-sm flex flex-col shadow-2xl"
            style={{ maxHeight: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-800">
                  Filter by {label}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {selectedItems.length > 0 && (
                <>
                  <p className="px-3 pt-1 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Selected
                  </p>

                  {selectedItems.map((opt) => (
                    <button
                      key={opt[valueKey]}
                      type="button"
                      onClick={() => toggle(opt[valueKey])}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors mb-0.5"
                    >
                      <span className="w-4 h-4 rounded border border-blue-500 bg-blue-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      {opt[labelKey]}
                    </button>
                  ))}

                  {unselectedItems.length > 0 && (
                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      All
                    </p>
                  )}
                </>
              )}

              {unselectedItems.map((opt) => (
                <button
                  key={opt[valueKey]}
                  type="button"
                  onClick={() => toggle(opt[valueKey])}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors mb-0.5"
                >
                  <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center shrink-0" />
                  {opt[labelKey]}
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-8">
                  No matches found
                </p>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {selected.length > 0 ? (
                  <>
                    <span className="font-semibold text-blue-600">
                      {selected.length}
                    </span>{' '}
                    selected
                  </>
                ) : (
                  'None selected'
                )}
              </span>

              <div className="flex gap-2">
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Clear all
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
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

// ─── Year range picker ────────────────────────────────────────────────────────
function YearRangePicker({ yearFrom, yearTo, onChange, yearOptions }) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={yearFrom}
        onChange={(e) => onChange(e.target.value, yearTo)}
        className={`flex-1 min-w-0 px-2 py-2 border rounded-xl text-xs sm:text-sm outline-none transition-colors ${
          yearFrom
            ? 'border-blue-400 bg-blue-50 text-blue-800'
            : 'border-gray-200 bg-white text-gray-600'
        }`}
      >
        <option value="">From</option>
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <span className="text-gray-400 text-xs shrink-0">–</span>

      <select
        value={yearTo}
        onChange={(e) => onChange(yearFrom, e.target.value)}
        className={`flex-1 min-w-0 px-2 py-2 border rounded-xl text-xs sm:text-sm outline-none transition-colors ${
          yearTo
            ? 'border-blue-400 bg-blue-50 text-blue-800'
            : 'border-gray-200 bg-white text-gray-600'
        }`}
      >
        <option value="">To</option>
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Full question renderer ───────────────────────────────────────────────────
function QuestionFull({ question }) {
  const options = safeParse(question.options, null);
  const subQuestions = safeParse(question.sub_questions, null);

  return (
    <div className="mt-4 space-y-4 text-sm leading-relaxed">
      {(question.stem_text || question.stem_images) && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Stem
          </p>
          <ImageBlock images={question.stem_images} />
          {question.stem_text && (
            <MathText text={question.stem_text} className="text-slate-800 text-sm" />
          )}
        </div>
      )}

      {question.type !== 'MCQ_CLUSTER' && question.question_text && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Question
          </p>
          <ImageBlock images={question.question_images} />
          <MathText text={question.question_text} className="text-gray-900" />
        </div>
      )}

      {question.type === 'MCQ' && options && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Options
          </p>

          <div className="space-y-2">
            {options.map((opt, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  opt.isCorrect
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-white border-gray-200'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    opt.isCorrect
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>

                <div className="flex-1">
                  <ImageBlock images={opt.images} />
                  {opt.text && (
                    <MathText
                      text={opt.text}
                      className={
                        opt.isCorrect
                          ? 'text-emerald-900 font-medium'
                          : 'text-gray-700'
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {question.type === 'MCQ_CLUSTER' && subQuestions && (
        <div className="space-y-4">
          {subQuestions.map((sq, i) => (
            <div
              key={i}
              className="border border-blue-100 rounded-xl p-4 bg-blue-50/40"
            >
              <p className="text-xs font-semibold text-blue-600 mb-2">
                Sub-question {i + 1}
              </p>

              <ImageBlock images={sq.questionImages} />

              {sq.questionText && (
                <MathText
                  text={sq.questionText}
                  className="text-gray-900 mb-3 block"
                />
              )}

              {(sq.options || []).length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {sq.options.map((opt, j) => (
                    <div
                      key={j}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-sm ${
                        opt.isCorrect
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          opt.isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {String.fromCharCode(65 + j)}
                      </span>

                      <div>
                        <ImageBlock images={opt.images} />
                        {opt.text && <MathText text={opt.text} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(sq.answerText || sq.answerImages) && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-semibold text-blue-500 mb-1">
                    Answer
                  </p>
                  <ImageBlock images={sq.answerImages} />
                  {sq.answerText && (
                    <MathText text={sq.answerText} className="text-gray-700" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {question.type === 'WRITTEN' && subQuestions && subQuestions.length > 0 && (
        <div className="space-y-3">
          {subQuestions.map((sq, i) => (
            <div
              key={i}
              className="border border-amber-100 rounded-xl p-4 bg-amber-50/40"
            >
              <p className="text-xs font-semibold text-amber-600 mb-2">
                Part {i + 1}
              </p>

              <ImageBlock images={sq.questionImages} />

              {sq.questionText && (
                <MathText
                  text={sq.questionText}
                  className="text-gray-900 block mb-2"
                />
              )}

              {(sq.answerText || sq.answerImages) && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <p className="text-xs font-semibold text-amber-500 mb-1">
                    Answer
                  </p>
                  <ImageBlock images={sq.answerImages} />
                  {sq.answerText && (
                    <MathText text={sq.answerText} className="text-gray-700" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {question.type !== 'MCQ_CLUSTER' &&
        (question.answer_text || question.answer_images) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">
              Answer / Explanation
            </p>
            <ImageBlock images={question.answer_images} />
            {question.answer_text && (
              <MathText text={question.answer_text} className="text-emerald-900" />
            )}
          </div>
        )}

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-2">
          Sources
        </p>
        <SourceYearBadges question={question} />
      </div>

      <VideoLinksBlock question={question} />

      <div className="pt-3 mt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
        {(question.created_by_fullname || question.created_by_name) && (
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Uploaded by{' '}
            <span className="font-semibold text-gray-600">
              {question.created_by_fullname || question.created_by_name}
            </span>
            {question.created_at && (
              <>
                {' '}
                on{' '}
                {new Date(question.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </>
            )}
          </span>
        )}

        {(question.edited_by_fullname || question.edited_by_name) &&
          question.updated_at !== question.created_at && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Edited by{' '}
              <span className="font-semibold text-gray-600">
                {question.edited_by_fullname || question.edited_by_name}
              </span>
              {question.updated_at && (
                <>
                  {' '}
                  on{' '}
                  {new Date(question.updated_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </>
              )}
            </span>
          )}
      </div>
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────
function QuestionCard({ question, onCopy, onMove, index }) {
  const [expanded, setExpanded] = useState(false);

  const previewText = question.question_text || question.stem_text || '';
  const uploaderName = question.created_by_fullname || question.created_by_name;
  const editorName = question.edited_by_fullname || question.edited_by_name;

  return (
    <div
      className={`bg-white border rounded-2xl transition-all duration-200 ${
        expanded
          ? 'border-blue-300 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-7 h-7 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center mt-0.5">
            {index}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <TypeBadge type={question.type} />
              <DiffBadge name={question.difficulty_name} />
            </div>

            <div className="flex items-center gap-1 mb-2 flex-wrap">
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />

              {question.archive_name && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                  {question.archive_name}
                </span>
              )}

              {question.chapter_name && (
                <>
                  <span className="text-gray-300 text-xs">›</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                    {question.chapter_name}
                  </span>
                </>
              )}

              {question.topic_name && (
                <>
                  <span className="text-gray-300 text-xs">›</span>
                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-medium">
                    {question.topic_name}
                  </span>
                </>
              )}
            </div>

            <div className="text-sm text-gray-700 leading-relaxed mb-2">
              {previewText ? (
                <MathPreview text={previewText.slice(0, 300)} />
              ) : (
                <span className="italic text-gray-400 text-sm">
                  No preview available
                </span>
              )}
            </div>

            <SourceYearBadges question={question} />

            <div className="flex flex-wrap items-center gap-3 mt-2">
              {uploaderName && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <User className="w-3 h-3" />
                  <span className="font-medium text-gray-600">
                    {uploaderName}
                  </span>
                  {question.created_at && (
                    <span className="text-gray-400">
                      ·{' '}
                      {new Date(question.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </span>
              )}

              {editorName && editorName !== uploaderName && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  edited by{' '}
                  <span className="font-medium text-gray-500">{editorName}</span>
                  {question.updated_at && (
                    <span>
                      ·{' '}
                      {new Date(question.updated_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Link
              href={`/questions/${question.id}/edit`}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </Link>

            <button
              onClick={() => onCopy(question)}
              className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={() => onMove(question)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Move"
            >
              <MoveRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setExpanded(!expanded)}
              className={`p-2 rounded-lg transition-colors ${
                expanded
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5">
          <QuestionFull question={question} />
        </div>
      )}
    </div>
  );
}

// ─── Topic picker modal ───────────────────────────────────────────────────────
function TopicPickerModal({ title, onConfirm, onClose }) {
  const [archives, setArchives] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selArchive, setSelArchive] = useState('');
  const [selChapter, setSelChapter] = useState('');
  const [selTopic, setSelTopic] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/archives').then((r) => setArchives(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selArchive) {
      setChapters([]);
      setSelChapter('');
      return;
    }

    api
      .get(`/chapters/archive/${selArchive}`)
      .then((r) => setChapters(r.data))
      .catch(() => {});

    setSelChapter('');
    setSelTopic('');
  }, [selArchive]);

  useEffect(() => {
    if (!selChapter) {
      setTopics([]);
      setSelTopic('');
      return;
    }

    api
      .get(`/topics/chapter/${selChapter}`)
      .then((r) => setTopics(r.data))
      .catch(() => {});

    setSelTopic('');
  }, [selChapter]);

  const sel =
    'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400 outline-none';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {[
            {
              label: 'Archive',
              val: selArchive,
              set: setSelArchive,
              opts: archives,
              disabled: false,
            },
            {
              label: 'Chapter',
              val: selChapter,
              set: setSelChapter,
              opts: chapters,
              disabled: !selArchive,
            },
            {
              label: 'Topic',
              val: selTopic,
              set: setSelTopic,
              opts: topics,
              disabled: !selChapter,
            },
          ].map(({ label, val, set, opts, disabled }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                {label}
              </label>

              <select
                className={sel}
                value={val}
                onChange={(e) => set(e.target.value)}
                disabled={disabled}
              >
                <option value="">Select {label.toLowerCase()}…</option>
                {opts.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              if (!selTopic) return;
              setLoading(true);
              await onConfirm(selTopic);
              setLoading(false);
            }}
            disabled={!selTopic || loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Working…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function PaginationBar({ pagination, onChange }) {
  const { page, totalPages, total, limit } = pagination;

  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) pages.push(i);

  const btn = 'w-9 h-9 rounded-xl text-sm border transition-colors';

  return (
    <div className="flex items-center justify-between mt-8 bg-white border border-gray-200 rounded-2xl px-6 py-4 flex-wrap gap-3">
      <p className="text-sm text-gray-500">
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {start > 1 && (
          <>
            <button
              onClick={() => onChange(1)}
              className={`${btn} border-gray-200 hover:bg-gray-50 text-gray-700`}
            >
              1
            </button>
            {start > 2 && <span className="px-1 text-gray-400 text-sm">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`${btn} ${
              p === page
                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span className="px-1 text-gray-400 text-sm">…</span>
            )}

            <button
              onClick={() => onChange(totalPages)}
              className={`${btn} border-gray-200 hover:bg-gray-50 text-gray-700`}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AllQuestionsPage() {
  const [questions, setQuestions] = useState([]);

  const [archives, setArchives] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);

  const [difficulties, setDifficulties] = useState([]);
  const [tags, setTags] = useState([]);
  const [units, setUnits] = useState([]);
  const [sources, setSources] = useState([]);
  const [years, setYears] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

const [filters, setFilters] = useState({
  keyword: '',
  archiveId: '',
  chapterId: '',
  topicId: '',
  type: '',
  difficultyId: '',
  tagIds: [],
  unitIds: [],
  sourceIds: [],
  yearIds: [],
  yearFrom: '',
  yearTo: '',
  sortBy: 'newest',
});

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [copyModal, setCopyModal] = useState(null);
  const [moveModal, setMoveModal] = useState(null);

  const keywordTimer = useRef(null);

  const handleKeyword = (val) => {
    clearTimeout(keywordTimer.current);

    keywordTimer.current = setTimeout(() => {
      setFilters((f) => ({ ...f, keyword: val }));
      setPagination((p) => ({ ...p, page: 1 }));
    }, 400);
  };

  useEffect(() => {
    Promise.all([
  api.get('/archives'),
  api.get('/difficulties'),
  api.get('/tags'),
  api.get('/units'),
  api.get('/sources'),
  api.get('/years'),
])
  .then(([a, d, t, u, s, y]) => {
    setArchives(a.data || []);
    setDifficulties(d.data || []);
    setTags(t.data || []);
    setUnits(u.data || []);
    setSources(s.data || []);
    setYears(y.data || []);
  })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (filters.archiveId) {
      api
        .get(`/chapters/archive/${filters.archiveId}`)
        .then((r) => setChapters(r.data || []))
        .catch(() => setChapters([]));
    } else {
      setChapters([]);
      setFilters((f) => ({ ...f, chapterId: '', topicId: '' }));
    }
  }, [filters.archiveId]);

  useEffect(() => {
    if (filters.chapterId) {
      api
        .get(`/topics/chapter/${filters.chapterId}`)
        .then((r) => setTopics(r.data || []))
        .catch(() => setTopics([]));
    } else {
      setTopics([]);
      setFilters((f) => ({ ...f, topicId: '' }));
    }
  }, [filters.chapterId]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.archiveId) params.archiveId = filters.archiveId;
      if (filters.chapterId) params.chapterId = filters.chapterId;
      if (filters.topicId) params.topicId = filters.topicId;
      if (filters.type) params.type = filters.type;
      if (filters.difficultyId) params.difficultyId = filters.difficultyId;

      if (filters.tagIds.length > 0) {
        params.tagIds = filters.tagIds.join(',');
      }

      if (filters.unitIds.length > 0) {
  params.unitIds = filters.unitIds.join(',');
}

      if (filters.sourceIds.length > 0) {
        params.sourceIds = filters.sourceIds.join(',');
      }

      if (filters.yearIds.length > 0) {
        params.yearIds = filters.yearIds.join(',');
      }

      if (filters.yearFrom) params.yearFrom = filters.yearFrom;
      if (filters.yearTo) params.yearTo = filters.yearTo;

      if (filters.sortBy && filters.sortBy !== 'newest') {
        params.sortBy = filters.sortBy;
      }

      const res = await api.get('/questions', { params });

      const rawQuestions = res.data.questions || [];
      const sortedQuestions = sortQuestionsClient(rawQuestions, filters.sortBy);

      setQuestions(sortedQuestions);

      setPagination((p) => ({
        ...p,
        total: res.data.pagination?.total || rawQuestions.length,
        totalPages: res.data.pagination?.totalPages || 1,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleCopy = async (targetTopicId) => {
    try {
      await api.post(`/questions/${copyModal.id}/copy`, { targetTopicId });
    } catch {
      alert('Copy failed');
    }

    setCopyModal(null);
    fetchQuestions();
  };

  const handleMove = async (targetTopicId) => {
    try {
      await api.put(`/questions/${moveModal.id}/move`, { targetTopicId });
    } catch {
      alert('Move failed');
    }

    setMoveModal(null);
    fetchQuestions();
  };

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      keyword: '',
      archiveId: '',
      chapterId: '',
      topicId: '',
      type: '',
      difficultyId: '',
      tagIds: [],
      unitIds: [],
      sourceIds: [],
      yearIds: [],
      yearFrom: '',
      yearTo: '',
      sortBy: 'newest',
    });

    setPagination((p) => ({ ...p, page: 1 }));
  };

  const activeFilterCount =
    [
      filters.keyword,
      filters.archiveId,
      filters.chapterId,
      filters.topicId,
      filters.type,
      filters.difficultyId,
      filters.yearFrom,
      filters.yearTo,
      filters.sortBy && filters.sortBy !== 'newest' ? filters.sortBy : '',
    ].filter(Boolean).length +
filters.tagIds.length +
filters.unitIds.length +
filters.sourceIds.length +
filters.yearIds.length;

  const yearOptions = [
    ...new Set(
      [
        ...years.map((y) => y.value ?? y.year ?? y.name),
        ...sources.filter((s) => s.year).map((s) => s.year),
      ].filter(Boolean)
    ),
  ].sort((a, b) => Number(b) - Number(a));

  const yearFilterOptions =
    years.length > 0
      ? years
          .map((y) => ({
            id: y.id,
            value: String(y.value ?? y.year ?? y.name),
          }))
          .sort((a, b) => Number(b.value) - Number(a.value))
      : yearOptions.map((y) => ({
        id: String(y),
        value: String(y),
      }));

  const selClass =
  'w-full min-w-0 px-2.5 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 outline-none';

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between py-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Questions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pagination.total > 0
              ? `${pagination.total} questions total`
              : 'Browse all questions'}
          </p>
        </div>

        <Link
          href="/upload"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors"
        >
          + New Question
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-6">
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

            <input
              type="text"
              placeholder="Search questions, stems, answers…"
              defaultValue={filters.keyword}
              onChange={(e) => handleKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors whitespace-nowrap ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <select
                className={selClass}
                value={filters.archiveId}
                onChange={(e) => setFilter('archiveId', e.target.value)}
              >
                <option value="">All Archives</option>
                {archives.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <select
                className={selClass}
                value={filters.chapterId}
                onChange={(e) => setFilter('chapterId', e.target.value)}
                disabled={!filters.archiveId}
              >
                <option value="">All Chapters</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className={selClass}
                value={filters.topicId}
                onChange={(e) => setFilter('topicId', e.target.value)}
                disabled={!filters.chapterId}
              >
                <option value="">All Topics</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                className={selClass}
                value={filters.type}
                onChange={(e) => setFilter('type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="MCQ_CLUSTER">Cluster</option>
                <option value="WRITTEN">Written</option>
              </select>

              <select
                className={selClass}
                value={filters.difficultyId}
                onChange={(e) => setFilter('difficultyId', e.target.value)}
              >
                <option value="">All Difficulties</option>
                {difficulties.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                className={selClass}
                value={filters.sortBy}
                onChange={(e) => setFilter('sortBy', e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="updated_desc">Recently edited</option>
                <option value="updated_asc">Least recently edited</option>
                <option value="year_desc">Year high → low</option>
                <option value="year_asc">Year low → high</option>
                <option value="source_az">Source A → Z</option>
                <option value="source_za">Source Z → A</option>
                <option value="unit_az">Unit A → Z</option>
                <option value="unit_za">Unit Z → A</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              <MultiSelectFilter
  label="Tags"
  options={tags}
  selected={filters.tagIds}
  onChange={(v) => setFilter('tagIds', v)}
/>

<MultiSelectFilter
  label="Units"
  options={units}
  selected={filters.unitIds}
  onChange={(v) => setFilter('unitIds', v)}
/>

<MultiSelectFilter
  label="Sources"
  options={sources}
  selected={filters.sourceIds}
  onChange={(v) => setFilter('sourceIds', v)}
/>

              <MultiSelectFilter
                label="Years"
                options={yearFilterOptions}
                selected={filters.yearIds}
                onChange={(v) => setFilter('yearIds', v)}
                labelKey="value"
              />

              <YearRangePicker
                yearFrom={filters.yearFrom}
                yearTo={filters.yearTo}
                onChange={(from, to) => {
                  setFilters((f) => ({
                    ...f,
                    yearFrom: from,
                    yearTo: to,
                  }));

                  setPagination((p) => ({
                    ...p,
                    page: 1,
                  }));
                }}
                yearOptions={yearOptions}
              />
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-200 shrink-0" />

                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-gray-200 rounded-md" />
                    <div className="h-5 w-12 bg-gray-200 rounded-md" />
                  </div>

                  <div className="flex gap-1">
                    <div className="h-4 w-20 bg-gray-200 rounded-md" />
                    <div className="h-4 w-24 bg-gray-200 rounded-md" />
                    <div className="h-4 w-16 bg-gray-200 rounded-md" />
                  </div>

                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <FileQuestion className="w-8 h-8 text-gray-400" />
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            No questions found
          </h3>

          <p className="text-gray-500 text-sm">
            Try adjusting your filters or create a new question
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={(pagination.page - 1) * pagination.limit + i + 1}
              onCopy={(question) => setCopyModal(question)}
              onMove={(question) => setMoveModal(question)}
            />
          ))}
        </div>
      )}

      <PaginationBar
        pagination={pagination}
        onChange={(p) =>
          setPagination((prev) => ({
            ...prev,
            page: p,
          }))
        }
      />

      {copyModal && (
        <TopicPickerModal
          title="Copy question to…"
          onConfirm={handleCopy}
          onClose={() => setCopyModal(null)}
        />
      )}

      {moveModal && (
        <TopicPickerModal
          title="Move question to…"
          onConfirm={handleMove}
          onClose={() => setMoveModal(null)}
        />
      )}
    </div>
  );
}