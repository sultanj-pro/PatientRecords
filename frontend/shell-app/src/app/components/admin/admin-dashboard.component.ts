import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PluginRegistryService, ModuleMetadata } from '../../core/services/plugin-registry.service';

interface ServiceHealthEntry {
  name: string;
  status: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
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
  editingRolesId: string | null = null;   // module.id currently being edited
  pendingRoles: Set<string> = new Set();  // working copy of selected roles
  savingRolesId: string | null = null;

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

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
