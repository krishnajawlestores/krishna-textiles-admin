'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { api } from '@/lib/api';
import Link from 'next/link';
import { 
  Image as ImageIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ExternalLink, 
  X, 
  Save, 
  Eye,
  Layers,
  Sparkles,
  Upload
} from 'lucide-react';
import { compressImage } from '@/lib/imageCompressor';

export default function CmsBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    tag: '',
    subtitle: '',
    image: '',
    linkUrl: '/category/all',
    buttonText: 'Explore Catalog',
    secondaryLinkUrl: '',
    secondaryButtonText: '',
    badgeText: '',
    accentColor: '#c59b27',
    priority: 1,
    isActive: true,
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await api.cms.getBanners();
      if (res?.data) setBanners(res.data);
    } catch (e) {
      console.error(e);
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

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setImagePreview('');
    setFormData({
      title: '',
      tag: 'NEW FESTIVE ARRIVALS',
      subtitle: '',
      image: '',
      linkUrl: '/category/all',
      buttonText: 'Shop Collection',
      secondaryLinkUrl: '',
      secondaryButtonText: '',
      badgeText: 'Direct Mill Weave',
      accentColor: '#c59b27',
      priority: banners.length + 1,
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBanner(b);
    setImagePreview(b.image || '');
    setFormData({
      title: b.title || '',
      tag: b.tag || '',
      subtitle: b.subtitle || '',
      image: b.image || '',
      linkUrl: b.linkUrl || '/category/all',
      buttonText: b.buttonText || 'Shop Now',
      secondaryLinkUrl: b.secondaryLinkUrl || '',
      secondaryButtonText: b.secondaryButtonText || '',
      badgeText: b.badgeText || '',
      accentColor: b.accentColor || '#c59b27',
      priority: b.priority || 1,
      isActive: b.isActive !== undefined ? b.isActive : true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.image) {
      setMessage({ type: 'error', text: 'Please upload a banner image.' });
      setTimeout(() => setMessage(null), 3500);
      return;
    }
    setSubmitting(true);
    try {
      if (editingBanner) {
        await api.cms.updateBanner(editingBanner.id, formData);
        setMessage({ type: 'success', text: 'Banner updated successfully!' });
      } else {
        await api.cms.createBanner(formData);
        setMessage({ type: 'success', text: 'New hero banner created successfully!' });
      }
      setShowModal(false);
      await loadBanners();
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save banner' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await api.cms.deleteBanner(id);
      setMessage({ type: 'success', text: 'Banner removed successfully' });
      await loadBanners();
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      alert(err.message || 'Failed to delete banner');
    }
  };

  const handleToggleStatus = async (b) => {
    try {
      await api.cms.updateBanner(b.id, { isActive: !b.isActive });
      await loadBanners();
    } catch (e) {
      alert('Failed to toggle status');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Hero Banners & Promotional Sliders"
        subtitle="Configure homepage rotating carousel slides, promotional banners, imagery, call-to-action buttons, and tags"
        onRefresh={loadBanners}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6 flex-1 w-full">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link
            href="/cms"
            className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to CMS Hub
          </Link>

          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Hero Banner</span>
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl flex items-center space-x-2 text-xs font-semibold shadow-sm ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Banners Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              Loading hero banners...
            </div>
          ) : banners.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              No banners created yet. Click "Create New Hero Banner" to add one.
            </div>
          ) : (
            banners.map((b) => (
              <div
                key={b.id}
                className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm flex flex-col group transition-all hover:shadow-md"
              >
                {/* Banner Thumbnail Preview */}
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                  <img
                    src={b.image}
                    alt={b.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm border border-white/20">
                      Priority: #{b.priority}
                    </span>
                    {b.badgeText && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-600 text-white shadow-sm">
                        {b.badgeText}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleToggleStatus(b)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm transition-all ${
                        b.isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {b.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    {b.tag && (
                      <div className="text-[9px] font-extrabold tracking-wider uppercase opacity-80 mb-0.5" style={{ color: b.accentColor || '#fff' }}>
                        {b.tag}
                      </div>
                    )}
                    <h4 className="font-bold text-sm leading-snug line-clamp-2">{b.title.replace('\n', ' ')}</h4>
                  </div>
                </div>

                {/* Banner Details Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {b.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {b.subtitle}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-dark-800 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Primary CTA:</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px] text-right">
                          {b.buttonText} ({b.linkUrl})
                        </span>
                      </div>
                      {b.secondaryButtonText && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Secondary CTA:</span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px] text-right">
                            {b.secondaryButtonText} ({b.secondaryLinkUrl})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleStatus(b)}
                      className="text-xs font-semibold text-slate-500 hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      {b.isActive ? 'Turn Off' : 'Publish Live'}
                    </button>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-800"
                        title="Edit Banner"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-dark-800"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Banner Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-dark-700 flex items-center justify-between sticky top-0 bg-white dark:bg-dark-900 z-10">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingBanner ? 'Edit Hero Banner' : 'Create New Hero Banner'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banner Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure Banarasi & Kanchipuram Silk Heritage"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Top Category Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FESTIVE COLLECTION"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Up to 40% Off"
                    value={formData.badgeText}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subtitle / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Supporting marketing message or fabric highlight..."
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banner Image * (Raw Upload — auto-compressed to 500KB)
                </label>
                {imagePreview ? (
                  <div className="relative group mt-1">
                    <div className="h-36 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-dark-700 bg-slate-100 dark:bg-dark-800">
                      <img src={imagePreview} alt="Banner Preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setImagePreview(''); setFormData((p) => ({ ...p, image: '' })); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow hover:bg-rose-600 transition-colors"
                      title="Remove Image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center justify-between mt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                      >
                        Change Image
                      </button>
                      <span className="text-[10px] text-slate-400">Ready for publish</span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-28 rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-600 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/5 dark:hover:bg-brand-500/5 transition-all mt-1"
                  >
                    {compressing ? (
                      <span className="text-xs text-brand-600 font-semibold animate-pulse">Compressing image...</span>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Click to upload banner image</span>
                        <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WEBP · Auto-converted to WebP &amp; compressed &lt; 500KB</span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageFile(f);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Button Text
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Link URL
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Secondary Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. View Offers"
                    value={formData.secondaryButtonText}
                    onChange={(e) => setFormData({ ...formData, secondaryButtonText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Secondary Link URL
                  </label>
                  <input
                    type="text"
                    placeholder="/offers"
                    value={formData.secondaryLinkUrl}
                    onChange={(e) => setFormData({ ...formData, secondaryLinkUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slide Priority / Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                    Publish Live on Storefront
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-dark-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
