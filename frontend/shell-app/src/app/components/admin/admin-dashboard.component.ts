import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PluginRegistryService, ModuleMetadata } from '../../core/services/plugin-registry.service';

interface ServiceHealthEntry {
  name: string;
  status: string;
}

interface ModuleForm {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  enabled: boolean;
  rolesStr: string;   // comma-separated for the text input
  order: number;
  version: string;
  framework: string;
  remoteEntry: string;
  remoteName: string;
  exposedModule: string;
}

function blankForm(): ModuleForm {
  return {
    id: '', name: '', description: '', icon: '', path: '',
    enabled: true, rolesStr: 'admin,physician',
    order: 0, version: '1.0.0', framework: 'angular',
    remoteEntry: '', remoteName: '', exposedModule: ''
  };
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  modules: ModuleMetadata[] = [];
  services: ServiceHealthEntry[] = [];
  overallHealthStatus = 'loading';
  togglingId: string | null = null;
  loadingModules = true;
  loadingHealth = true;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Role editor state
  readonly allRoles = ['admin', 'physician', 'nurse'];
  editingRolesId: string | null = null;
  pendingRoles: Set<string> = new Set();
  savingRolesId: string | null = null;

  // Module CRUD modal state
  showModuleModal = false;
  isEditMode = false;
  savingModule = false;
  moduleForm: ModuleForm = blankForm();
  editingModuleId: string | null = null;

  // Delete confirmation state
  showDeleteConfirm = false;
  deletingModuleId: string | null = null;
  deletingModuleName = '';
  confirmingDelete = false;

  constructor(
    private pluginRegistry: PluginRegistryService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Fire both in parallel
    await Promise.all([this.loadModules(), this.loadHealth()]);
  }

  async loadModules(): Promise<void> {
    this.loadingModules = true;
    try {
      await this.pluginRegistry.reloadRegistry();
      this.modules = this.pluginRegistry.getAllModulesAdmin();
    } finally {
      this.loadingModules = false;
    }
  }

  async loadHealth(): Promise<void> {
    this.loadingHealth = true;
    this.services = [];
    this.overallHealthStatus = 'loading';
    try {
      const health: any = await firstValueFrom(this.http.get('/health/deep'));
      this.overallHealthStatus = health.status ?? 'unknown';
      if (health.services) {
        this.services = Object.entries(health.services).map(([name, status]) => ({
          name,
          status: String(status)
        }));
      }
    } catch {
      this.overallHealthStatus = 'unreachable';
    } finally {
      this.loadingHealth = false;
    }
  }

  async toggleModule(module: ModuleMetadata): Promise<void> {
    this.togglingId = module.id;
    this.errorMessage = null;
    const newState = !module.enabled;
    try {
      await this.pluginRegistry.toggleModuleRemote(module.id, newState);
      this.modules = this.pluginRegistry.getAllModulesAdmin();
      this.successMessage = `${module.name} ${newState ? 'enabled' : 'disabled'} successfully.`;
      setTimeout(() => (this.successMessage = null), 3000);
    } catch (err: any) {
      this.errorMessage =
        `Failed to update ${module.name}: ` +
        (err?.error?.error ?? err?.message ?? 'Unknown error');
    } finally {
      this.togglingId = null;
    }
  }

  openRoleEditor(module: ModuleMetadata): void {
    this.editingRolesId = module.id;
    this.pendingRoles = new Set(module.roles);
  }

  cancelRoleEdit(): void {
    this.editingRolesId = null;
    this.pendingRoles = new Set();
  }

  togglePendingRole(role: string): void {
    if (this.pendingRoles.has(role)) {
      this.pendingRoles.delete(role);
    } else {
      this.pendingRoles.add(role);
    }
  }

  async saveRoles(module: ModuleMetadata): Promise<void> {
    if (this.pendingRoles.size === 0) {
      this.errorMessage = 'At least one role must be selected.';
      return;
    }
    this.savingRolesId = module.id;
    this.errorMessage = null;
    try {
      const roles = this.allRoles.filter(r => this.pendingRoles.has(r));
      await this.pluginRegistry.updateModuleRoles(module.id, roles);
      this.modules = this.pluginRegistry.getAllModulesAdmin();
      this.editingRolesId = null;
      this.successMessage = `Roles updated for ${module.name}.`;
      setTimeout(() => (this.successMessage = null), 3000);
    } catch (err: any) {
      this.errorMessage =
        `Failed to update roles for ${module.name}: ` +
        (err?.error?.error ?? err?.message ?? 'Unknown error');
    } finally {
      this.savingRolesId = null;
    }
  }

  // ── Module CRUD ──────────────────────────────────────────────

  openAddModal(): void {
    this.isEditMode = false;
    this.editingModuleId = null;
    this.moduleForm = blankForm();
    this.showModuleModal = true;
    this.errorMessage = null;
  }

  openEditModal(m: ModuleMetadata): void {
    this.isEditMode = true;
    this.editingModuleId = m.id;
    this.moduleForm = {
      id: m.id,
      name: m.name,
      description: m.description,
      icon: m.icon,
      path: m.path,
      enabled: m.enabled,
      rolesStr: (m.roles ?? []).join(','),
      order: m.order,
      version: m.version,
      framework: m.framework ?? 'angular',
      remoteEntry: m.remoteEntry ?? '',
      remoteName: m.remoteName ?? '',
      exposedModule: m.exposedModule ?? ''
    };
    this.showModuleModal = true;
    this.errorMessage = null;
  }

  closeModuleModal(): void {
    this.showModuleModal = false;
  }

  async saveModule(): Promise<void> {
    this.errorMessage = null;
    const { id, rolesStr, ...rest } = this.moduleForm;
    const roles = rolesStr.split(',').map(r => r.trim()).filter(Boolean);
    if (!id || !rest.name || !rest.path) {
      this.errorMessage = 'ID, Name, and Path are required.';
      return;
    }
    if (roles.length === 0) {
      this.errorMessage = 'At least one role is required.';
      return;
    }
    const payload: any = { id, ...rest, roles, framework: rest.framework as 'angular' | 'react' };
    this.savingModule = true;
    try {
      if (this.isEditMode && this.editingModuleId) {
        await this.pluginRegistry.updateModule(this.editingModuleId, payload);
        this.successMessage = `${rest.name} updated successfully.`;
      } else {
        await this.pluginRegistry.createModule(payload);
        this.successMessage = `${rest.name} created successfully.`;
      }
      this.modules = this.pluginRegistry.getAllModulesAdmin();
      this.showModuleModal = false;
      setTimeout(() => (this.successMessage = null), 3000);
    } catch (err: any) {
      this.errorMessage = err?.error?.error ?? err?.message ?? 'Save failed.';
    } finally {
      this.savingModule = false;
    }
  }

  openDeleteConfirm(m: ModuleMetadata): void {
    this.deletingModuleId = m.id;
    this.deletingModuleName = m.name;
    this.showDeleteConfirm = true;
    this.errorMessage = null;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingModuleId = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.deletingModuleId) return;
    this.confirmingDelete = true;
    this.errorMessage = null;
    try {
      await this.pluginRegistry.deleteModule(this.deletingModuleId);
      this.modules = this.pluginRegistry.getAllModulesAdmin();
      this.showDeleteConfirm = false;
      this.successMessage = `${this.deletingModuleName} deleted.`;
      this.deletingModuleId = null;
      setTimeout(() => (this.successMessage = null), 3000);
    } catch (err: any) {
      this.errorMessage = err?.error?.error ?? err?.message ?? 'Delete failed.';
    } finally {
      this.confirmingDelete = false;
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
