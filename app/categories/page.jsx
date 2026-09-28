'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { useModal } from '@/app/ModalContext';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ArrowUpDown,
  Boxes,
  Upload,
  LayoutGrid,
  List
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

export default function CategoriesPage() {
  const { confirm: confirmModal } = useModal();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  });
  const [imagePreview, setImagePreview] = useState('');
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api.categories.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setImagePreview(compressed);
      setFormData((prev) => ({ ...prev, image: compressed }));
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to process image.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setCompressing(false);
    }
  };

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({
        name: cat.name || '',
        image: cat.image || '',
        description: cat.description || '',
        sortOrder: cat.sortOrder || 0,
        isActive: cat.isActive !== undefined ? cat.isActive : true,
      });
      setImagePreview(cat.image || '');
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        image: '',
        description: '',
        sortOrder: categories.length + 1,
        isActive: true,
      });
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitLoading(true);

    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, formData);
        setMessage({ type: 'success', text: `Category '${formData.name}' updated successfully` });
      } else {
        await api.categories.create(formData);
        setMessage({ type: 'success', text: `Category '${formData.name}' created successfully` });
      }
      handleCloseModal();
      await loadCategories();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save category' });
    } finally {
      setSubmitLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDelete = async (cat) => {
    const isConfirmed = await confirmModal({
      title: 'Delete Category',
      message: `Are you sure you want to delete category '${cat.name}'? This action cannot be undone.`,
      confirmText: 'Delete Category',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    try {
      await api.categories.delete(cat.id);
      setMessage({ type: 'success', text: `Category '${cat.name}' deleted successfully` });
      await loadCategories();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete category' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredCategories.length / limit) || 1;
  const paginatedCategories = filteredCategories.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Category Management"
        subtitle="Organize textile catalog classifications, visual banners, and storefront display order"
        onRefresh={loadCategories}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6 flex-1 w-full">
        {/* Notifications */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center space-x-2 text-sm font-semibold shadow-sm ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-dark-900 p-4 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
                <span className="hidden md:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden md:inline">Cards</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="5">5 / page</option>
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>

            <button
              onClick={() => handleOpenModal()}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* Categories Content */}
        {loading ? (
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 p-12 text-center text-slate-400">
            Loading categories...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 p-12 text-center">
            <FolderTree className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No categories found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {search ? 'Try adjusting your search query.' : 'Create your first product category to get started.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-dark-700 bg-slate-50/70 dark:bg-dark-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6 font-semibold">Category & Visual</th>
                    <th className="py-3.5 px-6 font-semibold">Slug URL</th>
                    <th className="py-3.5 px-6 font-semibold">Description</th>
                    <th className="py-3.5 px-6 font-semibold">Display Order</th>
                    <th className="py-3.5 px-6 font-semibold">Products</th>
                    <th className="py-3.5 px-6 font-semibold">Status</th>
                    <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800 text-slate-700 dark:text-slate-300">
                  {paginatedCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 overflow-hidden flex-shrink-0">
                            {cat.image ? (
                              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-5 h-5 opacity-40" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{cat.name}</div>
                            <div className="text-[10px] text-slate-400">ID: {cat.id?.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-brand-600 dark:text-brand-400">
                        /{cat.slug}
                      </td>
                      <td className="py-4 px-6 max-w-xs text-slate-500 dark:text-slate-400 truncate">
                        {cat.description || '—'}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                        #{cat.sortOrder || 0}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center space-x-1 font-semibold text-slate-900 dark:text-white">
                          <Boxes className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 mr-1" />
                          {cat._count?.products || 0} Products
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          cat.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {cat.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenModal(cat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                            title="Edit Category"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredCategories.length}
              limit={limit}
              onPageChange={setPage}
              itemName="categories"
            />
          </div>
        ) : (
          /* Cards Grid View */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col"
                >
                  <div className="h-44 relative bg-slate-100 dark:bg-dark-800 overflow-hidden">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-10 h-10 mb-1 opacity-50" />
                        <span className="text-[11px]">No image provided</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    
                    <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${
                        cat.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {cat.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 text-white border border-white/20 backdrop-blur-md">
                        #{cat.sortOrder || 0}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <h3 className="text-base font-bold drop-shadow-sm truncate">{cat.name}</h3>
                      <p className="text-[11px] text-slate-200/90 font-mono">/{cat.slug}</p>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {cat.description || 'No description added.'}
                    </p>

                    <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <Boxes className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        <span>{cat._count?.products || 0} Products</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenModal(cat)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                          title="Edit Category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredCategories.length}
              limit={limit}
              onPageChange={setPage}
              itemName="categories"
            />
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FolderTree className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{editingCategory ? 'Edit Category' : 'Create New Category'}</span>
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Silk Sarees, Cotton Dhotis"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category Banner Image (Raw Upload — auto-compressed to 500KB)
                </label>
                {imagePreview ? (
                  <div className="relative group mt-1">
                    <div className="h-28 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-dark-700 bg-slate-100 dark:bg-dark-800">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setImagePreview(''); setFormData((p) => ({ ...p, image: '' })); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-600 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 transition-all mt-1"
                  >
                    {compressing ? (
                      <span className="text-xs text-brand-600 font-semibold animate-pulse">Compressing...</span>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">Click to upload banner image</span>
                        <span className="text-[11px] text-slate-400">JPG, PNG, WEBP · Auto-compressed to 500KB</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief summary for storefront banner..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sort Order Priority
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    <option value="true">Active (Visible)</option>
                    <option value="false">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-dark-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitLoading ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
