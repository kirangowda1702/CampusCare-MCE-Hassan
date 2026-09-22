import React, { useState, useRef } from 'react';
import { useMedical } from '../context/MedicalContext';
import { useAuth } from '../context/AuthContext';
import { MedicalRecordCard } from '../components/cards/MedicalRecordCard';
import { Modal } from '../components/common/Modal';
import { FolderLock, Upload, Search, Filter, Plus, FileText, CheckCircle2, Download, Eye, AlertCircle } from 'lucide-react';
import { MedicalRecord, RecordType } from '../types';
import { storageService } from '../services/storageService';

export const MedicalRecordsPage: React.FC = () => {
  const { records, addMedicalRecord } = useMedical();
  const { user, role } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  // New Record Form State
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('lab_report');
  const [doctorOrLab, setDoctorOrLab] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !doctorOrLab) {
      setUploadError('Please enter document title and issuer name.');
      return;
    }

    try {
      setUploadError(null);
      let fileUrl = '#';
      let fileSize = '1.2 MB';
      let fileType: 'pdf' | 'image' | 'doc' = 'pdf';

      if (selectedFile) {
        const result = await storageService.uploadMedicalDocument(
          selectedFile,
          user?.id || 'usr-student-1',
          progress => setUploadProgress(progress)
        );
        fileUrl = result.fileUrl;
        fileSize = result.fileSize;
        fileType = result.fileType;
      }

      addMedicalRecord({
        patientId: user?.id || 'usr-student-1',
        title,
        recordType,
        recordDate: new Date().toISOString().split('T')[0],
        doctorOrLabName: doctorOrLab,
        fileUrl,
        fileSize,
        fileType,
        notes,
        tags: [recordType.replace('_', ' '), 'E-Vault Verified']
      });

      setTitle('');
      setDoctorOrLab('');
      setNotes('');
      setSelectedFile(null);
      setUploadProgress(null);
      setIsUploadOpen(false);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document to E-Vault.');
      setUploadProgress(null);
    }
  };

  const isStudent = role === 'student' || (!role && user?.role === 'student');

  // Strict patient privacy & isolation (Students see ONLY their own records)
  const accessibleRecords = records.filter(r => {
    if (isStudent && user) {
      return r.patientId === user.id || (user.usn && r.patientId === user.usn);
    }
    // Doctors and Admins have authorized clinical / audit access
    return true;
  });

  const filtered = accessibleRecords.filter(r => {
    if (filterType !== 'all' && r.recordType !== filterType) return false;
    if (searchTerm) {
      const match = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.doctorOrLabName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderLock className="w-6 h-6 text-primary-600" />
            Medical Records & Health E-Vault
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            256-bit encrypted repository for lab diagnostics, vaccination cards, and clinical summaries
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" /> Upload Medical Record
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-semibold">
          {['all', 'lab_report', 'vaccination', 'consultation_notes'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-all ${
                filterType === tab
                  ? 'bg-primary-600 text-white shadow'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reports or lab name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
          />
        </div>
      </div>

      {/* Grid of Medical Records */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(record => (
            <MedicalRecordCard
              key={record.id}
              record={record}
              onView={rec => setSelectedRecord(rec)}
              onDownload={rec => {
                if (rec.fileUrl && rec.fileUrl !== '#') {
                  window.open(rec.fileUrl, '_blank');
                } else {
                  alert(`Opening secure download preview for: ${rec.title}`);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <FolderLock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Medical Records Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isStudent 
              ? 'You do not have any medical records uploaded to your private E-Vault yet. Click "Upload Medical Record" to securely store your reports.'
              : 'No medical records match your current filter or search criteria.'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Medical Document to E-Vault">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Blood Sugar Report, Chest X-Ray, Hepatitis Vaccine"
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Record Type
              </label>
              <select
                value={recordType}
                onChange={e => setRecordType(e.target.value as any)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="lab_report">Lab / Diagnostic Report</option>
                <option value="vaccination">Vaccination Certificate</option>
                <option value="discharge_summary">Hospital Discharge Summary</option>
                <option value="consultation_notes">Doctor Consultation Notes</option>
                <option value="other">Other Medical Document</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Doctor / Hospital / Lab Name *
              </label>
              <input
                type="text"
                required
                value={doctorOrLab}
                onChange={e => setDoctorOrLab(e.target.value)}
                placeholder="e.g., MCE Campus Lab, HIMS"
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Summary / Clinical Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Key observations or test parameters..."
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Document File (PDF, PNG, JPG, DOCX - Max 10MB)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 rounded-xl p-4 text-center text-xs text-slate-500 cursor-pointer transition-colors"
            >
              <Upload className="w-6 h-6 mx-auto text-primary-500 mb-1" />
              {selectedFile ? (
                <div className="font-bold text-primary-600 dark:text-primary-400">
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              ) : (
                <span>Click to browse and upload file from device</span>
              )}
            </div>
          </div>

          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                <span>Uploading to Encrypted Vault...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadProgress !== null}
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow disabled:opacity-50"
            >
              Save to E-Vault
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Preview Modal */}
      {selectedRecord && (
        <Modal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} title={selectedRecord.title}>
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <div><strong>Issuer:</strong> {selectedRecord.doctorOrLabName}</div>
              <div><strong>Recorded Date:</strong> {selectedRecord.recordDate}</div>
              <div><strong>Category:</strong> {selectedRecord.recordType.replace('_', ' ')}</div>
              <div><strong>File Size:</strong> {selectedRecord.fileSize}</div>
              {selectedRecord.notes && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <strong>Clinical Summary:</strong>
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{selectedRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              {selectedRecord.fileUrl && selectedRecord.fileUrl !== '#' ? (
                <a
                  href={selectedRecord.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white font-bold text-xs"
                >
                  <Eye className="w-3.5 h-3.5" /> View Full Document
                </a>
              ) : <div />}

              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
