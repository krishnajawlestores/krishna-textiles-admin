'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Sparkles, ShieldCheck, Lock, Mail, User, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid work email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await api.auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        role: 'ADMIN',
      });

      if (res?.accessToken) {
        localStorage.setItem('kt_admin_token', res.accessToken);
        localStorage.setItem('kt_admin_user', JSON.stringify(res.user));
        if (res.session) localStorage.setItem('kt_admin_session', JSON.stringify(res.session));
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 800);
      } else {
        // Fallback login if token was not directly attached
        const loginRes = await api.auth.login(email, password);
        if (loginRes?.accessToken) {
          localStorage.setItem('kt_admin_token', loginRes.accessToken);
          localStorage.setItem('kt_admin_user', JSON.stringify(loginRes.user));
          if (loginRes.session) localStorage.setItem('kt_admin_session', JSON.stringify(loginRes.session));
          setSuccess(true);
          setTimeout(() => {
            router.push('/');
          }, 800);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to register admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#06090E] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-lg w-full bg-dark-900/90 border border-dark-700/80 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Krishna Jawli Stores</h2>
          <p className="text-xs text-slate-400 mt-1">Create Admin / Operations Portal Account</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Account registered successfully! Redirecting...
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignUp} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anand Kumar"
                className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Official Work Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@krishnatextiles.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Mobile Contact</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-dark-950/80 rounded-xl border border-dark-800 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Assigned Role: <strong className="text-white">ADMIN</strong> (Full ERP Management Access)</span>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full mt-2 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Creating Account...' : 'Register Admin Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400 pt-4 border-t border-dark-700/60">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-400 font-semibold hover:underline">
            Sign In to Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
