import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface RegistryModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  enabled: boolean;
  roles: string[];
  order: number;
  version: string;
  remoteEntry?: string;
  remoteName?: string;
  exposedModule?: string;
  framework?: string;
}

interface ModuleForm {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  enabled: boolean;
  roles: string;
  order: number;
  version: string;
  remoteEntry: string;
  remoteName: string;
  exposedModule: string;
  framework: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  modules: RegistryModule[] = [];
  loading = true;
  error: string | null = null;

  showModal = false;
  isEditing = false;
  saving = false;
  saveError: string | null = null;
  editingId: string | null = null;
  editForm: ModuleForm = this.blankForm();

  showDeleteConfirm = false;
  deletingModule: RegistryModule | null = null;

  readonly availableRoles = ['admin', 'physician', 'nurse'];
  readonly availableFrameworks = ['angular', 'react'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadModules();
  }

  private loadModules(): void {
    this.loading = true;
    this.error = null;
    this.http.get<any>('/api/admin/registry').subscribe({
      next: (res) => {
        this.modules = (res.modules || []).sort((a: RegistryModule, b: RegistryModule) => a.order - b.order);
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to load registry';
        this.loading = false;
      }
    });
  }

  toggleEnabled(mod: RegistryModule): void {
    this.http.patch(`/api/admin/registry/modules/${mod.id}/toggle`, {}).subscribe({
      next: (updated: any) => {
        mod.enabled = updated.enabled ?? !mod.enabled;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to toggle module';
      }
    });
  }

  openAddModal(): void {
    this.isEditing = false;
    this.editingId = null;
    this.editForm = this.blankForm();
    this.saveError = null;
    this.showModal = true;
  }

  openEditModal(mod: RegistryModule): void {
    this.isEditing = true;
    this.editingId = mod.id;
    this.editForm = {
      id: mod.id,
      name: mod.name,
      description: mod.description || '',
      icon: mod.icon || '',
      path: mod.path,
      enabled: mod.enabled,
      roles: (mod.roles || []).join(', '),
      order: mod.order,
      version: mod.version || '1.0.0',
      remoteEntry: mod.remoteEntry || '',
      remoteName: mod.remoteName || '',
      exposedModule: mod.exposedModule || '',
      framework: mod.framework || 'angular'
    };
    this.saveError = null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.saveError = null;
  }

  saveModule(): void {
    if (!this.editForm.id.trim() || !this.editForm.name.trim() || !this.editForm.path.trim()) {
      this.saveError = 'ID, Name, and Path are required.';
      return;
    }
    this.saving = true;
    this.saveError = null;

    const payload: RegistryModule = {
      id: this.editForm.id.trim(),
      name: this.editForm.name.trim(),
      description: this.editForm.description.trim(),
      icon: this.editForm.icon.trim(),
      path: this.editForm.path.trim(),
      enabled: this.editForm.enabled,
      roles: this.editForm.roles.split(',').map(r => r.trim()).filter(Boolean),
      order: this.editForm.order,
      version: this.editForm.version.trim() || '1.0.0',
      remoteEntry: this.editForm.remoteEntry.trim(),
      remoteName: this.editForm.remoteName.trim(),
      exposedModule: this.editForm.exposedModule.trim(),
      framework: this.editForm.framework
    };

    const req = this.isEditing
      ? this.http.put(`/api/admin/registry/modules/${this.editingId}`, payload)
      : this.http.post('/api/admin/registry/modules', payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.loadModules();
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err?.error?.error || 'Save failed. Please try again.';
      }
    });
  }

  confirmDelete(mod: RegistryModule): void {
    this.deletingModule = mod;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.deletingModule = null;
    this.showDeleteConfirm = false;
  }

  deleteModule(): void {
    if (!this.deletingModule) return;
    this.http.delete(`/api/admin/registry/modules/${this.deletingModule.id}`).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.deletingModule = null;
        this.loadModules();
      },
      error: (err) => {
        this.error = err?.error?.error || 'Delete failed';
        this.showDeleteConfirm = false;
      }
    });
  }

  moveUp(mod: RegistryModule): void {
    const idx = this.modules.indexOf(mod);
    if (idx <= 0) return;
    const prev = this.modules[idx - 1];
    this.http.put(`/api/admin/registry/modules/${mod.id}`, { ...mod, order: prev.order }).subscribe({
      next: () => {
        this.http.put(`/api/admin/registry/modules/${prev.id}`, { ...prev, order: mod.order }).subscribe({
          next: () => this.loadModules(),
          error: () => this.loadModules()
        });
      },
      error: () => {}
    });
  }

  moveDown(mod: RegistryModule): void {
    const idx = this.modules.indexOf(mod);
    if (idx >= this.modules.length - 1) return;
    const next = this.modules[idx + 1];
    this.http.put(`/api/admin/registry/modules/${mod.id}`, { ...mod, order: next.order }).subscribe({
      next: () => {
        this.http.put(`/api/admin/registry/modules/${next.id}`, { ...next, order: mod.order }).subscribe({
          next: () => this.loadModules(),
          error: () => this.loadModules()
        });
      },
      error: () => {}
    });
  }

  private blankForm(): ModuleForm {
    return {
      id: '',
      name: '',
      description: '',
      icon: '',
      path: '',
      enabled: true,
      roles: 'admin, physician',
      order: (this.modules.length > 0 ? Math.max(...this.modules.map(m => m.order)) + 1 : 1),
      version: '1.0.0',
      remoteEntry: '',
      remoteName: '',
      exposedModule: '',
      framework: 'angular'
    };
  }
}
