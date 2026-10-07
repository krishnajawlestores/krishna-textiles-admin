'use client';

import { useState, useEffect, useRef } from 'react';
import { useModal } from '@/app/ModalContext';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { 
  Percent, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Sparkles,
  Layers,
  Award,
  Upload,
  LayoutGrid,
  List
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

export default function OffersPage() {
  const { confirm: confirmModal } = useModal();
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bannerImage: '',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    targetType: 'ALL',
    targetId: '',
    targetName: '',
    badgeText: 'FESTIVE SPECIAL',
    priority: 1,
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersRes, catRes, brandRes] = await Promise.all([
        api.offers.getAll(),
        api.categories.getAll().catch(() => []),
        api.brands.getAll().catch(() => []),
      ]);
      setOffers(Array.isArray(offersRes) ? offersRes : []);
      setCategories(Array.isArray(catRes) ? catRes : []);
      setBrands(Array.isArray(brandRes) ? brandRes : []);
    } catch (e) {
      console.error('Failed to load offers', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (off = null) => {
    if (off) {
      setEditingOffer(off);
      setImagePreview(off.bannerImage || '');
      setFormData({
        title: off.title || '',
        description: off.description || '',
        bannerImage: off.bannerImage || '',
        discountType: off.discountType || 'PERCENTAGE',
        discountValue: off.discountValue || 0,
        targetType: off.targetType || 'ALL',
        targetId: off.targetId || '',
        targetName: off.targetName || '',
        badgeText: off.badgeText || '',
        priority: off.priority || 0,
        startDate: off.startDate ? off.startDate.split('T')[0] : '',
        endDate: off.endDate ? off.endDate.split('T')[0] : '',
        isActive: off.isActive !== undefined ? off.isActive : true,
      });
    } else {
      setEditingOffer(null);
      setImagePreview('');
      setFormData({
        title: '',
        description: '',
        bannerImage: '',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        targetType: 'ALL',
        targetId: '',
        targetName: '',
        badgeText: 'FESTIVE SPECIAL',
        priority: offers.length + 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isActive: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOffer(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
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
      setFormData((prev) => ({ ...prev, bannerImage: finalUrl }));
    } catch (err) {
      console.error('Image compression failed', err);
      setMessage({ type: 'error', text: 'Failed to process image' });
    } finally {
      setCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData((prev) => ({ ...prev, bannerImage: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSubmitLoading(true);

    try {
      if (editingOffer) {
        await api.offers.update(editingOffer.id, formData);
        setMessage({ type: 'success', text: `Offer '${formData.title}' updated successfully` });
      } else {
        await api.offers.create(formData);
        setMessage({ type: 'success', text: `Offer '${formData.title}' created successfully` });
      }
      handleCloseModal();
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save offer' });
    } finally {
      setSubmitLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDelete = async (off) => {
    const ok = await confirmModal(
      `Delete offer '${off.title}'?`,
      `This action cannot be undone. The promotional campaign will be permanently removed.`
    );
    if (!ok) return;
    try {
      await api.offers.delete(off.id);
      setMessage({ type: 'success', text: `Offer '${off.title}' deleted` });
      await loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete offer' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  const filteredOffers = offers.filter((off) =>
    off.title.toLowerCase().includes(search.toLowerCase()) ||
    (off.description && off.description.toLowerCase().includes(search.toLowerCase())) ||
    (off.badgeText && off.badgeText.toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedOffers = filteredOffers.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Promotional Offers & Campaigns"
        subtitle="Configure festive season banners, flash sales, targeted category discounts, and homepage hero highlights"
        onRefresh={loadData}
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
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
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
                title="Cards View"
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
              <span>Create Offer</span>
            </button>
          </div>
        </div>

        {/* Offers Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-200 dark:bg-dark-800"></div>
            ))}
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 p-12 text-center">
            <Percent className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No campaigns found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {search ? 'Try adjusting your search query.' : 'Create your first promotional campaign banner to engage customers.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-dark-700 bg-slate-50/70 dark:bg-dark-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6 font-semibold">Campaign & Banner</th>
                    <th className="py-3.5 px-6 font-semibold">Discount</th>
                    <th className="py-3.5 px-6 font-semibold">Target</th>
                    <th className="py-3.5 px-6 font-semibold">Validity</th>
                    <th className="py-3.5 px-6 font-semibold">Priority</th>
                    <th className="py-3.5 px-6 font-semibold">Status</th>
                    <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800 text-slate-700 dark:text-slate-300">
                  {paginatedOffers.map((off) => (
                    <tr key={off.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-14 h-10 rounded-lg bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 overflow-hidden flex-shrink-0">
                            {off.bannerImage ? (
                              <img src={off.bannerImage} alt={off.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-4 h-4 opacity-40" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{off.title}</div>
                            {off.badgeText && (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-600 text-white mt-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>{off.badgeText}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-bold">
                        <span className="text-amber-600 dark:text-amber-400">
                          {off.discountValue}%{off.discountType === 'FIXED' ? ' FLAT' : ' OFF'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                        {off.targetType === 'ALL' ? (
                          <span className="font-semibold text-slate-700 dark:text-slate-200">All Products</span>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-700 dark:text-slate-200">{off.targetName || off.targetType}</div>
                            <div className="text-[10px]">{off.targetType}</div>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(off.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {off.endDate ? ` – ${new Date(off.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ' (Ongoing)'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">#{off.priority || 0}</span>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          off.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {off.isActive ? 'Live' : 'Paused'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenModal(off)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                            title="Edit Offer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(off)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                            title="Delete Offer"
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
              totalPages={Math.ceil(filteredOffers.length / limit) || 1}
              totalItems={filteredOffers.length}
              limit={limit}
              onPageChange={setPage}
              itemName="promotional campaigns"
            />
          </div>
        ) : (
          /* Cards Grid View */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedOffers.map((off) => (
                <div
                  key={off.id}
                  className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* Banner Image */}
                    <div className="h-48 relative bg-slate-100 dark:bg-dark-800 overflow-hidden">
                      {off.bannerImage ? (
                        <img
                          src={off.bannerImage}
                          alt={off.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon className="w-10 h-10 mb-1 opacity-50" />
                          <span className="text-[11px]">No banner image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        {off.badgeText ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-600 text-white shadow-lg shadow-brand-600/30 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3" />
                            <span>{off.badgeText}</span>
                          </span>
                        ) : <div></div>}

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md ${
                          off.isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {off.isActive ? 'Live' : 'Paused'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <div className="text-xl font-black text-amber-400 flex items-center space-x-1">
                          <span>{off.discountValue}% OFF</span>
                          <span className="text-xs font-semibold text-white/90">
                            • {off.targetType === 'ALL' ? 'Entire Catalog' : off.targetName || off.targetType}
                          </span>
                        </div>
                        <h3 className="text-base font-bold drop-shadow-sm truncate">{off.title}</h3>
                      </div>
                    </div>

                    {/* Description & Target */}
                    <div className="p-5 space-y-3">
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {off.description || 'No detailed description.'}
                      </p>

                      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          From {new Date(off.startDate).toLocaleDateString()} {off.endDate ? `to ${new Date(off.endDate).toLocaleDateString()}` : '(Ongoing)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between bg-slate-50/50 dark:bg-dark-950/40">
                    <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                      Priority #{off.priority || 0}
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenModal(off)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                        title="Edit Offer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(off)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                        title="Delete Offer"
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
              totalPages={Math.ceil(filteredOffers.length / limit) || 1}
              totalItems={filteredOffers.length}
              limit={limit}
              onPageChange={setPage}
              itemName="promotional campaigns"
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
                <Percent className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{editingOffer ? 'Edit Promotional Offer' : 'Create Promotional Campaign'}</span>
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Diwali & Pongal Silk Fest"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Banner Hero Image (Raw Upload — auto-compressed to 500KB)
                </label>
                {imagePreview ? (
                  <div className="relative group mt-1">
                    <div className="w-full h-36 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-dark-700 bg-slate-100 dark:bg-dark-800">
                      <img src={imagePreview} alt="Banner preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                      >
                        Change Image
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-xs text-rose-500 font-semibold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 border-2 border-dashed border-slate-200 dark:border-dark-700 hover:border-brand-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-dark-800/50 hover:bg-brand-50/20"
                  >
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {compressing ? 'Processing & Compressing...' : 'Click to upload banner image'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG, WebP • Auto-converted to WebP &amp; compressed &lt; 500KB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LIMITED TIME, DIWALI 2026"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Target Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Applies To
                  </label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => {
                      const t = e.target.value;
                      setFormData({ ...formData, targetType: t, targetId: '', targetName: '' });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    <option value="ALL">Entire Store Catalog</option>
                    <option value="CATEGORY">Specific Category</option>
                    <option value="BRAND">Specific Brand</option>
                  </select>
                </div>

                {formData.targetType === 'CATEGORY' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Category
                    </label>
                    <select
                      value={formData.targetId}
                      onChange={(e) => {
                        const sel = categories.find((c) => c.id === e.target.value);
                        setFormData({ ...formData, targetId: e.target.value, targetName: sel?.name || '' });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="">-- Choose Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.targetType === 'BRAND' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Brand
                    </label>
                    <select
                      value={formData.targetId}
                      onChange={(e) => {
                        const sel = brands.find((b) => b.id === e.target.value);
                        setFormData({ ...formData, targetId: e.target.value, targetName: sel?.name || '' });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="">-- Choose Brand --</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Campaign Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Offer details and terms..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Campaign Status
                </label>
                <select
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="true">Active (Live on Store)</option>
                  <option value="false">Paused / Draft</option>
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
                  {submitLoading ? 'Saving...' : editingOffer ? 'Save Changes' : 'Publish Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
