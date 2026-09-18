import React from 'react';
import { FileText, Download, Eye, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { MedicalRecord } from '../../types';

interface MedicalRecordCardProps {
  record: MedicalRecord;
  onView?: (record: MedicalRecord) => void;
  onDownload?: (record: MedicalRecord) => void;
}

export const MedicalRecordCard: React.FC<MedicalRecordCardProps> = ({
  record,
  onView,
  onDownload
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 rounded-md">
                {record.recordType.replace('_', ' ')}
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1 line-clamp-1">
                {record.title}
              </h4>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono flex-shrink-0">{record.fileSize}</span>
        </div>

        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Date: {record.recordDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-tealAccent-500" />
            <span className="truncate">Issuer: {record.doctorOrLabName}</span>
          </div>
          {record.notes && (
            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-2">
              {record.notes}
            </p>
          )}
        </div>

        {record.tags && record.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {record.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => (onView ? onView(record) : alert(`Previewing ${record.title}`))}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all"
        >
          <Eye className="w-3.5 h-3.5" /> View Record
        </button>
        <button
          onClick={() => (onDownload ? onDownload(record) : alert(`Downloading ${record.title} (PDF)`))}
          className="p-2 rounded-xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400 transition-colors"
          title="Download PDF"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
