// Patient model
export interface Patient {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  mrn: string;
  gender?: string;
  address?: string;
  phone?: string;
  email?: string;
}

// Vital sign model
export interface Vital {
  id: number;
  patientId: number;
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  recordedAt: string;
  recordedBy?: string;
}

// Lab result model
export interface Lab {
  id: number;
  patientId: number;
  testName: string;
  testCode: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  status?: string; // normal, abnormal, critical
  resultDate: string;
  labName?: string;
}

// Medication model
export interface Medication {
  id: number;
  patientId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  route?: string; // oral, IV, IM, etc
  startDate: string;
  endDate?: string;
  indication?: string;
  prescribedBy?: string;
}

// Visit model
export interface Visit {
  id: number;
  patientId: number;
  visitType: 'hospital' | 'clinic' | 'office';
  visitDate: string;
  provider?: string;
  department?: string;
  reason?: string;
  notes?: string;
}

// Authentication response
export interface AuthResponse {
  accessToken: string;
  role: string;
  username: string;
}

// User info
export interface User {
  username: string;
  role: string;
  permissions: string[];
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
