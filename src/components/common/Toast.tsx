import React from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let Icon = CheckCircle;
        let colorClass = 'bg-emerald-600 text-white';
        if (toast.type === 'error') {
          Icon = AlertTriangle;
          colorClass = 'bg-rose-600 text-white';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          colorClass = 'bg-amber-600 text-white';
        } else if (toast.type === 'info') {
          Icon = Info;
          colorClass = 'bg-primary-600 text-white';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl ${colorClass} transition-all`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm leading-tight">{toast.title}</h4>
              {toast.description && <p className="text-xs mt-1 text-white/90">{toast.description}</p>}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-white/80 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
