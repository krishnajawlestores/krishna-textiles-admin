'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Pagination from '@/components/Pagination';
import { api } from '@/lib/api';
import { useModal } from '@/app/ModalContext';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Printer, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Eye, 
  X, 
  FileText,
  IndianRupee,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Calendar,
  History,
  Tag,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const FULFILLMENT_STAGES = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'CONFIRMED', label: 'Dispatch Pending' },
  { id: 'DISPATCHED', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export default function OrdersPage() {
  const { alert: showModalAlert, confirm: showConfirmModal } = useModal();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals / Drawers
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [targetStatus, setTargetStatus] = useState('CONFIRMED');
  const [orderHistory, setOrderHistory] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierPartner, setCourierPartner] = useState('');
  const [dispatchedAt, setDispatchedAt] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [activeStatus, page, limit]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getAll({
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        search: search || undefined,
        page,
        limit,
      });
      if (res?.orders) {
        setOrders(res.orders);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const handleOpenDetail = async (orderId) => {
    try {
      const res = await api.orders.getOne(orderId);
      if (res?.data) {
        setSelectedOrder(res.data);
        setTargetStatus(res.data.status || 'CONFIRMED');
        setTrackingNumber(res.data.trackingNumber || '');
        setCourierPartner(res.data.courierPartner || 'Blue Dart Express');
        setDispatchedAt(res.data.dispatchedAt ? new Date(res.data.dispatchedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setExpectedDeliveryDate(res.data.expectedDeliveryDate ? new Date(res.data.expectedDeliveryDate).toISOString().split('T')[0] : '');
        setOrderHistory(res.data.history || []);
        setStatusNote('');
      }
    } catch (err) {
      showModalAlert({
        title: 'Error Loading Order',
        message: 'Unable to retrieve order details. Please refresh and try again.',
        type: 'danger',
      });
    }
  };

  const handleOpenInvoice = async (orderId) => {
    try {
      const res = await api.orders.getInvoice(orderId);
      if (res?.data) {
        setInvoiceData(res.data);
        setShowInvoiceModal(true);
      }
    } catch (err) {
      showModalAlert({
        title: 'Invoice Generation Error',
        message: 'Failed to generate GST tax invoice data. Please try again.',
        type: 'danger',
      });
    }
  };

  const handleUpdateStatus = async (orderId, newStatus, extra = {}) => {
    const labels = {
      CONFIRMED: 'Dispatch Pending',
      DISPATCHED: 'Shipped',
      DELIVERED: 'Delivered',
    };

    const isConfirmed = await showConfirmModal({
      title: 'Confirm Status Change',
      message: `Are you sure you want to change this order stage to '${labels[newStatus] || newStatus}'?`,
      confirmText: `Yes, Set to ${labels[newStatus] || newStatus}`,
      cancelText: 'Cancel',
      type: newStatus === 'DELIVERED' ? 'success' : newStatus === 'DISPATCHED' ? 'info' : 'warning',
    });
    if (!isConfirmed) return;

    setUpdatingStatus(true);
    try {
      const payload = {
        status: newStatus,
        trackingNumber: extra.trackingNumber !== undefined ? extra.trackingNumber : (trackingNumber || undefined),
        note: extra.note !== undefined ? extra.note : (statusNote || undefined),
        courierPartner: extra.courierPartner !== undefined ? extra.courierPartner : (courierPartner || undefined),
        dispatchedAt: extra.dispatchedAt !== undefined ? extra.dispatchedAt : (dispatchedAt || undefined),
        expectedDeliveryDate: extra.expectedDeliveryDate !== undefined ? extra.expectedDeliveryDate : (expectedDeliveryDate || undefined),
      };
      await api.orders.updateStatus(orderId, payload);
      await loadOrders();
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
        await handleOpenDetail(orderId);
      }
      showModalAlert({
        title: 'Fulfillment Stage Updated',
        message: `Order status has been successfully updated to '${labels[newStatus] || newStatus}'.`,
        type: 'success',
      });
    } catch (err) {
      showModalAlert({
        title: 'Status Update Failed',
        message: err.message || 'Failed to update order status. Please try again.',
        type: 'danger',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            Delivered
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Truck className="w-3.5 h-3.5 mr-1 text-blue-500" />
            Shipped
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Dispatch Pending
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Order Fulfillment & Dispatch Hub"
        subtitle="Manage storefront incoming orders, track 9-digit order IDs, inspect delivery timelines, and issue GST tax invoices"
        onRefresh={loadOrders}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6 flex-1 w-full">
        {/* Filter and Search Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-dark-900 p-4 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
            {FULFILLMENT_STAGES.map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setActiveStatus(st.id);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeStatus === st.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Search Bar & Page Filter */}
          <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search 9-digit ID, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </form>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-700 bg-slate-50/70 dark:bg-dark-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6 font-semibold">9-Digit Order ID</th>
                  <th className="py-3.5 px-6 font-semibold">Customer & City</th>
                  <th className="py-3.5 px-6 font-semibold">Items</th>
                  <th className="py-3.5 px-6 font-semibold">Amount & Tax</th>
                  <th className="py-3.5 px-6 font-semibold">Payment Status</th>
                  <th className="py-3.5 px-6 font-semibold">Fulfillment Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-dark-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-mono font-bold text-sm text-brand-600 dark:text-brand-400 tracking-wider">
                          #{o.orderNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900 dark:text-white">{o.customerName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                          <Phone className="w-3 h-3 mr-1" /> {o.customerPhone}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          {o.items?.[0]?.product?.imageUrl || o.items?.[0]?.imageUrl ? (
                            <img
                              src={o.items[0].product?.imageUrl || o.items[0].imageUrl}
                              alt=""
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-dark-700 shrink-0 bg-slate-100 dark:bg-dark-800 shadow-sm"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 flex items-center justify-center shrink-0 text-slate-400"
                            style={{ display: o.items?.[0]?.product?.imageUrl || o.items?.[0]?.imageUrl ? 'none' : 'flex' }}
                          >
                            <ShoppingBag className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {o.items?.length || 0} Products
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {o.items?.[0]?.productName || 'Fabric Goods'}
                              {o.items?.length > 1 && ` +${o.items.length - 1} more`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                        <div className="text-sm font-bold">₹{o.totalAmount?.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Subtotal: ₹{o.subtotal?.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          o.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {o.paymentStatus}
                        </span>
                        <div className="text-[10px] text-brand-600 dark:text-brand-400 font-medium mt-1">
                          {o.paymentMethod === 'RAZORPAY' ? 'Razorpay Online' : o.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : o.paymentMethod?.includes('CARD') ? 'Card Payment' : 'GPay / UPI'}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-col space-y-1.5">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(o.status)}
                            <select
                              value={o.status === 'DELIVERED' ? 'DELIVERED' : o.status === 'DISPATCHED' ? 'DISPATCHED' : 'CONFIRMED'}
                              disabled={updatingStatus}
                              onChange={(e) => handleUpdateStatus(o.id, e.target.value)}
                              className="text-[11px] font-bold py-1 px-2 rounded-lg bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                              title="Quick Change Order Status"
                            >
                              <option value="CONFIRMED">Dispatch Pending</option>
                              <option value="DISPATCHED">Shipped</option>
                              <option value="DELIVERED">Delivered</option>
                            </select>
                          </div>
                          {o.courierPartner && (
                            <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                              <Truck className="w-3 h-3 mr-1 text-blue-500 flex-shrink-0" /> {o.courierPartner}
                            </div>
                          )}
                          {o.trackingNumber && (
                            <div className="text-[10px] font-mono text-slate-400">
                              AWB: {o.trackingNumber}
                            </div>
                          )}
                          {o.dispatchedAt && (
                            <div className="text-[9px] text-slate-500">
                              Dispatched: {new Date(o.dispatchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                          {o.expectedDeliveryDate && (
                            <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Exp. Del: {new Date(o.expectedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenDetail(o.id)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-dark-700 transition-colors"
                            title="Track Timeline & Manage"
                          >
                            <History className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                            <span>Track & Details</span>
                          </button>

                          <button
                            onClick={() => handleOpenInvoice(o.id)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-700 transition-colors"
                            title="Print GST Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            limit={limit}
            onPageChange={setPage}
            itemName="storefront orders"
          />
        </div>
      </div>

      {/* Order Detail & Tracking Timeline Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-dark-700 h-full flex flex-col shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-dark-700 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-dark-900/95 backdrop-blur-md z-10">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Order Details</h2>
                  <span className="font-mono text-sm font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 rounded-lg border border-brand-200 dark:border-brand-500/30">
                    #{selectedOrder.orderNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenInvoice(selectedOrder.id)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-300 hover:text-rose-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Order Fulfillment Management Box */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Manage Order Status & Fulfillment
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Update shipment milestones, tracking numbers, logistics carrier, and order lifecycle stage
                    </p>
                  </div>
                  {getStatusBadge(selectedOrder.status)}
                </div>

                <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-dark-700">
                  {/* 3-Stage Visual Pipeline Tracker */}
                  <div className="p-3.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-750 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        3-Stage Fulfillment Pipeline
                      </span>
                      <span className="text-[10px] font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-200 dark:border-brand-500/30">
                        {targetStatus === 'DELIVERED' ? 'Stage 3 of 3 · Finalized' : targetStatus === 'DISPATCHED' ? 'Stage 2 of 3 · In Transit' : 'Stage 1 of 3 · Awaiting Pickup'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Stage 1: Dispatch Pending */}
                      <button
                        type="button"
                        onClick={() => setTargetStatus('CONFIRMED')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          targetStatus === 'CONFIRMED' || targetStatus === 'PENDING'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 shadow-sm ring-1 ring-amber-500/30'
                            : 'bg-slate-50/70 dark:bg-dark-800/60 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Stage 1</span>
                        </div>
                        <div className="text-xs font-bold truncate">Dispatch Pending</div>
                      </button>

                      {/* Stage 2: Shipped */}
                      <button
                        type="button"
                        onClick={() => setTargetStatus('DISPATCHED')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          targetStatus === 'DISPATCHED'
                            ? 'bg-blue-500/15 border-blue-500 text-blue-800 dark:text-blue-300 shadow-sm ring-1 ring-blue-500/30'
                            : 'bg-slate-50/70 dark:bg-dark-800/60 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1">
                          <Truck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Stage 2</span>
                        </div>
                        <div className="text-xs font-bold truncate">Shipped</div>
                      </button>

                      {/* Stage 3: Delivered */}
                      <button
                        type="button"
                        onClick={() => setTargetStatus('DELIVERED')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          targetStatus === 'DELIVERED'
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                            : 'bg-slate-50/70 dark:bg-dark-800/60 border-slate-200 dark:border-dark-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Stage 3</span>
                        </div>
                        <div className="text-xs font-bold truncate">Delivered</div>
                      </button>
                    </div>
                  </div>

                  {/* Status Selection Dropdown (Only 3 Stages) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Change Order Stage *
                    </label>
                    <select
                      value={targetStatus === 'DELIVERED' ? 'DELIVERED' : targetStatus === 'DISPATCHED' ? 'DISPATCHED' : 'CONFIRMED'}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white dark:bg-dark-900 border border-brand-500/40 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="CONFIRMED">Stage 1: Dispatch Pending</option>
                      <option value="DISPATCHED">Stage 2: Shipped</option>
                      <option value="DELIVERED">Stage 3: Delivered</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Expected Delivery Date
                      </label>
                      <input
                        type="date"
                        value={expectedDeliveryDate}
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dispatch Date</label>
                      <input
                        type="date"
                        value={dispatchedAt}
                        onChange={(e) => setDispatchedAt(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Courier Service</label>
                      <select
                        value={courierPartner}
                        onChange={(e) => setCourierPartner(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        <option value="Blue Dart Express">Blue Dart Express</option>
                        <option value="Delhivery Logistics">Delhivery Logistics</option>
                        <option value="DTDC Courier">DTDC Courier</option>
                        <option value="VRL Logistics">VRL Logistics</option>
                        <option value="The Professional Couriers">The Professional Couriers</option>
                        <option value="India Post Speed Post">India Post Speed Post</option>
                        <option value="Ecom Express">Ecom Express</option>
                        <option value="Shadowfax">Shadowfax</option>
                        <option value="Direct Mill Delivery Van">Direct Mill Delivery Van</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">AWB / Tracking Number</label>
                      <input
                        type="text"
                        placeholder="e.g. BD-8920194"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Dispatched via express cargo / Delivered with signature..."
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedOrder.status !== 'CONFIRMED' && selectedOrder.status !== 'PENDING' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => {
                            setTargetStatus('CONFIRMED');
                            handleUpdateStatus(selectedOrder.id, 'CONFIRMED');
                          }}
                          className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                        >
                          Mark Dispatch Pending
                        </button>
                      )}
                      {selectedOrder.status !== 'DISPATCHED' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => {
                            setTargetStatus('DISPATCHED');
                            handleUpdateStatus(selectedOrder.id, 'DISPATCHED');
                          }}
                          className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 text-xs font-bold transition-all cursor-pointer"
                        >
                          Quick Shipped
                        </button>
                      )}
                      {selectedOrder.status !== 'DELIVERED' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => {
                            setTargetStatus('DELIVERED');
                            handleUpdateStatus(selectedOrder.id, 'DELIVERED');
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                        >
                          Quick Delivered
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(selectedOrder.id, targetStatus)}
                      className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/25 disabled:opacity-50 transition-all cursor-pointer flex items-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{updatingStatus ? 'Updating Order...' : 'Save Status & Tracking'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: ORDER STATUS HISTORY TIMELINE */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Order Status History Timeline
                  </h3>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 shadow-sm">
                  {orderHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">No history logs available for this order.</p>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-dark-700">
                      {orderHistory.map((item, idx) => (
                        <div key={item.id || idx} className="relative">
                          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-dark-900 bg-brand-600 shadow-sm"></div>
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center space-x-2">
                              <span>{item.status}</span>
                              <span className="text-[10px] font-normal text-slate-400">by {item.changedBy || 'System'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.createdAt).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {item.note && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 bg-slate-50 dark:bg-dark-800/60 p-2 rounded-lg border border-slate-100 dark:border-dark-800">
                              {item.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer and Shipping Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Customer Info</h4>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{selectedOrder.customerName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                    <Phone className="w-3 h-3 mr-1.5 text-slate-400" />
                    {selectedOrder.customerPhone}
                  </div>
                  {selectedOrder.customerEmail && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                      <Mail className="w-3 h-3 mr-1.5 text-slate-400" />
                      {selectedOrder.customerEmail}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Shipping Destination</h4>
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start">
                    <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 text-brand-600 dark:text-brand-400 mt-0.5" />
                    <span>{selectedOrder.shippingAddress || 'No shipping address provided.'}</span>
                  </div>
                </div>
              </div>

              {/* Payment and Transaction Details */}
              <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment & Gateway Details</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedOrder.paymentStatus === 'PAID'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Mode</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedOrder.paymentMethod === 'RAZORPAY' ? 'Razorpay Online Gateway' : selectedOrder.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on Delivery (COD)' : selectedOrder.paymentMethod || 'Online'}
                    </span>
                  </div>
                  {selectedOrder.razorpayPaymentId && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Razorpay Payment ID</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-[11px] border border-emerald-200 dark:border-emerald-800">
                        {selectedOrder.razorpayPaymentId}
                      </span>
                    </div>
                  )}
                  {selectedOrder.razorpayOrderId && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Razorpay Order ID</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                        {selectedOrder.razorpayOrderId}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[11px]">Order Total Amount</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{selectedOrder.totalAmount?.toLocaleString('en-IN')} (incl. GST)
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Line Items */}
              <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Order Items</h4>
                <div className="divide-y divide-slate-100 dark:divide-dark-800">
                  {selectedOrder.items?.map((item, idx) => {
                    const itemImg = item.product?.imageUrl || item.imageUrl || item.product?.images?.[0];
                    return (
                      <div key={idx} className="py-3 flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {itemImg ? (
                            <img
                              src={itemImg}
                              alt={item.productName}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-dark-700 shrink-0 bg-slate-100 dark:bg-dark-800 shadow-sm"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 flex items-center justify-center shrink-0 text-slate-400"
                            style={{ display: itemImg ? 'none' : 'flex' }}
                          >
                            <ShoppingBag className="w-5 h-5 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-white truncate">{item.productName}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Qty: <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity}</span>
                              {item.size && <span> · Size: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.size}</span></span>}
                              {item.color && <span> · Color: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.color}</span></span>}
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white shrink-0 text-right">
                          <div>₹{item.totalPrice?.toLocaleString('en-IN')}</div>
                          {item.quantity > 1 && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              (₹{item.unitPrice?.toLocaleString('en-IN')} each)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-dark-700 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                  <span>Grand Total (incl. GST)</span>
                  <span className="text-base text-brand-600 dark:text-brand-400">
                    ₹{selectedOrder.totalAmount?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-8 border border-slate-200">
            {/* Invoice Printable Area */}
            <div id="printable-tax-invoice" className="space-y-6">
              {/* Top Banner */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-indigo-900">
                    {invoiceData.company.name}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1 font-medium">{invoiceData.company.tagline}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{invoiceData.company.address}, {invoiceData.company.city}, {invoiceData.company.state}</p>
                  <p className="text-xs font-mono text-slate-700 mt-1">
                    GSTIN: <span className="font-bold">{invoiceData.company.gstin}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md inline-block">
                    Tax Invoice / Bill of Supply
                  </div>
                  <div className="mt-2 text-sm font-mono font-bold text-slate-800">
                    #{invoiceData.order.orderNumber}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Date: {new Date(invoiceData.order.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <div className="font-bold text-slate-500 uppercase tracking-wider mb-1">Billed To</div>
                  <div className="font-bold text-slate-900 text-sm">{invoiceData.order.customerName}</div>
                  <div className="text-slate-600 mt-1">{invoiceData.order.customerPhone}</div>
                  <div className="text-slate-600">{invoiceData.order.customerEmail}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-500 uppercase tracking-wider mb-1">Shipping Destination</div>
                  <div className="text-slate-700 leading-relaxed">{invoiceData.order.shippingAddress || 'Store Pickup'}</div>
                  <div className="mt-2 text-slate-600">
                    Payment: <span className="font-semibold">
                      {invoiceData.order.paymentMethod === 'RAZORPAY' ? 'Razorpay Online' : invoiceData.order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on Delivery (COD)' : invoiceData.order.paymentMethod}
                    </span> ({invoiceData.order.paymentStatus})
                    {invoiceData.order.razorpayPaymentId && (
                      <span className="block text-[11px] font-mono text-slate-500 mt-0.5">
                        Razorpay Txn: {invoiceData.order.razorpayPaymentId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Size</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoiceData.order.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.productName}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.size || 'Std'}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right">₹{item.unitPrice?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">₹{item.totalPrice?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span>₹{invoiceData.order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (2.5%):</span>
                    <span>₹{(invoiceData.order.taxAmount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (2.5%):</span>
                    <span>₹{(invoiceData.order.taxAmount / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
                    <span>Total Amount Due:</span>
                    <span className="text-indigo-700">₹{invoiceData.order.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
