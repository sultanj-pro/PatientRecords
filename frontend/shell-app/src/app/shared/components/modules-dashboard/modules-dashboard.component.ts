import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Module {
  name: string;
  icon: string;
  description: string;
  loaded: boolean;
}

@Component({
  selector: 'app-modules-dashboard',
  templateUrl: './modules-dashboard.component.html',
  styleUrls: ['./modules-dashboard.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class ModulesDashboardComponent implements OnInit, OnDestroy {
  modules: Module[] = [
    { name: 'Demographics', icon: '👤', description: 'Patient demographics', loaded: false },
    { name: 'Vitals', icon: '💓', description: 'Vital signs', loaded: false },
    { name: 'Labs', icon: '🧪', description: 'Lab results', loaded: false },
    { name: 'Medications', icon: '💊', description: 'Medications', loaded: false },
    { name: 'Visits', icon: '📅', description: 'Visits', loaded: false }
  ];
  selectedModule: string | null = null;

  ngOnInit(): void {
    // Select first module by default
    if (this.modules.length > 0) {
      this.selectModule(this.modules[0].name);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
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

  isModuleSelected(moduleName: string): boolean {
    return this.selectedModule === moduleName;
  }

  getModuleDescription(moduleName: string): string {
    const module = this.modules.find(m => m.name === moduleName);
    return module?.description || '';
  }
}
