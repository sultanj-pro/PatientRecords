/**
 * Configuration for dynamically loadable modules
 */
export interface ModuleConfig {
  name: string;
  path: string;
  port: number;
  component: string;
  module: string;
  icon: string;
  requiredRoles: string[];
  description: string;
}

/**
 * Configured modules available in the system
 */
export const AVAILABLE_MODULES: ModuleConfig[] = [
  {
    name: 'Demographics',
    path: 'demographicsApp',
    port: 4201,
    component: './DemographicsComponent',
    module: './DemographicsModule',
    icon: '👤',
    requiredRoles: ['admin', 'clinician', 'nurse', 'patient'],
    description: 'Patient demographic information'
  },
  {
    name: 'Vitals',
    path: 'vitalsApp',
    port: 4202,
    component: './VitalsComponent',
    module: './VitalsModule',
    icon: '💓',
    requiredRoles: ['admin', 'clinician', 'nurse'],
    description: 'Vital signs and measurements'
  },
  {
    name: 'Labs',
    path: 'labsApp',
    port: 4203,
    component: './LabsComponent',
    module: './LabsModule',
    icon: '🧬',
    requiredRoles: ['admin', 'clinician', 'nurse', 'patient'],
    description: 'Laboratory test results'
  },
  {
    name: 'Medications',
    path: 'medicationsApp',
    port: 4204,
    component: './MedicationsComponent',
    module: './MedicationsModule',
    icon: '💊',
    requiredRoles: ['admin', 'clinician', 'nurse', 'pharmacist'],
    description: 'Current and past medications'
  },
  {
    name: 'Visits',
    path: 'visitsApp',
    port: 4205,
    component: './VisitsComponent',
    module: './VisitsModule',
    icon: '📅',
    requiredRoles: ['admin', 'clinician', 'receptionist', 'patient'],
    description: 'Appointment and visit history'
  }
];

/**
 * Build the remote URL for a module
 */
export function getRemoteUrl(moduleConfig: ModuleConfig): string {
  // For local development, use localhost
  // In production, this would be replaced with actual domain
  return `http://localhost:${moduleConfig.port}/remoteEntry.js`;
}

/**
 * Get modules visible for a specific role
 */
export function getVisibleModules(role: string): ModuleConfig[] {
  return AVAILABLE_MODULES.filter(module =>
    module.requiredRoles.includes(role?.toLowerCase() || 'guest')
  );
}
