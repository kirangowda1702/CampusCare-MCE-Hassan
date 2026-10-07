import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { EmergencyRequest, FirstAidCentre, EmergencyContact, EmergencyCampusStatus } from '../types';
import { emergencyService, CallerAuthContext } from '../services/emergencyService';
import { firstAidService, defaultFirstAidCentre, defaultEmergencyContacts } from '../services/firstAidService';
import { useAuth } from './AuthContext';

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
    callerName?: string,
    userRole?: string,
    userId?: string
  ) => Promise<EmergencyRequest>;
  updateWorkflowStatus: (
    id: string,
    status: EmergencyCampusStatus,
    metadata?: { responderName?: string; referredHospitalId?: string; referralReason?: string }
  ) => Promise<void>;
  resolveEmergency: (id: string) => void;
  cancelActiveEmergency: () => void;
  refreshFirstAidData: () => Promise<void>;
  loadEmergencies: () => Promise<void>;
  isEmergencyModalOpen: boolean;
  setIsEmergencyModalOpen: (open: boolean) => void;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

const ACTIVE_STATUSES: EmergencyCampusStatus[] = [
  'ACTIVE',
  'REQUESTED',
  'ACKNOWLEDGED',
  'RESPONDER_ASSIGNED',
  'ASSISTANCE_IN_PROGRESS',
  'REFERRED',
  'active',
  'dispatched'
];

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role } = useAuth();

  const callerAuth: CallerAuthContext = useMemo(() => ({
    id: user?.id,
    role: role || 'student',
    fullName: user?.fullName || 'Campus Member',
    email: user?.email,
    phone: user?.phone || '9110885805'
  }), [user, role]);

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

  const loadEmergencies = useCallback(async () => {
    try {
      const data = await emergencyService.getEmergencies(callerAuth);
      if (data && data.length > 0) {
        setEmergencyHistory(data);
        const active = data.find(d => ACTIVE_STATUSES.includes(d.status));
        if (active) {
          setActiveEmergency(active);
        } else if (activeEmergency && ['RESOLVED', 'CANCELLED', 'resolved', 'cancelled'].includes(activeEmergency.status)) {
          setActiveEmergency(null);
        }
      }
    } catch (e) {
      console.warn('Error loading emergencies:', e);
    }
  }, [callerAuth, activeEmergency]);

  const refreshFirstAidData = useCallback(async () => {
    try {
      const [centre, contacts] = await Promise.all([
        firstAidService.getFirstAidCentre(),
        firstAidService.getEmergencyContacts()
      ]);
      setFirstAidCentre(centre);
      setEmergencyContacts(contacts);
    } catch (e) {
      console.warn('Error refreshing first aid data:', e);
    }
  }, []);

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
  }, [loadEmergencies, refreshFirstAidData]);

  useEffect(() => {
    if (activeEmergency) {
      localStorage.setItem('campuscare_active_emergency', JSON.stringify(activeEmergency));
    } else {
      localStorage.removeItem('campuscare_active_emergency');
    }
  }, [activeEmergency]);

  const triggerEmergency = async (
    location: string,
    phone: string,
    type: EmergencyRequest['emergencyType'],
    coords?: { lat: number; lng: number } | null,
    description?: string,
    callerName?: string,
    userRole?: string,
    userId?: string
  ): Promise<EmergencyRequest> => {
    const now = new Date().toISOString();
    const incidentCode = `MCE-SOS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const effectiveUserId = userId || callerAuth.id;
    const effectiveRole = (userRole || callerAuth.role || 'student').toLowerCase();
    const effectiveName = callerName || callerAuth.fullName || 'Campus Member (SOS Alert)';

    const optimisticReq: EmergencyRequest = {
      id: 'emg-' + Date.now(),
      incidentCode,
      userId: effectiveUserId,
      userRole: effectiveRole,
      callerName: effectiveName,
      callerPhone: phone || '9110885805',
      locationDetails: location || 'MCE Hassan Campus',
      description: description || 'Immediate campus first-aid assistance requested.',
      latitude: coords ? coords.lat : null,
      longitude: coords ? coords.lng : null,
      hasLocationPermission: Boolean(coords),
      locationShared: Boolean(coords),
      emergencyType: type,
      status: 'ACTIVE',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
      dispatchedUnit: 'MCE Campus Safety & First Aid Protocol'
    };

    setActiveEmergency(optimisticReq);
    setEmergencyHistory(prev => [optimisticReq, ...prev.filter(e => e.id !== optimisticReq.id)]);

    try {
      const created = await emergencyService.createEmergency({
        userId: effectiveUserId,
        userRole: effectiveRole,
        callerName: optimisticReq.callerName,
        callerPhone: optimisticReq.callerPhone,
        locationDetails: optimisticReq.locationDetails,
        description: optimisticReq.description,
        latitude: optimisticReq.latitude,
        longitude: optimisticReq.longitude,
        locationShared: optimisticReq.locationShared,
        hasLocationPermission: optimisticReq.hasLocationPermission,
        emergencyType: optimisticReq.emergencyType,
        incidentCode
      });
      setActiveEmergency(created);
      setEmergencyHistory(prev => [created, ...prev.filter(e => e.id !== created.id)]);
      return created;
    } catch (e) {
      console.warn('Failed to persist emergency:', e);
      return optimisticReq;
    }
  };

  const updateWorkflowStatus = async (
    id: string,
    status: EmergencyCampusStatus,
    metadata?: { responderName?: string; referredHospitalId?: string; referralReason?: string }
  ) => {
    await emergencyService.updateEmergencyStatus(id, status, metadata, callerAuth);

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
        loadEmergencies,
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
