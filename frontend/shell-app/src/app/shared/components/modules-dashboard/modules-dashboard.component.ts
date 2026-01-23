import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { getModulesForRole, ModuleConfig } from '../../../core/config/role-module-config';

interface ModuleDisplay extends ModuleConfig {
  loaded: boolean;
  order: number;
}

@Component({
  selector: 'app-modules-dashboard',
  templateUrl: './modules-dashboard.component.html',
  styleUrls: ['./modules-dashboard.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ModulesDashboardComponent implements OnInit, OnDestroy {
  modules: ModuleDisplay[] = [];
  selectedModule: string | null = null;
  userRole: string = 'nurse'; // default role

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Get user role
    const role = this.authService.getRole();
    this.userRole = role || 'nurse';

    // Load modules for user's role
    this.loadModulesForRole(this.userRole);

    // Select first module by default
    if (this.modules.length > 0) {
      this.selectModule(this.modules[0].name);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Load modules based on user role
   */
  private loadModulesForRole(role: string): void {
    const availableModules = getModulesForRole(role);
    this.modules = availableModules.map((module, index) => ({
      ...module,
      loaded: false,
      order: index
    }));
  }

  selectModule(moduleName: string): void {
    this.selectedModule = moduleName;
    const module = this.modules.find(m => m.name === moduleName);
    if (module) {
      module.loaded = true;
    }
  }

  getModuleIcon(moduleName: string): string {
    const module = this.modules.find(m => m.name === moduleName);
    return module?.icon || '📦';
  }

  getModuleDescription(moduleName: string): string {
    const module = this.modules.find(m => m.name === moduleName);
    return module?.description || '';
  }

  isModuleSelected(moduleName: string): boolean {
    return this.selectedModule === moduleName;
  }
}
