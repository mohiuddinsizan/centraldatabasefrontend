'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Archive, BookOpen, FileQuestion,
  User, ChevronDown, ChevronUp,
  Calendar, TrendingUp, Hash,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n ?? 0));
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : '0.0');

function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url}`;
}

function norm(v) {
  return String(v || '').trim().toLowerCase();
}

function getArchiveId(archive) {
  return String(
    archive?.id ||
    archive?.archiveId ||
    archive?.archive_id ||
    ''
  );
}

function getArchiveName(archive) {
  return String(
    archive?.name ||
    archive?.archiveName ||
    archive?.archive_name ||
    ''
  );
}

function getArchiveThumbnailField(archive) {
  return (
    archive?.thumbnail_url ||
    archive?.thumbnailUrl ||
    archive?.thumbnail ||
    archive?.image_url ||
    archive?.imageUrl ||
    archive?.cover_url ||
    archive?.coverUrl ||
    null
  );
}

function findArchiveThumbnail(analyticsArchive, archivesFromApi) {
  const analyticsId = getArchiveId(analyticsArchive);
  const analyticsName = norm(getArchiveName(analyticsArchive));

  // First: if analytics itself already has thumbnail
  const directThumb = getArchiveThumbnailField(analyticsArchive);
  if (directThumb) return directThumb;

  // Second: match by id
  if (analyticsId) {
    const byId = archivesFromApi.find((a) => getArchiveId(a) === analyticsId);
    const thumb = getArchiveThumbnailField(byId);
    if (thumb) return thumb;
  }

  // Third: match by name
  if (analyticsName) {
    const byName = archivesFromApi.find((a) => norm(getArchiveName(a)) === analyticsName);
    const thumb = getArchiveThumbnailField(byName);
    if (thumb) return thumb;
  }

  return null;
}

const CLASS_SPINE = {
  'Class 5': '#378ADD',
  'Class 6': '#7F77DD',
  'Class 7': '#1D9E75',
  'Class 8': '#BA7517',
  SSC: '#E24B4A',
  HSC: '#D85A30',
  'Admission: Engineering': '#D4537E',
  'Admission: University': '#639922',
  'Admission: Medical': '#5F5E5A',
};

// ─── TypeBar ──────────────────────────────────────────────────────────────────
function TypeBar({ mcq, cluster, written, total, height = 6 }) {
  if (!total) return null;

  const mp = Math.round((mcq / total) * 100);
  const cp = Math.round((cluster / total) * 100);
  const wp = 100 - mp - cp;

  return (
    <div className="flex rounded-full overflow-hidden gap-px" style={{ height }}>
      {mp > 0 && (
        <div
          style={{ width: mp + '%', background: '#378ADD' }}
          title={`MCQ: ${mcq}`}
        />
      )}
      {cp > 0 && (
        <div
          style={{ width: cp + '%', background: '#1D9E75' }}
          title={`Cluster: ${cluster}`}
        />
      )}
      {wp > 0 && (
        <div
          style={{ width: wp + '%', background: '#D85A30' }}
          title={`Written: ${written}`}
        />
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl" style={{ background: color + '18' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-semibold text-gray-900 mb-0.5">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

// ─── ArchiveRow ───────────────────────────────────────────────────────────────
function ArchiveRow({ archive, rank, archivesFromApi }) {
  const [open, setOpen] = useState(false);

  const spine = CLASS_SPINE[archive.class] || '#888780';
  const thumb = findArchiveThumbnail(archive, archivesFromApi);
  const imgUrl = getImageUrl(thumb);
  const total = archive.questionCount;

  return (
    <div className="border border-gray-200/80 rounded-2xl overflow-hidden mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50/60 transition-colors text-left"
      >
        <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center shrink-0">
          {rank}
        </span>

        <div
          className="relative w-8 shrink-0 rounded-md overflow-hidden border border-gray-200 bg-gray-50"
          style={{ aspectRatio: '9/16' }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] z-10"
            style={{ background: spine }}
          />

          {imgUrl ? (
            <img
              src={imgUrl}
              alt={archive.name || 'Archive thumbnail'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full" style={{ background: spine + '22' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {archive.name}
          </div>
          {archive.class && (
            <div className="text-xs text-gray-400 mt-0.5">{archive.class}</div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-5 shrink-0 mr-2">
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-800">
              {archive.chapterCount}
            </div>
            <div className="text-[10px] text-gray-400">chapters</div>
          </div>

          <div className="text-center">
            <div className="text-sm font-semibold text-gray-800">
              {archive.topicCount}
            </div>
            <div className="text-[10px] text-gray-400">topics</div>
          </div>

          <div className="text-center">
            <div className="text-sm font-semibold text-gray-800">
              {fmt(total)}
            </div>
            <div className="text-[10px] text-gray-400">questions</div>
          </div>
        </div>

        <div className="hidden md:block w-24 shrink-0">
          <TypeBar
            mcq={archive.mcqCount}
            cluster={archive.clusterCount}
            written={archive.writtenCount}
            total={total}
          />
        </div>

        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { label: 'Chapters', val: archive.chapterCount, color: '#7F77DD' },
              { label: 'Topics', val: archive.topicCount, color: '#1D9E75' },
              { label: 'MCQ', val: archive.mcqCount, color: '#378ADD' },
              { label: 'Cluster MCQ', val: archive.clusterCount, color: '#1D9E75' },
              { label: 'Written', val: archive.writtenCount, color: '#D85A30' },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="bg-white border border-gray-200 rounded-xl p-3 text-center"
              >
                <div className="text-lg font-semibold" style={{ color }}>
                  {fmt(val)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {total > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>MCQ {pct(archive.mcqCount, total)}%</span>
                <span>Cluster {pct(archive.clusterCount, total)}%</span>
                <span>Written {pct(archive.writtenCount, total)}%</span>
              </div>

              <TypeBar
                mcq={archive.mcqCount}
                cluster={archive.clusterCount}
                written={archive.writtenCount}
                total={total}
                height={8}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AdminTable ───────────────────────────────────────────────────────────────
function AdminTable({ admins, totalQuestions, dateRange }) {
  if (!admins || admins.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        {dateRange ? 'No uploads found in this date range.' : 'No admin data.'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Admin
            </th>
            <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Total
            </th>
            <th className="text-right py-3 px-3 text-xs font-semibold text-[#378ADD] uppercase tracking-wide hidden sm:table-cell">
              MCQ
            </th>
            <th className="text-right py-3 px-3 text-xs font-semibold text-[#1D9E75] uppercase tracking-wide hidden sm:table-cell">
              Cluster
            </th>
            <th className="text-right py-3 px-3 text-xs font-semibold text-[#D85A30] uppercase tracking-wide hidden sm:table-cell">
              Written
            </th>
            <th className="text-right py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">
              Share
            </th>
            <th className="py-3 px-3 hidden lg:table-cell" />
          </tr>
        </thead>

        <tbody>
          {admins.map((admin, i) => {
            const share = pct(
              admin.total,
              totalQuestions || admins.reduce((s, a) => s + a.total, 0)
            );

            const barW = Math.round(
              (admin.total / (admins[0]?.total || 1)) * 100
            );

            return (
              <tr
                key={admin.id || admin.username || i}
                className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold flex items-center justify-center shrink-0">
                      {(admin.name || admin.username || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <div className="font-medium text-gray-900">
                        {admin.name || admin.username}
                      </div>

                      {admin.lastUpload && (
                        <div className="text-[10px] text-gray-400">
                          last:{' '}
                          {new Date(admin.lastUpload).toLocaleDateString(
                            'en-GB',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-3 px-3 text-right font-semibold text-gray-900">
                  {fmt(admin.total)}
                </td>

                <td className="py-3 px-3 text-right text-[#378ADD] font-medium hidden sm:table-cell">
                  {admin.mcq}
                </td>

                <td className="py-3 px-3 text-right text-[#1D9E75] font-medium hidden sm:table-cell">
                  {admin.cluster}
                </td>

                <td className="py-3 px-3 text-right text-[#D85A30] font-medium hidden sm:table-cell">
                  {admin.written}
                </td>

                <td className="py-3 px-3 text-right hidden md:table-cell">
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                    {share}%
                  </span>
                </td>

                <td className="py-3 px-3 hidden lg:table-cell">
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: barW + '%' }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Trend sparkline ──────────────────────────────────────────────────────────
function Sparkline({ trend }) {
  if (!trend || trend.length === 0) return null;

  const max = Math.max(...trend.map((t) => t.count), 1);
  const W = 300;
  const H = 48;

  const pts = trend
    .map((t, i) => {
      const x = (i / Math.max(trend.length - 1, 1)) * W;
      const y = H - (t.count / max) * H;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: 48 }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="#378ADD"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [archivesFromApi, setArchivesFromApi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveSort, setArchiveSort] = useState('questions');

  const fetchData = useCallback(async (sd, ed) => {
    const params = {};

    if (sd && ed) {
      params.startDate = sd;
      params.endDate = ed;
    }

    const [analyticsRes, archivesRes] = await Promise.all([
      api.get('/analytics', { params }),
      api.get('/archives'),
    ]);

    setArchivesFromApi(archivesRes.data || []);

    return analyticsRes.data;
  }, []);

  useEffect(() => {
    setLoading(true);

    fetchData()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [fetchData]);

  const applyDateFilter = async () => {
    if (!startDate || !endDate) {
      alert('Select both dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before end date');
      return;
    }

    setFilterLoading(true);

    try {
      const d = await fetchData(startDate, endDate);
      setData(d);
    } finally {
      setFilterLoading(false);
    }
  };

  const clearFilter = async () => {
    setStartDate('');
    setEndDate('');
    setLoading(true);

    const d = await fetchData();
    setData(d);

    setLoading(false);
  };

  const filteredArchives = (data?.perArchive || [])
    .filter((a) =>
      !archiveSearch ||
      String(a.name || '').toLowerCase().includes(archiveSearch.toLowerCase())
    )
    .sort((a, b) => {
      if (archiveSort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (archiveSort === 'chapters') return (b.chapterCount || 0) - (a.chapterCount || 0);
      return (b.questionCount || 0) - (a.questionCount || 0);
    });

  const totals = data?.totals || {};
  const isFiltered = !!data?.dateRange;

  const selClass =
    'px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white outline-none';

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <div className="py-8">
        <h1 className="text-3xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">
          Per-archive breakdown · admin upload stats · date range filter
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={Archive}
          label="Archives"
          value={totals.archives ?? '—'}
          color="#378ADD"
        />
        <StatCard
          icon={BookOpen}
          label="Chapters"
          value={totals.chapters ?? '—'}
          color="#7F77DD"
        />
        <StatCard
          icon={Hash}
          label="Topics"
          value={totals.topics ?? '—'}
          color="#1D9E75"
        />
        <StatCard
          icon={FileQuestion}
          label="Questions"
          value={fmt(totals.questions ?? 0)}
          color="#D85A30"
          sub={`MCQ ${totals.mcq ?? 0} · Cluster ${totals.cluster ?? 0} · Written ${totals.written ?? 0}`}
        />
      </div>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">
            Overall question type distribution
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              MCQ {pct(totals.mcq, totals.questions)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
              Cluster {pct(totals.cluster, totals.questions)}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              Written {pct(totals.written, totals.questions)}%
            </span>
          </div>
        </div>

        <TypeBar
          mcq={totals.mcq}
          cluster={totals.cluster}
          written={totals.written}
          total={totals.questions}
          height={10}
        />
      </div>

      {data?.trend?.length > 0 && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-medium text-gray-700">
              Uploads — last 30 days
            </p>
            <span className="ml-auto text-xs text-gray-400">
              {data.trend.reduce((s, t) => s + t.count, 0)} questions
            </span>
          </div>

          <Sparkline trend={data.trend} />

          <div className="flex justify-between text-[10px] text-gray-300 mt-1">
            <span>{data.trend[0]?.day}</span>
            <span>{data.trend[data.trend.length - 1]?.day}</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 mb-8">
        <div className="flex items-center flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Archive className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-sm font-medium text-gray-700">
              Per-archive stats
            </p>
            <span className="text-xs text-gray-400">
              ({filteredArchives.length})
            </span>
          </div>

          <input
            type="text"
            placeholder="Search archives…"
            value={archiveSearch}
            onChange={(e) => setArchiveSearch(e.target.value)}
            className={selClass + ' w-48'}
          />

          <select
            value={archiveSort}
            onChange={(e) => setArchiveSort(e.target.value)}
            className={selClass}
          >
            <option value="questions">Sort by questions</option>
            <option value="chapters">Sort by chapters</option>
            <option value="name">Sort by name</option>
          </select>
        </div>

        <div className="flex items-center gap-4 mb-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            MCQ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
            Cluster
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            Written
          </span>
          <span className="ml-auto text-gray-300">click to expand</span>
        </div>

        {filteredArchives.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No archives found
          </div>
        ) : (
          filteredArchives.map((a, i) => (
            <ArchiveRow
              key={getArchiveId(a) || getArchiveName(a) || i}
              archive={a}
              rank={i + 1}
              archivesFromApi={archivesFromApi}
            />
          ))
        )}
      </div>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-5">
        <div className="flex items-center flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-2 flex-1">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-sm font-medium text-gray-700">
              Admin upload stats
            </p>

            {isFiltered && (
              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                {data.dateRange.startDate} → {data.dateRange.endDate}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={selClass}
            />

            <span className="text-gray-300 text-sm">—</span>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={selClass}
            />

            <button
              onClick={applyDateFilter}
              disabled={filterLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {filterLoading ? 'Loading…' : 'Apply'}
            </button>

            {isFiltered && (
              <button
                onClick={clearFilter}
                className="px-3 py-2 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <AdminTable
          admins={data?.adminStats}
          totalQuestions={
            isFiltered
              ? data.adminStats.reduce((s, a) => s + a.total, 0)
              : totals.questions
          }
          dateRange={data?.dateRange}
        />
      </div>
    </div>
  );
}