import React, { createContext, useContext, useState, useEffect } from 'react';
import { EmergencyRequest, FirstAidCentre, EmergencyContact, EmergencyCampusStatus } from '../types';
import { emergencyService } from '../services/emergencyService';
import { firstAidService, defaultFirstAidCentre, defaultEmergencyContacts } from '../services/firstAidService';

interface EmergencyContextType {
  activeEmergency: EmergencyRequest | null;
  emergencyHistory: EmergencyRequest[];
  firstAidCentre: FirstAidCentre;
  emergencyContacts: EmergencyContact[];
  triggerEmergency: (
    location: string,
    phone: string,
    type: EmergencyRequest['emergencyType'],
    coords?: { lat: number; lng: number } | null,
    description?: string,
    callerName?: string
  ) => EmergencyRequest;
  updateWorkflowStatus: (
    id: string,
    status: EmergencyCampusStatus,
    metadata?: { responderName?: string; referredHospitalId?: string; referralReason?: string }
  ) => Promise<void>;
  resolveEmergency: (id: string) => void;
  cancelActiveEmergency: () => void;
  refreshFirstAidData: () => Promise<void>;
  isEmergencyModalOpen: boolean;
  setIsEmergencyModalOpen: (open: boolean) => void;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

const ACTIVE_STATUSES: EmergencyCampusStatus[] = [
  'REQUESTED',
  'ACKNOWLEDGED',
  'RESPONDER_ASSIGNED',
  'ASSISTANCE_IN_PROGRESS',
  'REFERRED',
  'active',
  'dispatched'
];

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeEmergency, setActiveEmergency] = useState<EmergencyRequest | null>(() => {
    const saved = localStorage.getItem('campuscare_active_emergency');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const [emergencyHistory, setEmergencyHistory] = useState<EmergencyRequest[]>([]);
  const [firstAidCentre, setFirstAidCentre] = useState<FirstAidCentre>(defaultFirstAidCentre);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(defaultEmergencyContacts);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  const loadEmergencies = async () => {
    const data = await emergencyService.getEmergencies();
    if (data && data.length > 0) {
      setEmergencyHistory(data);
      const active = data.find(d => ACTIVE_STATUSES.includes(d.status));
      if (active) setActiveEmergency(active);
    }
  };

  const refreshFirstAidData = async () => {
    const [centre, contacts] = await Promise.all([
      firstAidService.getFirstAidCentre(),
      firstAidService.getEmergencyContacts()
    ]);
    setFirstAidCentre(centre);
    setEmergencyContacts(contacts);
  };

  useEffect(() => {
    loadEmergencies();
    refreshFirstAidData();

    const unsubscribeEmergencies = emergencyService.subscribeToEmergencies(() => {
      loadEmergencies();
    });

    const unsubscribeFirstAid = firstAidService.subscribeToFirstAidUpdates(() => {
      refreshFirstAidData();
    });

    return () => {
      if (unsubscribeEmergencies) unsubscribeEmergencies();
      if (unsubscribeFirstAid) unsubscribeFirstAid();
    };
  }, []);

  useEffect(() => {
    if (activeEmergency) {
      localStorage.setItem('campuscare_active_emergency', JSON.stringify(activeEmergency));
    } else {
      localStorage.removeItem('campuscare_active_emergency');
    }
  }, [activeEmergency]);

  const triggerEmergency = (
    location: string,
    phone: string,
    type: EmergencyRequest['emergencyType'],
    coords?: { lat: number; lng: number } | null,
    description?: string,
    callerName?: string
  ): EmergencyRequest => {
    const now = new Date().toISOString();
    const req: EmergencyRequest = {
      id: 'emg-' + Date.now(),
      callerName: callerName || 'Campus Member (SOS Alert)',
      callerPhone: phone || '+91 8172 240501',
      locationDetails: location || 'MCE Hassan Campus',
      description: description || 'Immediate campus first-aid assistance requested.',
      latitude: coords ? coords.lat : null,
      longitude: coords ? coords.lng : null,
      hasLocationPermission: Boolean(coords),
      locationShared: Boolean(coords),
      emergencyType: type,
      status: 'REQUESTED',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
      dispatchedUnit: 'MCE Campus Safety & First Aid Protocol'
    };

    setActiveEmergency(req);
    setEmergencyHistory(prev => [req, ...prev]);

    emergencyService.createEmergency({
      callerName: req.callerName,
      callerPhone: req.callerPhone,
      locationDetails: req.locationDetails,
      description: req.description,
      latitude: req.latitude,
      longitude: req.longitude,
      locationShared: req.locationShared,
      hasLocationPermission: req.hasLocationPermission,
      emergencyType: req.emergencyType
    }).catch(() => {});

    return req;
  };

  const updateWorkflowStatus = async (
    id: string,
    status: EmergencyCampusStatus,
    metadata?: { responderName?: string; referredHospitalId?: string; referralReason?: string }
  ) => {
    await emergencyService.updateEmergencyStatus(id, status, metadata);
    if (status === 'RESOLVED' || status === 'CANCELLED' || status === 'resolved' || status === 'cancelled') {
      if (activeEmergency?.id === id) setActiveEmergency(null);
    } else if (activeEmergency?.id === id) {
      setActiveEmergency(prev => prev ? { ...prev, status, ...metadata } : null);
    }
    await loadEmergencies();
  };

  const resolveEmergency = (id: string) => {
    updateWorkflowStatus(id, 'RESOLVED');
  };

  const cancelActiveEmergency = () => {
    if (activeEmergency) {
      updateWorkflowStatus(activeEmergency.id, 'CANCELLED');
    }
  };

  return (
    <EmergencyContext.Provider
      value={{
        activeEmergency,
        emergencyHistory,
        firstAidCentre,
        emergencyContacts,
        triggerEmergency,
        updateWorkflowStatus,
        resolveEmergency,
        cancelActiveEmergency,
        refreshFirstAidData,
        isEmergencyModalOpen,
        setIsEmergencyModalOpen
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) throw new Error('useEmergency must be used within EmergencyProvider');
  return context;
};
