import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+ Positive');
  const [allergies, setAllergies] = useState(user?.allergies?.join(', ') || 'Penicillin');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContactPhone || '+91 94480 11223');
  const [hostelRoom, setHostelRoom] = useState(user?.hostelRoom || 'Kavery Hostel, Block A, Room 304');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      fullName,
      phone,
      bloodGroup,
      allergies: allergies.split(',').map(s => s.trim()),
      emergencyContactPhone: emergencyContact,
      hostelRoom
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Healthcare Profile</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Personal identification, academic details, and medical emergency data
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
        {saved && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Profile successfully saved!
          </div>
        )}

        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'}
            alt="User avatar"
            className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-500 shadow-md"
          />
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">{user?.fullName}</h3>
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 capitalize">
              Role: {user?.role} • {user?.usn || user?.employeeId || 'MCE Member'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Legal Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
            <input
              type="text"
              value={bloodGroup}
              onChange={e => setBloodGroup(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Known Drug Allergies</label>
            <input
              type="text"
              value={allergies}
              onChange={e => setAllergies(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Guardian Phone</label>
            <input
              type="text"
              value={emergencyContact}
              onChange={e => setEmergencyContact(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hostel Room / Local Address</label>
            <input
              type="text"
              value={hostelRoom}
              onChange={e => setHostelRoom(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Profile Details
          </button>
        </div>
      </form>
    </div>
  );
};
