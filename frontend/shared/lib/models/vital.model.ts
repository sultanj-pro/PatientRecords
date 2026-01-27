export interface Vital {
  id: string;
  patientId: string;
  date: Date;
  temperature?: number;
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}
