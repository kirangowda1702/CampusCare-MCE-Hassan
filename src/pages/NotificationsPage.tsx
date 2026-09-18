import React, { useState, useEffect } from 'react';
import { mockNotifications } from '../data/notifications';
import { notificationService } from '../services/notificationService';
import { Bell, CheckCheck, Calendar, Pill, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NotificationItem } from '../types';

export const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'appointment' | 'reminder'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);

  useEffect(() => {
    notificationService.getNotifications().then(data => {
      if (data && data.length > 0) {
        setNotifications(data);
      }
    });
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    notificationService.markAllAsRead().catch(() => {});
  };

  const handleMarkOneRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    notificationService.markAsRead(id).catch(() => {});
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'appointment') return n.type === 'appointment';
    if (filter === 'reminder') return n.type === 'reminder';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-primary-600" /> Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Realtime appointment updates, medicine reminders, and campus health advisories
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-300 self-start sm:self-auto"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" /> Mark All as Read
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-semibold">
        {['all', 'unread', 'appointment', 'reminder'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
              filter === tab
                ? 'bg-primary-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(notif => {
          let Icon = Bell;
          if (notif.type === 'appointment') Icon = Calendar;
          if (notif.type === 'reminder') Icon = Pill;
          if (notif.type === 'emergency') Icon = ShieldAlert;

          return (
            <div
              key={notif.id}
              onClick={() => handleMarkOneRead(notif.id)}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                !notif.isRead
                  ? 'bg-white dark:bg-slate-900 border-primary-300 dark:border-primary-800 shadow-sm'
                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{notif.title}</h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{notif.message}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                    {new Date(notif.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              {notif.link && (
                <Link
                  to={notif.link}
                  onClick={e => e.stopPropagation()}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-950 text-xs font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap flex-shrink-0"
                >
                  View Action
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
