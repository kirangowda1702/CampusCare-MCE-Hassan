import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { EmergencyModal } from '../features/emergency/EmergencyModal';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <EmergencyModal />
    </div>
  );
};
