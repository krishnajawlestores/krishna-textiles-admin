'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { useModal } from '@/app/ModalContext';
import { 
  Layers, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  Tag, 
  X, 
  Star,
  CheckCircle2,
  AlertCircle,
  Filter,
  Boxes,
  Upload,
  Camera,
  Palette
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Crimson Red', hex: '#d32f2f' },
  { name: 'Royal Navy', hex: '#0c2340' },
  { name: 'Temple Gold', hex: '#c59b27' },
  { name: 'Emerald Green', hex: '#2e7d32' },
  { name: 'Peacock Blue', hex: '#00838f' },
  { name: 'Deep Maroon', hex: '#880e4f' },
  { name: 'Sunset Orange', hex: '#e65100' },
  { name: 'Classic Black', hex: '#212121' },
  { name: 'Pearl White', hex: '#f8fafc' },
];

const ADULT_SIZES = [
  'Free Size', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL',
  'Standard 6.2m', 'Standard 5.5m', 'Dhoti 4.0m', 'Dhoti 3.6m', 'Angavastram', 'King (108x108)', 'Queen (90x100)'
];

const CHILD_SIZES = [
  '0-6M', '6-12M', '1-2Y', '2-3Y', '3-4Y', '4-5Y', '5-6Y', '7-8Y', '9-10Y', '11-12Y', '13-14Y', '15-16Y',
  'Kids S', 'Kids M', 'Kids L', 'Kids XL'
];

const COMMON_SIZES = [...ADULT_SIZES, ...CHILD_SIZES];
const MAX_IMAGES = 5;
const MAX_SIZE_KB = 490; // Strictly under 500 KB limit
import { compressImage } from '@/lib/imageCompressor';

