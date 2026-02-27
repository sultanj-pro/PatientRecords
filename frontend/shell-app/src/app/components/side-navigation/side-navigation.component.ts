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
    this.moduleSelected.emit(module);
    
    // Navigate to module
    this.router.navigate(['/dashboard', module.path, 'patient']);
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
