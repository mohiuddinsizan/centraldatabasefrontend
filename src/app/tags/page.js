'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Tag, BookOpen, Search } from 'lucide-react';

export default function ManageTagsPage() {
  const [activeTab, setActiveTab] = useState('tags'); // 'tags' or 'sources'

  // Tags State
  const [tags, setTags] = useState([]);
  const [tagLoading, setTagLoading] = useState(true);

  // Sources State
  const [sources, setSources] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: '', year: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTags();
    fetchSources();
  }, []);

  const fetchTags = async () => {
    try {
      setTagLoading(true);
      const response = await api.get('/tags');
      setTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setTagLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      setSourceLoading(true);
      const response = await api.get('/sources');
      setSources(response.data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setSourceLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (activeTab === 'tags') {
        if (editingItem) {
          await api.put(`/tags/${editingItem.id}`, { name: formData.name });
        } else {
          await api.post('/tags', { name: formData.name });
        }
        fetchTags();
      } else {
        if (editingItem) {
          await api.put(`/sources/${editingItem.id}`, formData);
        } else {
          await api.post('/sources', formData);
        }
        fetchSources();
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', type: '', year: '' });
    } catch (error) {
      console.error('Error saving:', error);
      alert(error.response?.data?.error || 'Failed to save');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (activeTab === 'tags') {
      setFormData({ name: item.name, type: '', year: '' });
    } else {
      setFormData({ 
        name: item.name, 
        type: item.type || '', 
        year: item.year || '' 
      });
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(`Are you sure you want to delete this ${activeTab === 'tags' ? 'tag' : 'source'}?`)) return;

    try {
      if (activeTab === 'tags') {
        await api.delete(`/tags/${id}`);
        fetchTags();
      } else {
        await api.delete(`/sources/${id}`);
        fetchSources();
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  const filteredItems = (activeTab === 'tags' ? tags : sources).filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = activeTab === 'tags' ? tagLoading : sourceLoading;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Resources</h1>
        <p className="text-gray-600">Manage Tags and Sources for your questions</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('tags')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'tags'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Tag className="w-5 h-5" />
          Tags
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sources'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Sources
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({ name: '', type: '', year: '' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Create {activeTab === 'tags' ? 'Tag' : 'Source'}
          </button>
        </div>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredItems.length} {activeTab === 'tags' ? 'Tags' : 'Sources'}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            {activeTab === 'tags' ? (
              <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            ) : (
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab} found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try a different search term' : `Get started by creating your first ${activeTab}`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">
                    {activeTab === 'tags' ? 'Tag Name' : 'Source Name'}
                  </th>
                  {activeTab === 'sources' && (
                    <>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Year</th>
                    </>
                  )}
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Usage Count</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Created By</th>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">Created At</th>
                  <th className="text-right py-3 px-6 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {activeTab === 'tags' ? (
                          <Tag className="w-4 h-4 text-blue-600" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>

                    {activeTab === 'sources' && (
                      <>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {item.type || '-'}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {item.year || '-'}
                        </td>
                      </>
                    )}

                    <td className="py-4 px-6">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {item.usage_count || 0} questions
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {item.created_by_name || 'Unknown'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* sources deleting button invisible */}



                        {/* <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingItem ? 'Edit' : 'Create New'} {activeTab === 'tags' ? 'Tag' : 'Source'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {activeTab === 'tags' ? 'Tag' : 'Source'} Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={activeTab === 'tags' ? "Enter tag name" : "e.g. NCERT Physics Class 12"}
                  required
                />
              </div>

              {activeTab === 'sources' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Book, Website, Journal..."
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="2025"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    setFormData({ name: '', type: '', year: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}