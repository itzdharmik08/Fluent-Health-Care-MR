import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import {
  Settings as SettingsIcon,
  Building,
  Save,
  CheckCircle2,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { BackupRestoreManager } from '../components/backup/BackupRestoreManager';

export const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'backup' ? 'backup' : 'profile';
  const [activeTab, setActiveTab] = useState<'profile' | 'backup'>(initialTab);

  const [fullName, setFullName] = useState(profile?.full_name || 'MR Representative');
  const [companyName, setCompanyName] = useState(profile?.company_name || 'Fluent Health Care');
  const [phone, setPhone] = useState(profile?.phone || '+91 98765 43210');
  const [address, setAddress] = useState(profile?.distributor_address || 'Ring Road, Surat, Gujarat, India');
  const [gstin, setGstin] = useState(profile?.gstin || '24AAAAA0000A1Z5');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'backup') {
      setActiveTab('backup');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'profile' | 'backup') => {
    setActiveTab(tab);
    setSearchParams(tab === 'backup' ? { tab: 'backup' } : {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      await authService.updateProfile({
        full_name: fullName,
        company_name: companyName,
        phone: phone,
        distributor_address: address,
        gstin: gstin,
      });
      setSuccessMsg('Distributor profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Distributor & System Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage distributor credentials, printable invoice branding, and automated backup & disaster recovery.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => handleTabChange('profile')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Distributor & Invoice Profile</span>
        </button>

        <button
          onClick={() => handleTabChange('backup')}
          className={`flex items-center gap-2 pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition-all ${
            activeTab === 'backup'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>12:00 AM Auto-Backup & Recovery</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
            Automated
          </span>
        </button>
      </div>

      {activeTab === 'backup' ? (
        <BackupRestoreManager />
      ) : (
        <>
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Company & Invoice Information</h2>
                <p className="text-xs text-slate-400">These details appear on doctor printable invoice receipts.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Representative Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Distributor / Company Name</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Distributor GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Distributor Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-md transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};
