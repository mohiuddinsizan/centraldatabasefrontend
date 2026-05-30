'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, Edit, Trash2, Tag, BookOpen, Package, Calendar, Search } from 'lucide-react';

// Tab configuration — single source of truth for all four entities
const TABS = {
  tags:    { label: 'Tags',    singular: 'Tag',    endpoint: '/tags',    icon: Tag,      field: 'name'  },
  sources: { label: 'Sources', singular: 'Source', endpoint: '/sources', icon: BookOpen, field: 'name'  },
  units:   { label: 'Units',   singular: 'Unit',   endpoint: '/units',   icon: Package,  field: 'name'  },
  years:   { label: 'Years',   singular: 'Year',   endpoint: '/years',   icon: Calendar, field: 'value' },
};
const TAB_KEYS = Object.keys(TABS);

export default function ManageResourcesPage() {
  const [activeTab, setActiveTab] = useState('tags');

  const [lists, setLists]     = useState({ tags: [], sources: [], units: [], years: [] });
  const [loading, setLoading] = useState({ tags: true, sources: true, units: true, years: true });

  const [showModal, setShowModal]       = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [formData, setFormData]         = useState({ name: '', value: '' });
  const [searchTerm, setSearchTerm]     = useState('');

  const cfg = TABS[activeTab];
  const isYear = cfg.field === 'value';

  useEffect(() => {
    TAB_KEYS.forEach(fetchList);
  }, []);

  const fetchList = async (tab) => {
    try {
      setLoading((l) => ({ ...l, [tab]: true }));
      const res = await api.get(TABS[tab].endpoint);
      setLists((s) => ({ ...s, [tab]: res.data }));
    } catch (error) {
      console.error(`Error fetching ${tab}:`, error);
    } finally {
      setLoading((l) => ({ ...l, [tab]: false }));
    }
  };

  const resetForm = () => { setEditingItem(null); setFormData({ name: '', value: '' }); };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build the right body for this entity
    let body;
    if (isYear) {
      const num = parseInt(formData.value, 10);
      if (!num || Number.isNaN(num)) { alert('Please enter a valid year.'); return; }
      body = { value: num };
    } else {
      const name = formData.name.trim();
      if (!name) { alert(`${cfg.singular} name is required.`); return; }
      body = { name };
    }

    try {
      if (editingItem) {
        await api.put(`${cfg.endpoint}/${editingItem.id}`, body);
      } else {
        await api.post(cfg.endpoint, body);
      }
      await fetchList(activeTab);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving:', error);
      alert(error.response?.data?.error || 'Failed to save');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ name: item.name || '', value: item.value ?? '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(`Are you sure you want to delete this ${cfg.singular.toLowerCase()}?`)) return;
    try {
      await api.delete(`${cfg.endpoint}/${id}`);
      await fetchList(activeTab);
    } catch (error) {
      console.error('Error deleting:', error);
      alert(error.response?.data?.error || 'Failed to delete');
    }
  };

  const displayValue = (item) => (isYear ? item.value : item.name);

  const filteredItems = lists[activeTab].filter((item) =>
    String(displayValue(item)).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLoading = loading[activeTab];
  const Icon = cfg.icon;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Resources</h1>
        <p className="text-gray-600">Create and manage Tags, Sources, Units and Years for your questions</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TAB_KEYS.map((key) => {
          const TabIcon = TABS[key].icon;
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSearchTerm(''); }}
              className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TabIcon className="w-5 h-5" />
              {TABS[key].label}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${cfg.label.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Create {cfg.singular}
          </button>
        </div>
      </div>

      {/* List Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredItems.length} {cfg.label}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {cfg.label.toLowerCase()} found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try a different search term' : `Get started by creating your first ${cfg.singular.toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700">
                    {isYear ? 'Year' : `${cfg.singular} Name`}
                  </th>
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
                        <Icon className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{displayValue(item)}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {item.usage_count || 0} questions
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {item.created_by_name || 'Unknown'}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
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

                        { 
                        // <button
                        //   onClick={() => handleDelete(item.id)}
                        //   className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        //   title="Delete"
                        // >
                        //   <Trash2 className="w-4 h-4" />
                        // </button>
                        }
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
              {editingItem ? 'Edit' : 'Create New'} {cfg.singular}
            </h3>
            <form onSubmit={handleSubmit}>
              {isYear ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1900}
                    max={2200}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 2025"
                    required
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {cfg.singular} Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      activeTab === 'tags'    ? 'Enter tag name'
                      : activeTab === 'units' ? 'e.g. Mechanics'
                      : 'e.g. Dhaka University Admission'
                    }
                    required
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
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