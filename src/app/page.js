'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { BookOpen } from 'lucide-react';

const CLASS_ORDER = [
  'Class 5', 'Class 6', 'Class 7', 'Class 8', 'SSC', 'HSC',
  'Admission: Engineering', 'Admission: University', 'Admission: Medical',
];

const CLASS_STYLES = {
  'Class 5':                { fill: '#E6F1FB', spine: '#378ADD', badge: 'bg-blue-100 text-blue-800',    section: 'bg-blue-100 text-blue-800' },
  'Class 6':                { fill: '#EEEDFE', spine: '#7F77DD', badge: 'bg-purple-100 text-purple-800', section: 'bg-purple-100 text-purple-800' },
  'Class 7':                { fill: '#E1F5EE', spine: '#1D9E75', badge: 'bg-teal-100 text-teal-800',   section: 'bg-teal-100 text-teal-800' },
  'Class 8':                { fill: '#FAEEDA', spine: '#BA7517', badge: 'bg-amber-100 text-amber-800', section: 'bg-amber-100 text-amber-800' },
  'SSC':                    { fill: '#FCEBEB', spine: '#E24B4A', badge: 'bg-red-100 text-red-800',     section: 'bg-red-100 text-red-800' },
  'HSC':                    { fill: '#FAECE7', spine: '#D85A30', badge: 'bg-orange-100 text-orange-800', section: 'bg-orange-100 text-orange-800' },
  'Admission: Engineering': { fill: '#FBEAF0', spine: '#D4537E', badge: 'bg-pink-100 text-pink-800',   section: 'bg-pink-100 text-pink-800' },
  'Admission: University':  { fill: '#EAF3DE', spine: '#639922', badge: 'bg-green-100 text-green-800', section: 'bg-green-100 text-green-800' },
  'Admission: Medical':     { fill: '#F1EFE8', spine: '#5F5E5A', badge: 'bg-gray-100 text-gray-700',   section: 'bg-gray-100 text-gray-700' },
  'Uncategorized':          { fill: '#F1EFE8', spine: '#888780', badge: 'bg-gray-100 text-gray-700',   section: 'bg-gray-100 text-gray-700' },
};

function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;

  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
    'http://localhost:5000';

  return `${base}${url}`;
}


function BookCover({ archive }) {
  const st = CLASS_STYLES[archive.class] || CLASS_STYLES['Uncategorized'];
  const imgUrl = getImageUrl(archive.thumbnail_url);
  const chCount = archive.chapter_count || 0;
  const qCount = archive.question_count || 0;
  const mcqCount = archive.mcq_count || 0;
  const clusterCount = archive.cluster_count || 0;
  const writtenCount = archive.written_count || 0;
  const total = mcqCount + clusterCount + writtenCount || qCount || 1;
  const mcqPct = Math.round((mcqCount / total) * 100);
  const clPct = Math.round((clusterCount / total) * 100);
  const wrPct = 100 - mcqPct - clPct;

  const shortLabel = (archive.class || '')
    .replace('Admission: ', '')
    .replace('Class ', 'Cl.');

  return (
    <div className="select-none">
      {/* Book cover */}
      <div
        className="relative w-full overflow-hidden rounded-[10px] border border-gray-200/70"
        style={{ aspectRatio: '9/16' }}
      >
        {/* Spine accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[6px] z-10 rounded-l-[10px]"
          style={{ background: st.spine }}
        />

        {/* Cover background / image */}
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={archive.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: st.fill }}
          >
            <BookOpen className="w-7 h-7 opacity-30 text-gray-600" />
          </div>
        )}

        {/* Class badge top-right */}
        {archive.class && (
          <div className={`absolute top-2 right-2 z-10 text-[9px] font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>
            {shortLabel}
          </div>
        )}

        {/* Bottom overlay with stats */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-2 py-2"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-medium text-white/90 bg-white/15 px-1.5 py-0.5 rounded-md">
              {chCount} ch
            </span>
            {qCount > 0 && (
              <span className="text-[9px] font-medium text-white/90 bg-white/15 px-1.5 py-0.5 rounded-md">
                {fmt(qCount)} q
              </span>
            )}
          </div>

          {/* Question type bar */}
          {total > 1 && (
            <div className="flex h-[3px] rounded-full overflow-hidden gap-px mt-1.5">
              {mcqPct > 0 && <div style={{ width: mcqPct + '%', background: '#378ADD' }} />}
              {clPct > 0 && <div style={{ width: clPct + '%', background: '#1D9E75' }} />}
              {wrPct > 0 && <div style={{ width: wrPct + '%', background: '#D85A30' }} />}
            </div>
          )}
        </div>
      </div>

      {/* Below cover */}
      <p className="text-[12px] font-medium text-gray-900 mt-1.5 leading-tight line-clamp-2 px-0.5">
        {archive.name}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5 px-0.5">
        {new Date(archive.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

export default function HomePage() {
  const [archives, setArchives] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [archRes, qRes] = await Promise.all([
          api.get('/archives'),
          api.get('/questions', { params: { limit: 1 } }).catch(() => ({ data: { pagination: { total: 0 } } })),
        ]);
        setArchives(archRes.data || []);
        setTotalQuestions(qRes.data?.pagination?.total || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalChapters = archives.reduce((s, a) => s + (a.chapter_count || 0), 0);

  const grouped = {};
  archives.forEach((a) => {
    const k = a.class || 'Uncategorized';
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(a);
  });
  const orderedKeys = [
    ...CLASS_ORDER.filter((c) => grouped[c]),
    ...(grouped['Uncategorized'] ? ['Uncategorized'] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">

      {/* Hero */}
      <div className="flex items-end justify-between py-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Question Library</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">
              {archives.length} archives · {totalChapters} chapters · {fmt(totalQuestions)} questions
            </p>
          )}
        </div>
        {/* Class pills */}
        <div className="flex flex-wrap gap-2">
          {orderedKeys.map((k) => {
            const st = CLASS_STYLES[k] || CLASS_STYLES['Uncategorized'];
            return (
              <span key={k} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${st.section}`}>
                {k} ({grouped[k].length})
              </span>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { num: archives.length, label: 'Archives' },
          { num: totalChapters, label: 'Chapters' },
          { num: fmt(totalQuestions), label: 'Questions' },
          {
            custom: (
              <div>
                <div className="flex gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />MCQ
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />Cluster
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Written
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Question types</p>
              </div>
            ),
          },
        ].map((s, i) =>
          s.custom ? (
            <div key={i} className="bg-gray-50 rounded-xl p-4">{s.custom}</div>
          ) : (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-semibold text-gray-900">{loading ? '—' : s.num}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          )
        )}
      </div>

      {/* Shelves */}
      {loading ? (
        <div className="space-y-10">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {[...Array(5)].map((_, j) => (
                  <div key={j}>
                    <div className="w-full bg-gray-200 rounded-[10px] animate-pulse" style={{ aspectRatio: '9/16' }} />
                    <div className="h-3 bg-gray-200 rounded mt-2 w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : archives.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">No archives yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {orderedKeys.map((cls) => {
            const st = CLASS_STYLES[cls] || CLASS_STYLES['Uncategorized'];
            return (
              <div key={cls}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${st.section}`}>{cls}</span>
                  <span className="text-xs text-gray-400">{grouped[cls].length} archive{grouped[cls].length > 1 ? 's' : ''}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Shelf divider */}
                <div className="w-full h-[3px] bg-gray-100 rounded-full mb-4" />

                {/* Books grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                  {grouped[cls].map((archive) => (
                    <BookCover key={archive.id} archive={archive} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}