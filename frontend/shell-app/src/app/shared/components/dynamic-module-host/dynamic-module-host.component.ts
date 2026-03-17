import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DynamicRouteLoaderService } from '../../../core/services/dynamic-route-loader.service';
import { PluginRegistryService, ModuleMetadata } from '../../../core/services/plugin-registry.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

/**
 * Dynamic Module Host Component
 * 
 * This component serves as a container for dynamically loaded modules (both Angular and React).
 * It handles:
 * - Loading modules from the registry based on route
 * - Rendering Angular components/modules
 * - Mounting React components in DOM containers
 * - Passing patient context to modules
 * - Error handling and loading states
 */
@Component({
  selector: 'app-dynamic-module-host',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="module-host">
      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading {{ moduleName }}...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-state">
        <div class="error-content">
          <h3>Error Loading Module</h3>
          <p>{{ error }}</p>
          <button (click)="retry()">Retry</button>
        </div>
      </div>

      <!-- Module Container -->
      <div *ngIf="!isLoading && !error" class="module-container">
        <!-- React modules mount here -->
        <div #reactContainer class="react-module-container" *ngIf="isReactModule"></div>
        <!-- Angular components render here via ng-outlet -->
        <router-outlet *ngIf="!isReactModule"></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .module-host {
      width: 100%;
      height: 100%;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 400px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 1.1em;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 400px;
      background: #fef2f2;
      padding: 20px;
    }

    .error-content {
      background: white;
      border: 2px solid #fecaca;
      border-radius: 8px;
      padding: 30px;
      max-width: 400px;
      text-align: center;
    }

    .error-content h3 {
      color: #dc2626;
      margin-top: 0;
    }

    .error-content p {
      color: #666;
      margin: 15px 0;
    }

    .error-content button {
      background: #dc2626;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1em;
    }

    .error-content button:hover {
      background: #b91c1c;
    }

    .module-container {
      width: 100%;
      height: 100%;
    }

    .react-module-container {
      width: 100%;
      height: 100%;
      min-height: 500px;
      display: block;
    }
  `]
})
export class DynamicModuleHostComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('reactContainer', { static: false }) reactContainer!: ElementRef<HTMLDivElement>;

  isLoading = false;
  error: string | null = null;
  moduleName: string = '';
  isReactModule = false;
  patientId: string | null = null;
  
  private destroy$ = new Subject<void>();
  private currentModuleId: string | null = null;
  private pendingReactComponent: any = null;
  private pendingRenderFunction: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dynamicRouteLoader: DynamicRouteLoaderService,
    private registryService: PluginRegistryService
  ) {}

  async ngOnInit() {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (params) => {
        this.patientId = params['patientId'] || null;
        await this.loadModule();
      });
  }

  ngAfterViewInit() {
    // This is called after the view is initialized
    // If we need to load a React module, mount it now that the container is available
    if (this.isReactModule && (this.pendingRenderFunction || this.pendingReactComponent)) {
      console.log('[DynamicModuleHost] ngAfterViewInit: Attempting to mount pending React component');
      this.tryMountPendingComponent().catch(err => {
        console.error('[DynamicModuleHost] Failed to mount React component in ngAfterViewInit:', err);
      });
    }
  }

  // Called after any async module loading completes
  private async tryMountPendingComponent() {
    // Wait a tick for the template to update and ViewChild to be resolved
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (this.isReactModule && this.reactContainer) {
      if (this.pendingRenderFunction) {
        // Use the module's render function
        console.log('[DynamicModuleHost] Calling module render function');
        try {
          const renderFunc = this.pendingRenderFunction.render;
          const patientId = this.pendingRenderFunction.patientId;
          const container = this.reactContainer.nativeElement;
          
          await renderFunc(container, patientId);
          console.log('[DynamicModuleHost] Module render function completed successfully');
          this.pendingRenderFunction = null;
        } catch (err: any) {
          console.error('[DynamicModuleHost] Failed to call module render function:', err);
          this.error = err?.message || 'Failed to render React module';
        }
      } else if (this.pendingReactComponent) {
        // Fall back to mounting component directly
        console.log('[DynamicModuleHost] Mounting React component via Angular');
        try {
          await this.mountReactComponent(this.pendingReactComponent);
          this.pendingReactComponent = null;
        } catch (err: any) {
          console.error('[DynamicModuleHost] Failed to mount pending React component:', err);
          this.error = err?.message || 'Failed to mount React component';
        }
      }
    }
  }

  private async loadModule() {
    this.isLoading = true;
    this.error = null;

    try {
      // Extract module path from current router URL
      // URL format: /dashboard/procedures/20001 -> extract 'procedures'
      const currentUrl = this.router.url;
      console.log(`[DynamicModuleHost] Current URL: ${currentUrl}`);
      
      // Split by '/' and filter empty strings
      const urlSegments = currentUrl.split('/').filter(s => s && s !== 'dashboard');
      
      if (urlSegments.length === 0) {
        throw new Error('Could not extract module path from URL');
      }

      // First segment is the module path (e.g., 'procedures', 'demographics', etc.)
      const modulePath = urlSegments[0];
      console.log(`[DynamicModuleHost] Extracted module path: ${modulePath}`);

      // Get module metadata from registry by path
      const registry = await this.registryService.loadRegistry();
      const module = registry.modules.find(m => m.path === modulePath);
      
      if (!module) {
        throw new Error(`Module with path '${modulePath}' not found in registry`);
      }

      this.currentModuleId = module.id;
      this.moduleName = module.name;
      this.isReactModule = module.framework === 'react';

      console.log(`[DynamicModuleHost] Loaded module metadata: ${module.name} (${module.framework})`);

      if (this.isReactModule) {
        // Load React module
        await this.loadReactModule(module);
      } else {
        // Angular modules handle routing natively
        console.log('[DynamicModuleHost] Angular module - routing handles loading');
      }

      this.isLoading = false;
    } catch (err: any) {
      this.error = err.message || 'Failed to load module';
      this.isLoading = false;
      console.error('[DynamicModuleHost] Error loading module:', err);
    }
  }

  private async loadReactModule(module: ModuleMetadata) {
    try {
      console.log(`[DynamicModuleHost] Loading React module: ${module.id} from ${module.remoteEntry}`);

      // Load the remote entry
      await this.dynamicRouteLoader.loadRemoteEntryPublic(module.remoteEntry, module.remoteName);
      console.log(`[DynamicModuleHost] Remote entry loaded: ${module.remoteName}`);

      // Get the container
      const container = (window as any)[module.remoteName];
      if (!container) {
        throw new Error(`Container ${module.remoteName} not found on window after loading remoteEntry`);
      }

      // Initialize shared scope only if the container hasn't been initialized yet
      const sharedScope = this.dynamicRouteLoader.getSharedScopePublic();
      
      try {
        if (container.init && !container.__initialized) {
          console.log(`[DynamicModuleHost] Initializing shared scope for ${module.remoteName}`);
          await container.init(sharedScope);
          container.__initialized = true;
        } else {
          console.log(`[DynamicModuleHost] Container already initialized, skipping init`);
        }
      } catch (initErr: any) {
        // If init fails with "already initialized with different share scope", proceed anyway
        if (initErr.message && initErr.message.includes('already been initialized')) {
          console.warn(`[DynamicModuleHost] Container already initialized, continuing:`, initErr.message);
        } else {
          throw initErr;
        }
      }

      // Get the exposed module
      const factory = await container.get(module.exposedModule);
      if (!factory) {
        throw new Error(`Exposed module ${module.exposedModule} not found in ${module.remoteName}`);
      }

      const moduleExports = factory();
      console.log(`[DynamicModuleHost] Module exports loaded`, moduleExports);

      // Handle nested exports from Module Federation wrapper
      let actualExports = moduleExports;
      if (moduleExports && moduleExports.default && Object.keys(moduleExports).length === 1) {
        // Module Federation wrapped our export, unwrap it
        console.log(`[DynamicModuleHost] Unwrapping nested exports`);
        actualExports = moduleExports.default;
        console.log(`[DynamicModuleHost] Unwrapped exports:`, actualExports);
      }

      // For React modules, check if exports have a render function
      if (actualExports && typeof actualExports.renderProceduresModule === 'function') {
        // Found render function - use it
        console.log(`[DynamicModuleHost] Found renderProceduresModule function in exports, using it`);
        this.pendingRenderFunction = {
          render: actualExports.renderProceduresModule,
          patientId: this.patientId
        };
      } else if (actualExports && typeof actualExports.ProceduresModule === 'function') {
        // Found component as named export
        console.log(`[DynamicModuleHost] Found ProceduresModule component in exports, using render function`);
        this.pendingRenderFunction = {
          render: actualExports.renderProceduresModule,
          patientId: this.patientId
        };
      } else if (typeof actualExports === 'function') {
        // Module is a React component (default export)
        console.log(`[DynamicModuleHost] Module is a React component (default export)`);
        this.pendingReactComponent = actualExports;
      } else if (actualExports && typeof actualExports.default === 'function') {
        // Module default is a function (component)
        console.log(`[DynamicModuleHost] Module has default export as function`);
        this.pendingReactComponent = actualExports.default;
      } else {
        throw new Error(`Module exports unexpected format: ${JSON.stringify(Object.keys(actualExports || {}))}`);
      }
      
      // Set isLoading to false to render the react container
      this.isLoading = false;
      
      // Try to render/mount after the template updates
      await this.tryMountPendingComponent();
      
      console.log(`[DynamicModuleHost] Successfully loaded React module: ${module.id}`);
    } catch (err) {
      console.error(`[DynamicModuleHost] Error loading React module ${module.id}:`, err);
      throw err;
    }
  }

  private async mountReactComponent(Component: any) {
    try {
      console.log(`[DynamicModuleHost] Mounting React component`);
      console.log('[DynamicModuleHost] Component:', Component);

      if (!this.reactContainer) {
        console.error('[DynamicModuleHost] ReactContainer ViewChild not available');
        throw new Error('React container not available - element not found in DOM');
      }

      const container = this.reactContainer.nativeElement;
      console.log('[DynamicModuleHost] Container element:', container);
      console.log('[DynamicModuleHost] Container size:', container.offsetWidth, 'x', container.offsetHeight);

      const React = (window as any).React;
      const ReactDOM = (window as any).ReactDOM;

      if (!React || !ReactDOM) {
        const errorMsg = `React or ReactDOM not available on window. React=${typeof React}, ReactDOM=${typeof ReactDOM}`;
        console.error('[DynamicModuleHost]', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[DynamicModuleHost] React available, rendering component');

      const root = ReactDOM.createRoot(container);

      root.render(
        React.createElement(Component, {
          patientId: this.patientId
        })
      );

      console.log('[DynamicModuleHost] Component rendered successfully');
      console.log('[DynamicModuleHost] Container after render:', container.innerHTML.substring(0, 200));

      // Store root for cleanup
      (this.reactContainer as any).__react_root = root;
      this.isLoading = false;
    } catch (err) {
      console.error('[DynamicModuleHost] Error mounting React component:', err);
      if (this.reactContainer) {
        const container = this.reactContainer.nativeElement;
        container.innerHTML = `
          <div style="padding: 20px; color: red;">
            <h3>Error Rendering Module</h3>
            <p>${err}</p>
          </div>
        `;
      }
      throw err;
    }
  }

  retry() {
    this.loadModule();
  }

  ngOnDestroy() {
    // Cleanup React root if it exists
    if (this.reactContainer && (this.reactContainer as any).__react_root) {
      (this.reactContainer as any).__react_root.unmount();
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}