export default function ProductsPage() {
  const { confirm: confirmModal } = useModal();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [customSize, setCustomSize] = useState('');

  // Raw uploaded images as data URLs (max 5)
  const [uploadedImages, setUploadedImages] = useState([]);
  const fileInputRef = useRef(null);

  // Color variants: [{ id, name, hex, image }]
  const [colorVariants, setColorVariants] = useState([]);
  const [colorCompressingIndex, setColorCompressingIndex] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    category: '',
    brandRefId: '',
    brand: '',
    brandId: '',
    price: 999,
    mrp: 1499,
    discount: 33,
    stock: 50,
    minStockAlert: 15,
    sizes: ['Standard 6.2m'],
    description: '',
    bestSeller: false,
  });

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, limit, selectedCategory, selectedBrand]);

  const loadMetadata = async () => {
    try {
      const [catsRes, brandsRes] = await Promise.all([
        api.categories.getAll().catch(() => []),
        api.brands.getAll().catch(() => []),
      ]);
      setCategories(Array.isArray(catsRes) ? catsRes : []);
      setBrands(Array.isArray(brandsRes) ? brandsRes : []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.products.getAll({
        search: search || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        brandId: selectedBrand !== 'all' ? selectedBrand : undefined,
        page,
        limit,
      });
      if (res?.data) {
        setProducts(res.data);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    const defaultCat = categories[0];
    setFormData({
      name: '',
      sku: '',
      categoryId: defaultCat?.id || '',
      category: defaultCat?.slug || '',
      brandRefId: '',
      brand: '',
      brandId: '',
      price: 2499,
      mrp: 3999,
      discount: 38,
      stock: 60,
      minStockAlert: 15,
      sizes: ['Free Size'],
      description: '',
      bestSeller: false,
    });
    setUploadedImages([]);
    setColorVariants([]);
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || '',
      categoryId: p.categoryId || '',
      category: p.category || '',
      brandRefId: p.brandRefId || '',
      brand: p.brand || '',
      brandId: p.brandId || '',
      price: p.price,
      mrp: p.mrp,
      discount: p.discount || Math.round(((p.mrp - p.price) / p.mrp) * 100),
      stock: p.stock,
      minStockAlert: p.minStockAlert || 15,
      sizes: Array.isArray(p.sizes) ? p.sizes : ['M', 'L'],
      description: p.description || '',
      bestSeller: Boolean(p.bestSeller),
    });
    // Populate existing images (imageUrl + images array)
    const existingImgs = [];
    if (p.imageUrl) existingImgs.push(p.imageUrl);
    if (Array.isArray(p.images)) {
      p.images.forEach((img) => {
        if (img && !existingImgs.includes(img)) existingImgs.push(img);
      });
    }
    setUploadedImages(existingImgs.slice(0, MAX_IMAGES));
    // Populate existing color variants safely
    let rawColors = [];
    if (Array.isArray(p.colors)) {
      rawColors = p.colors;
    } else if (typeof p.colors === 'string') {
      try { rawColors = JSON.parse(p.colors); } catch(e) {}
    }
    if (Array.isArray(rawColors) && rawColors.length > 0) {
      setColorVariants(
        rawColors.map((c, i) => ({
          id: c.id || `col-${i}-${Date.now()}`,
          name: c.name || '',
          hex: c.hex || '#d32f2f',
          image: c.image || '',
        }))
      );
    } else {
      setColorVariants([]);
    }
    setShowModal(true);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - uploadedImages.length;
    if (remaining <= 0) {
      setMessage({ type: 'error', text: `Maximum ${MAX_IMAGES} images allowed. Remove some to add more.` });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const toProcess = files.slice(0, remaining);
    setCompressing(true);
    try {
      const compressed = await Promise.all(toProcess.map((f) => compressImage(f)));
      setUploadedImages((prev) => [...prev, ...compressed].slice(0, MAX_IMAGES));
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to process image. Please try again.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddColorVariant = () => {
    setColorVariants((prev) => [
      ...prev,
      {
        id: 'col-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        name: '',
        hex: '#d32f2f',
        image: '',
      },
    ]);
  };

  const handleUpdateColorVariant = (idx, field, value) => {
    setColorVariants((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleRemoveColorVariant = (idx) => {
    setColorVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleColorImageUpload = async (idx, file) => {
    if (!file) return;
    setColorCompressingIndex(idx);
    try {
      const compressed = await compressImage(file);
      setColorVariants((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], image: compressed };
        return copy;
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to process color image. Please try again.' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setColorCompressingIndex(null);
    }
  };

  const handleRemoveColorImage = (idx) => {
    setColorVariants((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], image: '' };
      return copy;
    });
  };

  const handlePriceChange = (priceVal, mrpVal) => {
    const p = Number(priceVal);
    const m = Number(mrpVal);
    let disc = 0;
    if (m > 0 && m >= p) {
      disc = Math.round(((m - p) / m) * 100);
    }
    setFormData((prev) => ({
      ...prev,
      price: p,
      mrp: m,
      discount: disc,
    }));
  };

  const toggleSize = (size) => {
    setFormData((prev) => {
      const exists = prev.sizes.includes(size);
      return {
        ...prev,
        sizes: exists ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
      };
    });
  };

  const handleAddCustomSize = () => {
    const trimmed = customSize.trim();
    if (!trimmed) return;
    if (!formData.sizes.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        sizes: [...prev.sizes, trimmed],
      }));
    }
    setCustomSize('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const cleanColors = colorVariants
      .filter((c) => c.name.trim() || c.image)
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        hex: c.hex || '#0c2340',
        image: c.image || '',
      }));

    // If uploadedImages is empty but color variants have images, populate uploadedImages
    let finalImages = [...uploadedImages];
    if (finalImages.length === 0) {
      const colorImgs = cleanColors.map((c) => c.image).filter(Boolean);
      finalImages = colorImgs.slice(0, MAX_IMAGES);
    }

    if (finalImages.length === 0) {
      setMessage({ type: 'error', text: 'Please upload at least one product photo or color image.' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }
    setSubmitLoading(true);

    try {
      const payload = {
        ...formData,
        brand: formData.brand || '',
        brandId: formData.brandId || '',
        brandRefId: formData.brandRefId || null,
        categoryId: formData.categoryId || null,
        price: Number(formData.price),
        mrp: Number(formData.mrp),
        discount: Number(formData.discount),
        stock: Number(formData.stock),
        minStockAlert: Number(formData.minStockAlert),
        imageUrl: finalImages[0] || '',
        images: finalImages,
        colors: cleanColors,
      };

      if (editingProduct) {
        await api.products.update(editingProduct.id, payload);
        setMessage({ type: 'success', text: `Product '${formData.name}' updated successfully` });
      } else {
        await api.products.create(payload);
        setMessage({ type: 'success', text: `Product '${formData.name}' created successfully` });
      }

      setShowModal(false);
      await loadProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save product' });
    } finally {
      setSubmitLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDelete = async (p) => {
    const isConfirmed = await confirmModal({
      title: 'Delete Product',
      message: `Are you sure you want to delete '${p.name}'? This action cannot be undone.`,
      confirmText: 'Delete Product',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    try {
      await api.products.delete(p.id);
      setMessage({ type: 'success', text: `Product '${p.name}' deleted successfully` });
      await loadProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Products Master Catalog"
        subtitle="Manage textile product inventory, raw photos (max 5 per product), dynamic pricing, categories, and stock limits"
        onRefresh={loadProducts}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6 flex-1 w-full">
        {/* Alerts */}
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

        {/* Filter & Action Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-dark-900 p-4 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </form>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
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
              <option value="100">100 / page</option>
            </select>

            <button
              onClick={handleOpenCreate}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-700 bg-slate-50/70 dark:bg-dark-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6 font-semibold">Product & Image</th>
                  <th className="py-3.5 px-6 font-semibold">Brand & Category</th>
                  <th className="py-3.5 px-6 font-semibold">Pricing</th>
                  <th className="py-3.5 px-6 font-semibold">Stock Level</th>
                  <th className="py-3.5 px-6 font-semibold">Sizes</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Loading catalog...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">No products found.</td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3.5">
                          {/* Show up to 2 image thumbnails */}
                          <div className="flex space-x-1 flex-shrink-0">
                            {(p.images?.length > 0 ? p.images : p.imageUrl ? [p.imageUrl] : []).slice(0, 2).map((img, idx) => (
                              <div key={idx} className="w-10 h-12 rounded-lg bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm">
                                <img src={img} alt={p.name} className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {!p.imageUrl && (!p.images || p.images.length === 0) && (
                              <div className="w-10 h-12 rounded-lg bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                              {p.bestSeller && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                                  Bestseller
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">SKU: {p.sku}</div>
                            {p.images?.length > 1 && (
                              <div className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5">{p.images.length} photos</div>
                            )}
                            {Array.isArray(p.colors) && p.colors.length > 0 && (
                              <div className="flex items-center space-x-1 mt-1">
                                {p.colors.slice(0, 5).map((col, ci) => (
                                  <span
                                    key={ci}
                                    title={col.name || 'Color'}
                                    className="w-2.5 h-2.5 rounded-full border border-white dark:border-dark-900 shadow-xs inline-block"
                                    style={{ backgroundColor: col.hex || '#0c2340' }}
                                  />
                                ))}
                                {p.colors.length > 5 && (
                                  <span className="text-[9px] text-slate-400">+{p.colors.length - 5}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {p.brandRef?.name || p.brand || (
                            <span className="text-slate-400 font-normal italic text-[11px]">No Brand</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                          {p.categoryRef?.name || p.category?.replace(/-/g, ' ')}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white">
                          <span>₹{p.price?.toLocaleString('en-IN')}</span>
                          {p.mrp > p.price && (
                            <span className="text-[11px] text-slate-400 line-through font-normal">
                              ₹{p.mrp?.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        {p.discount > 0 && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            {p.discount}% OFF
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold ${
                            p.stock <= 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : p.stock <= (p.minStockAlert || 20)
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}>
                            {p.stock} Units
                          </span>
                          {p.stock <= (p.minStockAlert || 20) && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              Low
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Threshold: {p.minStockAlert || 20}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Array.isArray(p.sizes) && p.sizes.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Full Pagination Component */}
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={setPage}
            itemName="products"
          />
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{editingProduct ? 'Edit Catalog Product' : 'Add New Textile Product'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kanchipuram Temple Border Pure Silk Saree"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Raw Image Upload - Max 5 Images, 500KB each */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Product Images (Raw Upload — Max {MAX_IMAGES} photos, auto-compressed to {MAX_SIZE_KB}KB)
                </label>

                {/* Image Previews Grid */}
                {uploadedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative group w-20 h-24 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-dark-700 bg-slate-100 dark:bg-dark-800 shadow-sm">
                        <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <div className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-bold bg-brand-600 text-white">
                            Main
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {uploadedImages.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-600 flex flex-col items-center justify-center text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Add</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Upload Button */}
                {uploadedImages.length === 0 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-slate-300 dark:border-dark-600 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all"
                  >
                    {compressing ? (
                      <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold animate-pulse">
                        Compressing images...
                      </div>
                    ) : (
                      <>
                        <Upload className="w-7 h-7 text-slate-400 mb-2" />
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Click to upload product photos
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          JPG, PNG, WEBP · Max {MAX_IMAGES} images · Auto-converted to WebP &amp; compressed &lt; 500KB
                        </div>
                      </>
                    )}
                  </div>
                )}

                {compressing && uploadedImages.length > 0 && (
                  <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold animate-pulse mt-2">
                    Compressing images...
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {uploadedImages.length > 0 && (
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {uploadedImages.length}/{MAX_IMAGES} images added · First image is the main thumbnail
                  </p>
                )}
              </div>

              {/* Color Variants Section with Individual Color Images */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-800/80 border border-slate-200 dark:border-dark-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Color Variants & Color-Specific Images
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Add fabric colors and attach custom photos for each color shade
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddColorVariant}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Color</span>
                  </button>
                </div>

                {colorVariants.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-dark-650 text-center bg-white/60 dark:bg-dark-900/60">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                      No color variants added yet.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddColorVariant}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-dark-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-dark-600 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand-600" />
                      <span>+ Add Color with Photo</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {colorVariants.map((col, idx) => (
                      <div
                        key={col.id || idx}
                        className="p-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Color Option #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveColorVariant(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remove color"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          {/* Color Swatch & Name */}
                          <div className="sm:col-span-7 flex items-center space-x-2.5">
                            <div className="relative shrink-0">
                              <input
                                type="color"
                                value={col.hex || '#d32f2f'}
                                onChange={(e) => handleUpdateColorVariant(idx, 'hex', e.target.value)}
                                className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-dark-600 p-0.5 bg-transparent"
                                title="Pick color swatch"
                              />
                            </div>

                            <div className="flex-1 space-y-1">
                              <input
                                type="text"
                                placeholder="Color Name (e.g. Maroon, Peacock Blue)"
                                value={col.name}
                                onChange={(e) => handleUpdateColorVariant(idx, 'name', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] font-mono text-slate-400">Hex:</span>
                                <input
                                  type="text"
                                  placeholder="#HEX"
                                  value={col.hex}
                                  onChange={(e) => handleUpdateColorVariant(idx, 'hex', e.target.value)}
                                  className="w-20 px-1.5 py-0.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Dedicated Color-Specific Product Photo (e.g. Red Shirt photo) */}
                          <div className="sm:col-span-5 flex items-center justify-end space-x-2">
                            {col.image ? (
                              <div className="relative group w-16 h-20 rounded-xl overflow-hidden border-2 border-brand-500/50 bg-slate-100 dark:bg-dark-800 shrink-0 shadow-sm">
                                <img
                                  src={col.image}
                                  alt={col.name || 'Color shirt photo'}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-1 left-1 bg-black/70 text-white text-[8px] font-extrabold px-1 rounded truncate max-w-[55px]">
                                  {col.name || 'Photo'}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveColorImage(idx)}
                                  className="absolute inset-0 bg-rose-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove photo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : null}

                            <div className="flex-1 max-w-[210px]">
                              <label className={`w-full p-2.5 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                                col.image
                                  ? 'border-slate-300 dark:border-dark-600 hover:border-brand-400 bg-slate-50 dark:bg-dark-800'
                                  : 'border-brand-400/60 hover:border-brand-500 bg-brand-50/20 dark:bg-brand-950/20 hover:bg-brand-50/40'
                              }`}>
                                {colorCompressingIndex === idx ? (
                                  <span className="text-[10px] text-brand-600 font-bold animate-pulse py-1">
                                    Compressing...
                                  </span>
                                ) : (
                                  <>
                                    <Camera className="w-4 h-4 text-brand-600 dark:text-brand-400 mb-1" />
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                      {col.image ? 'Change Photo' : `Upload ${col.name || 'Color'} Shirt Photo`}
                                    </span>
                                    <span className="text-[9px] text-slate-400 mt-0.5">
                                      {col.name ? `${col.name} photo (WebP < 500KB)` : 'Auto WebP compressed < 500KB'}
                                    </span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={colorCompressingIndex === idx}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleColorImageUpload(idx, file);
                                    e.target.value = '';
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Quick preset chips */}
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
                          {COLOR_PRESETS.map((p) => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                handleUpdateColorVariant(idx, 'name', p.name);
                                handleUpdateColorVariant(idx, 'hex', p.hex);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-dark-700 flex items-center space-x-1 border border-slate-200 dark:border-dark-700 transition-colors cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.hex }}></span>
                              <span>{p.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Category & Brand Selectors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId || formData.category}
                    onChange={(e) => {
                      const sel = categories.find((c) => c.id === e.target.value || c.slug === e.target.value);
                      setFormData({
                        ...formData,
                        categoryId: sel?.id || '',
                        category: sel?.slug || e.target.value,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Brand
                    </label>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded">
                      Optional
                    </span>
                  </div>
                  <select
                    value={formData.brandRefId || formData.brandId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setFormData({
                          ...formData,
                          brandRefId: '',
                          brandId: '',
                          brand: '',
                        });
                        return;
                      }
                      const sel = brands.find((b) => b.id === val || b.slug === val);
                      setFormData({
                        ...formData,
                        brandRefId: sel?.id || '',
                        brandId: sel?.slug || val,
                        brand: sel?.name || '',
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  >
                    <option value="">— None / No Brand (Optional) —</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => handlePriceChange(e.target.value, formData.mrp)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    MRP (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.mrp}
                    onChange={(e) => handlePriceChange(formData.price, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    readOnly
                    value={formData.discount}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-dark-750 border border-slate-200 dark:border-dark-700 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              {/* Stock and SKU */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Available Stock *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Low Stock Alert Qty
                  </label>
                  <input
                    type="number"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Custom SKU (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto generated"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Sizes Selector (Categorized into Adult & Child) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 dark:text-white">
                    Supported Sizes / Lengths
                  </label>
                  <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                    {formData.sizes.length} selected
                  </span>
                </div>

                {/* Dedicated Free Size Quick Option */}
                <div className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
                  formData.sizes.includes('Free Size')
                    ? 'bg-brand-50/80 dark:bg-brand-950/40 border-brand-300 dark:border-brand-700/80'
                    : 'bg-slate-50 dark:bg-dark-800/70 border-slate-200 dark:border-dark-700/80'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-colors shrink-0 ${
                      formData.sizes.includes('Free Size')
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                        : 'bg-slate-200 dark:bg-dark-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      FS
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Free Size Option
                        </span>
                        {formData.sizes.includes('Free Size') ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        One size fits all — Sarees, Dhotis, Shawls, Towels & Unstitched Materials
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSize('Free Size')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap self-end sm:self-center ${
                      formData.sizes.includes('Free Size')
                        ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/30'
                        : 'bg-white dark:bg-dark-900 text-brand-600 dark:text-brand-400 border border-brand-300 dark:border-brand-700/60 hover:bg-brand-50 dark:hover:bg-brand-950/50'
                    }`}
                  >
                    {formData.sizes.includes('Free Size') ? '✓ Free Size Selected' : '+ Select Free Size'}
                  </button>
                </div>

                {/* Category 1: Adult */}
                <div className="p-3 bg-slate-50 dark:bg-dark-800/70 border border-slate-200 dark:border-dark-700/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                        Category 1
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Adult (Apparel & Traditional Lengths)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allAdultSelected = ADULT_SIZES.every((s) => formData.sizes.includes(s));
                          if (allAdultSelected) {
                            setFormData((prev) => ({
                              ...prev,
                              sizes: prev.sizes.filter((s) => !ADULT_SIZES.includes(s)),
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              sizes: Array.from(new Set([...prev.sizes, ...ADULT_SIZES])),
                            }));
                          }
                        }}
                        className="text-[10px] font-semibold text-brand-600 hover:underline cursor-pointer"
                      >
                        {ADULT_SIZES.every((s) => formData.sizes.includes(s)) ? 'Deselect All' : 'Select All Adult'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ADULT_SIZES.map((sz) => {
                      const isSelected = formData.sizes.includes(sz);
                      const isFreeSize = sz === 'Free Size';
                      return (
                        <button
                          type="button"
                          key={sz}
                          onClick={() => toggleSize(sz)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? isFreeSize
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/20'
                                : 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-600/20'
                              : isFreeSize
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/80 hover:border-amber-400 font-bold'
                                : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-brand-400'
                          }`}
                        >
                          {isFreeSize ? '★ Free Size' : sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category 2: Child */}
                <div className="p-3 bg-slate-50 dark:bg-dark-800/70 border border-slate-200 dark:border-dark-700/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                        Category 2
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Child (Infants, Toddlers & Kids)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allChildSelected = CHILD_SIZES.every((s) => formData.sizes.includes(s));
                          if (allChildSelected) {
                            setFormData((prev) => ({
                              ...prev,
                              sizes: prev.sizes.filter((s) => !CHILD_SIZES.includes(s)),
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              sizes: Array.from(new Set([...prev.sizes, ...CHILD_SIZES])),
                            }));
                          }
                        }}
                        className="text-[10px] font-semibold text-brand-600 hover:underline cursor-pointer"
                      >
                        {CHILD_SIZES.every((s) => formData.sizes.includes(s)) ? 'Deselect All' : 'Select All Child'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {CHILD_SIZES.map((sz) => {
                      const isSelected = formData.sizes.includes(sz);
                      return (
                        <button
                          type="button"
                          key={sz}
                          onClick={() => toggleSize(sz)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/20'
                              : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-amber-400'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Sizing Adder */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add custom size (e.g. 5.2m, 32 Waist, Jumbo)..."
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSize();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSize}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-dark-800 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-dark-700 transition-colors cursor-pointer"
                  >
                    + Add Size
                  </button>
                </div>

                {/* Show any selected custom sizes not in adult/child lists */}
                {formData.sizes.filter((s) => !ADULT_SIZES.includes(s) && !CHILD_SIZES.includes(s)).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-400">Custom Selected:</span>
                    {formData.sizes
                      .filter((s) => !ADULT_SIZES.includes(s) && !CHILD_SIZES.includes(s))
                      .map((sz) => (
                        <span
                          key={sz}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-brand-500/10 text-brand-600 border border-brand-500/30"
                        >
                          <span>{sz}</span>
                          <button
                            type="button"
                            onClick={() => toggleSize(sz)}
                            className="hover:text-rose-600 text-slate-400 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Product Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed weave details, fabric count, zari specifications..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              {/* Bestseller Checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="bestSeller"
                  checked={formData.bestSeller}
                  onChange={(e) => setFormData({ ...formData, bestSeller: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="bestSeller" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                  Highlight as Bestseller / Featured Product
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-dark-700 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading || compressing}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-600/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitLoading ? 'Saving...' : compressing ? 'Compressing...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
