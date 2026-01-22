/**
 * Shared Patient Context Service
 * Exported from shell app and used by all modules
 * 
 * Provides access to selected patient across all micro-frontends
 * 
 * Usage:
 * - Subscribe to changes: patientContext.getSelectedPatient().subscribe(...)
 * - Get current patient: patientContext.getCurrentPatient()
 * - Set patient: patientContext.setSelectedPatient(patient)
 */

export interface PatientContextService {
  setSelectedPatient(patient: any): void;
  getSelectedPatient(): any;
  getCurrentPatient(): any;
  clearPatient(): void;
}
