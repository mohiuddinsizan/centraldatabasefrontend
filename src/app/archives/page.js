'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Archive, Search, Upload, X, ChevronDown, ChevronUp, BookOpen, List } from 'lucide-react';

const CLASS_ORDER = [
  'Class 5', 'Class 6', 'Class 7', 'Class 8', 'SSC', 'HSC',
  'Admission: Engineering', 'Admission: University', 'Admission: Medical',
];

const CLASS_COLORS = {
  'Class 5': { bg: 'bg-sky-50', badge: 'bg-sky-100 text-sky-800', accent: 'border-sky-300' },
  'Class 6': { bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-800', accent: 'border-violet-300' },
  'Class 7': { bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800', accent: 'border-emerald-300' },
  'Class 8': { bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-800', accent: 'border-amber-300' },
  'SSC': { bg: 'bg-rose-50', badge: 'bg-rose-100 text-rose-800', accent: 'border-rose-300' },
  'HSC': { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-800', accent: 'border-orange-300' },
  'Admission: Engineering': { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-800', accent: 'border-blue-300' },
  'Admission: University': { bg: 'bg-teal-50', badge: 'bg-teal-100 text-teal-800', accent: 'border-teal-300' },
  'Admission: Medical': { bg: 'bg-pink-50', badge: 'bg-pink-100 text-pink-800', accent: 'border-pink-300' },
  'Uncategorized': { bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', accent: 'border-gray-300' },
};

function getImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:5000${url}`;
}

export default function ManageArchivesPage() {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Archive Modal
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [editingArchive, setEditingArchive] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', class: '' });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Chapter & Topic Management
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);

  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterForm, setChapterForm] = useState({ name: '', chapterNumber: '' });

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState({ name: '' });

  // Fetch Archives
  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const response = await api.get('/archives');
      setArchives(response.data);
    } catch (error) {
      console.error('Error fetching archives:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async (archiveId) => {
    try {
      const res = await api.get(`/chapters/archive/${archiveId}`);
      setChapters(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTopics = async (chapterId) => {
    try {
      const res = await api.get(`/topics/chapter/${chapterId}`);
      setTopics(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Archive Handlers
  const handleThumbnailChange = (file) => {
    setThumbnailFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setThumbnailPreview(null);
    }
  };

  const openArchiveModal = (archive = null) => {
    if (archive) {
      setEditingArchive(archive);
      setFormData({
        name: archive.name,
        description: archive.description || '',
        class: archive.class || ''
      });
      setThumbnailPreview(getImageUrl(archive.thumbnail_url));
    } else {
      setEditingArchive(null);
      setFormData({ name: '', description: '', class: '' });
      setThumbnailPreview(null);
    }
    setThumbnailFile(null);
    setShowArchiveModal(true);
  };

  const handleArchiveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('class', formData.class);
      if (thumbnailFile) data.append('thumbnail', thumbnailFile);

      if (editingArchive) {
        await api.put(`/archives/${editingArchive.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/archives', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      fetchArchives();
      closeArchiveModal();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save archive');
    } finally {
      setSubmitting(false);
    }
  };

  const closeArchiveModal = () => {
    setShowArchiveModal(false);
    setEditingArchive(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleDeleteArchive = async (id) => {
    if (!confirm('Are you sure? This will delete all chapters, topics, and questions in this archive!')) return;
    try {
      await api.delete(`/archives/${id}`);
      fetchArchives();
      if (selectedArchive?.id === id) setSelectedArchive(null);
    } catch (error) {
      alert('Failed to delete archive');
    }
  };

  // Chapter Handlers
  const openChapterModal = (chapter = null) => {
    if (chapter) {
      setEditingChapter(chapter);
      setChapterForm({ name: chapter.name, chapterNumber: chapter.chapter_number });
    } else {
      setEditingChapter(null);
      setChapterForm({ name: '', chapterNumber: '' });
    }
    setShowChapterModal(true);
  };

  const handleChapterSubmit = async (e) => {
    e.preventDefault();
    if (!selectedArchive) return;
    try {
      if (editingChapter) {
        await api.put(`/chapters/${editingChapter.id}`, chapterForm);
      } else {
        await api.post('/chapters', {
          archiveId: selectedArchive.id,
          name: chapterForm.name,
          chapterNumber: chapterForm.chapterNumber
        });
      }
      fetchChapters(selectedArchive.id);
      setShowChapterModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save chapter');
    }
  };

  const handleDeleteChapter = async (id) => {
    if (!confirm('Delete this chapter? All topics inside will also be deleted.')) return;
    try {
      await api.delete(`/chapters/${id}`);
      fetchChapters(selectedArchive.id);
      if (selectedChapter?.id === id) {
        setSelectedChapter(null);
        setTopics([]);
      }
    } catch (error) {
      alert('Failed to delete chapter');
    }
  };

  // Topic Handlers
  const openTopicModal = (topic = null) => {
    if (topic) {
      setEditingTopic(topic);
      setTopicForm({ name: topic.name });
    } else {
      setEditingTopic(null);
      setTopicForm({ name: '' });
    }
    setShowTopicModal(true);
  };

  const handleTopicSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChapter) return;
    try {
      if (editingTopic) {
        await api.put(`/topics/${editingTopic.id}`, topicForm);
      } else {
        await api.post('/topics', {
          chapterId: selectedChapter.id,
          name: topicForm.name
        });
      }
      fetchTopics(selectedChapter.id);
      setShowTopicModal(false);
    } catch (err) {
      alert('Failed to save topic');
    }
  };

  const handleDeleteTopic = async (id) => {
    if (!confirm('Delete this topic?')) return;
    try {
      await api.delete(`/topics/${id}`);
      fetchTopics(selectedChapter.id);
    } catch (error) {
      alert('Failed to delete topic');
    }
  };

  const openArchiveDetail = (archive) => {
    setSelectedArchive(archive);
    fetchChapters(archive.id);
    setSelectedChapter(null);
    setTopics([]);
  };

  const backToArchives = () => {
    setSelectedArchive(null);
    setSelectedChapter(null);
    setChapters([]);
    setTopics([]);
  };

  // Grouping Logic
  const filtered = archives.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = {};
  filtered.forEach((archive) => {
    const key = archive.class || 'Uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(archive);
  });

  const orderedKeys = [
    ...CLASS_ORDER.filter((c) => grouped[c]),
    ...(grouped['Uncategorized'] ? ['Uncategorized'] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between py-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedArchive ? selectedArchive.name : 'Archives'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {selectedArchive 
              ? 'Manage Chapters and Topics' 
              : `${archives.length} archives across ${orderedKeys.length} categories`}
          </p>
        </div>

        {selectedArchive ? (
          <button
            onClick={backToArchives}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
          >
            ← Back to Archives
          </button>
        ) : (
          <button
            onClick={() => openArchiveModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Archive
          </button>
        )}
      </div>

      {!selectedArchive && (
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search archives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm shadow-sm"
          />
        </div>
      )}

      {/* Archive List */}
      {!selectedArchive && (
        <>
          {loading ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-6 w-32 bg-gray-200 rounded-lg mb-4 animate-pulse" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="animate-pulse">
                        <div className="w-full bg-gray-200 rounded-xl mb-2" style={{ aspectRatio: '9/16' }} />
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Archive className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">No archives found</h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchTerm ? 'Try a different search term' : 'Create your first archive to get started'}
              </p>
              {!searchTerm && (
                <button onClick={() => openArchiveModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <Plus className="w-4 h-4" /> Create Archive
                </button>
              )}
            </div>
          ) : (
            orderedKeys.map((cls) => {
              const color = CLASS_COLORS[cls] || CLASS_COLORS['Uncategorized'];
              const isCollapsed = collapsedGroups[cls];

              return (
                <div key={cls} className="mb-10">
                  <button
                    onClick={() => setCollapsedGroups((prev) => ({ ...prev, [cls]: !prev[cls] }))}
                    className="flex items-center gap-3 mb-4 group w-full text-left"
                  >
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color.badge}`}>
                      {cls}
                    </span>
                    <span className="text-xs text-gray-400">{grouped[cls].length} archives</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                  </button>

                  {!isCollapsed && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {grouped[cls].map((archive) => (
                        <ArchiveCard
                          key={archive.id}
                          archive={archive}
                          color={color}
                          onEdit={openArchiveModal}
                          onDelete={handleDeleteArchive}
                          onManage={openArchiveDetail}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}

      {/* Chapters & Topics View */}
      {selectedArchive && (
        <div className="space-y-10">
          {/* Chapters */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-3">
                <BookOpen className="w-7 h-7" /> Chapters
              </h2>
              <button
                onClick={() => openChapterModal()}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" /> Add Chapter
              </button>
            </div>

            <div className="space-y-3">
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => {
                    setSelectedChapter(ch);
                    fetchTopics(ch.id);
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${selectedChapter?.id === ch.id ? 'border-emerald-500 bg-emerald-50' : 'hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">Chapter {ch.chapter_number}: {ch.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{ch.topic_count} topics</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openChapterModal(ch); }}
                        className="p-3 hover:bg-white rounded-xl"
                      >
                        <Edit className="w-5 h-5" />
                      </button>

                      {/* Chapter deleting button invisible */}

                      {/* <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }}
                        className="p-3 hover:bg-white rounded-xl text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button> */}



                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topics */}
          {selectedChapter && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-3">
                  <List className="w-7 h-7" /> Topics in "{selectedChapter.name}"
                </h2>
                <button
                  onClick={() => openTopicModal()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> Add Topic
                </button>
              </div>

              <div className="space-y-3">
                {topics.map((t) => (
                  <div key={t.id} className="p-5 bg-white border rounded-2xl flex justify-between items-center">
                    <p className="font-medium text-lg">{t.name}</p>
                    <div className="flex gap-2">
                      <button onClick={() => openTopicModal(t)} className="p-3 hover:bg-gray-100 rounded-xl">
                        <Edit className="w-5 h-5" />
                      </button>


                      {/* Topic deleting button invisible */}


                      {/* <button onClick={() => handleDeleteTopic(t.id)} className="p-3 hover:bg-gray-100 rounded-xl text-red-600">
                        <Trash2 className="w-5 h-5" />
                      </button> */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================== MODALS ====================== */}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingArchive ? 'Edit Archive' : 'New Archive'}
              </h3>
              <button onClick={closeArchiveModal} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleArchiveSubmit} className="p-6 space-y-5">
              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail</label>
                <label className="block cursor-pointer group">
                  <div className="relative w-full overflow-hidden rounded-xl border-2 border-dashed border-gray-200 group-hover:border-blue-400 transition-colors bg-gray-50" style={{ aspectRatio: '9/16', maxHeight: '320px' }}>
                    {thumbnailPreview ? (
                      <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <Upload className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">Upload thumbnail (9:16 recommended)</span>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => handleThumbnailChange(e.target.files[0])} className="hidden" />
                </label>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Archive Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" required />
              </div>

              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class *</label>
                <select value={formData.class} onChange={(e) => setFormData({ ...formData, class: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white" required>
                  <option value="">Select class</option>
                  {CLASS_ORDER.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none" rows={3} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeArchiveModal} className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-60">
                  {submitting ? 'Saving...' : editingArchive ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-5">{editingChapter ? 'Edit Chapter' : 'Add New Chapter'}</h3>
            <form onSubmit={handleChapterSubmit} className="space-y-4">
              <input type="text" placeholder="Chapter Name" value={chapterForm.name} onChange={(e) => setChapterForm({ ...chapterForm, name: e.target.value })} className="w-full px-4 py-3 border rounded-xl" required />
              <input type="number" placeholder="Chapter Number" value={chapterForm.chapterNumber} onChange={(e) => setChapterForm({ ...chapterForm, chapterNumber: e.target.value })} className="w-full px-4 py-3 border rounded-xl" required />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowChapterModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl">Save Chapter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-5">{editingTopic ? 'Edit Topic' : 'Add New Topic'}</h3>
            <form onSubmit={handleTopicSubmit} className="space-y-4">
              <input type="text" placeholder="Topic Name" value={topicForm.name} onChange={(e) => setTopicForm({ name: e.target.value })} className="w-full px-4 py-3 border rounded-xl" required />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTopicModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl">Save Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ArchiveCard({ archive, color, onEdit, onDelete, onManage }) {
  const imageUrl = getImageUrl(archive.thumbnail_url);

  return (
    <div className="group relative cursor-pointer" onClick={() => onManage(archive)}>
      <div className={`relative w-full overflow-hidden rounded-xl mb-2 border ${color.accent} ${color.bg}`} style={{ aspectRatio: '9/16' }}>
        {imageUrl ? (
          <img src={imageUrl} alt={archive.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Archive className="w-10 h-10 text-gray-400" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onManage(archive); }} className="bg-white text-gray-900 px-4 py-1.5 rounded-lg text-sm font-medium">Manage</button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(archive); }} className="bg-white p-2 rounded-lg"><Edit className="w-4 h-4" /></button>

          {/* Archive deleting button invisible */}

          {/* <button onClick={(e) => { e.stopPropagation(); onDelete(archive.id); }} className="bg-white p-2 rounded-lg text-red-600"><Trash2 className="w-4 h-4" /></button> */}
        </div>

        {archive.chapter_count > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md">
            {archive.chapter_count} ch
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-gray-900 line-clamp-2 px-1">{archive.name}</p>
      <p className="text-xs text-gray-400 mt-0.5 px-1">
        {new Date(archive.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
      </p>
    </div>
  );
}