import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ModuleMetadata } from '../../core/services/plugin-registry.service';

@Component({
  selector: 'app-side-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './side-navigation.component.html',
  styleUrls: ['./side-navigation.component.css']
})
export class SideNavigationComponent implements OnInit {
  @Input() modules: ModuleMetadata[] = [];
  @Input() selectedModule: string = '';
  @Input() currentPatientId: string | null = null; // Patient ID to preserve when navigating
  @Output() moduleSelected = new EventEmitter<ModuleMetadata>();
  @Output() logout = new EventEmitter<void>();

  isCollapsed = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Auto-select first module if none selected
    if (this.modules.length > 0 && !this.selectedModule) {
      this.selectModule(this.modules[0]);
    }
  }

  selectModule(module: ModuleMetadata): void {
    this.selectedModule = module.id;
    // Emit the module selection to parent component
    // Parent (DashboardComponent) will handle navigation with patient ID preserved
    this.moduleSelected.emit(module);
    console.log('[SideNav] Module selected, emitting to parent. Current patient ID:', this.currentPatientId);
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onLogout(): void {
    this.logout.emit();
  }

  getModuleIcon(module: ModuleMetadata): string {
    return module.icon;
  }
}
