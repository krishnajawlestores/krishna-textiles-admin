'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { useModal } from '@/app/ModalContext';
import { 
  Award, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Boxes,
  Upload,
  LayoutGrid,
  List
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

export default function BrandsPage() {
  const { confirm: confirmModal } = useModal();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    description: '',
    isActive: true,
  });
  const [imagePreview, setImagePreview] = useState('');
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const data = await api.brands.getAll();
      setBrands(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load brands', e);
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
      let finalUrl = compressed;
      try {
        const uploadRes = await api.upload.uploadBase64(compressed, 'Others');
        if (uploadRes?.data?.url) {
          finalUrl = uploadRes.data.url;
        }
      } catch (uploadErr) {
        console.warn('S3 Others upload fallback to base64', uploadErr);
      }
      setFormData((prev) => ({ ...prev, image: finalUrl }));
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to process image.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setCompressing(false);
    }
  };

  const handleOpenModal = (brand = null) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData({
        name: brand.name || '',
        image: brand.image || '',
        description: brand.description || '',
        isActive: brand.isActive !== undefined ? brand.isActive : true,
      });
      setImagePreview(brand.image || '');
    } else {
      setEditingBrand(null);
      setFormData({
        name: '',
        image: '',
        description: '',
        isActive: true,
      });
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitLoading(true);

    try {
      if (editingBrand) {
        await api.brands.update(editingBrand.id, formData);
        setMessage({ type: 'success', text: `Brand '${formData.name}' updated successfully` });
      } else {
        await api.brands.create(formData);
        setMessage({ type: 'success', text: `Brand '${formData.name}' created successfully` });
      }
      handleCloseModal();
      await loadBrands();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save brand' });
    } finally {
      setSubmitLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDelete = async (brand) => {
    const isConfirmed = await confirmModal({
      title: 'Delete Brand',
      message: `Are you sure you want to delete brand '${brand.name}'? This action cannot be undone.`,
      confirmText: 'Delete Brand',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    try {
      await api.brands.delete(brand.id);
      setMessage({ type: 'success', text: `Brand '${brand.name}' deleted successfully` });
      await loadBrands();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete brand' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredBrands.length / limit) || 1;
  const paginatedBrands = filteredBrands.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Textile Brands Master"
        subtitle="Manage heritage textile weavers, internal brands, vendor logos, and partner identities"
        onRefresh={loadBrands}
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
                placeholder="Search brands..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
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
              <span>Add Brand</span>
            </button>
          </div>
        </div>

        {/* Brands Content */}
        {loading ? (
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 p-12 text-center text-slate-400">
            Loading brands catalog...
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 p-12 text-center">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No brands found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {search ? 'Try adjusting your search query.' : 'Add your first textile brand.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-dark-700 bg-slate-50/70 dark:bg-dark-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6 font-semibold">Brand & Identity</th>
                    <th className="py-3.5 px-6 font-semibold">Slug URL</th>
                    <th className="py-3.5 px-6 font-semibold">Heritage / Description</th>
                    <th className="py-3.5 px-6 font-semibold">Associated Products</th>
                    <th className="py-3.5 px-6 font-semibold">Status</th>
                    <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800 text-slate-700 dark:text-slate-300">
                  {paginatedBrands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                            {brand.image ? (
                              <img src={brand.image} alt={brand.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Award className="w-6 h-6 text-brand-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{brand.name}</div>
                            <div className="text-[10px] text-slate-400">ID: {brand.id?.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono font-semibold text-brand-600 dark:text-brand-400">
                        /{brand.slug}
                      </td>
                      <td className="py-4 px-6 max-w-xs text-slate-500 dark:text-slate-400 truncate">
                        {brand.description || '—'}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center space-x-1 font-semibold text-slate-900 dark:text-white">
                          <Boxes className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 mr-1" />
                          {brand._count?.products || 0} Products
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          brand.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {brand.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenModal(brand)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                            title="Edit Brand"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(brand)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                            title="Delete Brand"
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
              totalItems={filteredBrands.length}
              limit={limit}
              onPageChange={setPage}
              itemName="brands"
            />
          </div>
        ) : (
          /* Cards Grid View */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedBrands.map((brand) => (
                <div
                  key={brand.id}
                  className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 overflow-hidden flex items-center justify-center p-1 shadow-sm">
                        {brand.image ? (
                          <img
                            src={brand.image}
                            alt={brand.name}
                            className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Award className="w-8 h-8 text-brand-500" />
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        brand.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}>
                        {brand.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{brand.name}</h3>
                      <p className="text-[10px] text-slate-400 font-mono">slug: {brand.slug}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {brand.description || 'No description recorded.'}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between bg-slate-50/50 dark:bg-dark-950/40">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      <Boxes className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      <span>{brand._count?.products || 0} Products</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenModal(brand)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                        title="Edit Brand"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(brand)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                        title="Delete Brand"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredBrands.length}
              limit={limit}
              onPageChange={setPage}
              itemName="brands"
            />
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Award className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</span>
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Krishna Heritage Silk, Varnam Handlooms"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Brand Logo / Image (WebP auto-compressed &lt; 500KB)
                </label>
                {imagePreview ? (
                  <div className="relative group mt-1">
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-dark-700 bg-slate-100 dark:bg-dark-800">
                      <img src={imagePreview} alt="Logo preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setImagePreview(''); setFormData((p) => ({ ...p, image: '' })); }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="block mt-2 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-600 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 transition-all mt-1"
                  >
                    {compressing ? (
                      <span className="text-xs text-brand-600 font-semibold animate-pulse">Compressing...</span>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">Upload brand logo</span>
                        <span className="text-[11px] text-slate-400">JPG, PNG, WEBP · Auto-converted to WebP &amp; compressed &lt; 500KB</span>
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
                  Brand Heritage / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Description of the artisan background and textile specializations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
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
                  <option value="false">Inactive (Disabled)</option>
                </select>
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
                  {submitLoading ? 'Saving...' : editingBrand ? 'Save Changes' : 'Create Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
