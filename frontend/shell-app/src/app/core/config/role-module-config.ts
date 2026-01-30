/**
 * Role-Based Module Configuration
 * Defines which modules are visible to each role and their default layout order
 */

export interface ModuleConfig {
  name: string;
  icon: string;
  description: string;
  port: number;
}

export interface RoleConfig {
  role: string;
  displayName: string;
  modules: string[]; // Order matters - first module is priority
  layoutMode: 'dashboard' | 'wizard';
}

const MODULES: Record<string, ModuleConfig> = {
  demographics: {
    name: 'Demographics',
    icon: '👤',
    description: 'Patient demographics and personal information',
    port: 4201
  },
  vitals: {
    name: 'Vitals',
    icon: '💓',
    description: 'Vital signs (temperature, BP, heart rate, O2)',
    port: 4202
  },
  labs: {
    name: 'Labs',
    icon: '🧪',
    description: 'Laboratory test results',
    port: 4203
  },
  medications: {
    name: 'Medications',
    icon: '💊',
    description: 'Current medications and prescriptions',
    port: 4204
  },
  visits: {
    name: 'Visits',
    icon: '📅',
    description: 'Hospital, clinic, and office visits',
    port: 4205
  }
};

const ROLE_CONFIGURATIONS: RoleConfig[] = [
  {
    role: 'nurse',
    displayName: 'Nurse',
    modules: ['medications'],
    layoutMode: 'dashboard'
  },
  {
    role: 'physician',
    displayName: 'Physician / Doctor',
    modules: ['medications'],
    layoutMode: 'dashboard'
  },
  {
    role: 'lab-tech',
    displayName: 'Lab Technician',
    modules: ['medications'],
    layoutMode: 'dashboard'
  },
  {
    role: 'radiology',
    displayName: 'Radiologist',
    modules: ['medications'],
    layoutMode: 'dashboard'
  },
  {
    role: 'nutrition',
    displayName: 'Nutritionist',
    modules: ['medications'],
    layoutMode: 'dashboard'
  },
  {
    role: 'physical-therapy',
    displayName: 'Physical Therapist',
    modules: ['medications'],
    layoutMode: 'dashboard'
  },
  {
    role: 'admin',
    displayName: 'Administrator',
    modules: ['medications'],
    layoutMode: 'dashboard'
  }
];

/**
 * Get modules for a specific role
 */
export function getModulesForRole(role: string): ModuleConfig[] {
  const roleConfig = ROLE_CONFIGURATIONS.find(rc => rc.role === role);
  if (!roleConfig) {
    // Default to all modules if role not found
    return Object.values(MODULES);
  }
  return roleConfig.modules.map(moduleKey => MODULES[moduleKey]);
}

/**
 * Get role configuration
 */
export function getRoleConfig(role: string): RoleConfig | undefined {
  return ROLE_CONFIGURATIONS.find(rc => rc.role === role);
}

/**
 * Get all available modules
 */
export function getAllModules(): ModuleConfig[] {
  return Object.values(MODULES);
}

/**
 * Get module by name
 */
export function getModule(name: string): ModuleConfig | undefined {
  return Object.values(MODULES).find(m => m.name === name);
}

/**
 * Get module port
 */
export function getModulePort(moduleName: string): number | undefined {
  const moduleKey = Object.keys(MODULES).find(
    key => MODULES[key].name === moduleName
  );
  return moduleKey ? MODULES[moduleKey].port : undefined;
}
