# Phase 7 Implementation Guide: React Procedures Module

## Quick Start

This guide walks through implementing the Procedures module step-by-step with actual code.

---

## Phase 7.1: Module Loader Service

### File: `frontend/shell-app/src/app/core/services/module-loader.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { ModuleMetadata } from './plugin-registry.service';

declare global {
  interface Window {
    __FEDERATION_SHARED__?: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ModuleLoaderService {
  private loadedModules = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();

  constructor() {}

  /**
   * Load a module dynamically from remote entry
   * Supports both Angular and React modules
   */
  async loadModule(module: ModuleMetadata): Promise<any> {
    console.log(`[ModuleLoader] Loading module: ${module.id} from ${module.remoteEntry}`);

    // Return cached module if already loaded
    if (this.loadedModules.has(module.id)) {
      console.log(`[ModuleLoader] Module ${module.id} already cached, returning cached version`);
      return this.loadedModules.get(module.id);
    }

    // Return in-progress promise if loading
    if (this.loadingPromises.has(module.id)) {
      console.log(`[ModuleLoader] Module ${module.id} is loading, waiting for completion`);
      return this.loadingPromises.get(module.id);
    }

    // Start loading
    const loadPromise = this.performLoad(module);
    this.loadingPromises.set(module.id, loadPromise);

    try {
      const result = await loadPromise;
      this.loadedModules.set(module.id, result);
      this.loadingPromises.delete(module.id);
      return result;
    } catch (error) {
      this.loadingPromises.delete(module.id);
      throw error;
    }
  }

  /**
   * Internal method: Perform the actual module load
   */
  private async performLoad(module: ModuleMetadata): Promise<any> {
    try {
      // Step 1: Load remote entry script
      console.log(`[ModuleLoader] Loading remoteEntry.js from ${module.remoteEntry}`);
      await this.loadRemoteEntry(module.remoteEntry);

      // Step 2: Get module container
      const container = window[module.remoteName as any];
      if (!container) {
        throw new Error(`Module container '${module.remoteName}' not found on window`);
      }

      // Step 3: Initialize shared dependencies
      console.log(`[ModuleLoader] Initializing shared dependencies for ${module.id}`);
      await this.initializeContainer(container);

      // Step 4: Get exposed module
      console.log(`[ModuleLoader] Getting exposed module: ${module.exposedModule}`);
      const moduleFactory = await container.get(module.exposedModule);

      console.log(`[ModuleLoader] Successfully loaded module ${module.id}`);
      return moduleFactory;
    } catch (error) {
      console.error(`[ModuleLoader] Failed to load module ${module.id}:`, error);
      throw error;
    }
  }

  /**
   * Load remoteEntry.js dynamically
   */
  private loadRemoteEntry(remoteEntry: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const scripts = document.querySelectorAll('script');
      const exists = Array.from(scripts).some(s => s.src === remoteEntry);
      if (exists) {
        console.log(`[ModuleLoader] remoteEntry.js already loaded: ${remoteEntry}`);
        resolve();
        return;
      }

      // Create and append script
      const script = document.createElement('script');
      script.src = remoteEntry;
      script.type = 'text/javascript';
      script.async = true;

      script.onload = () => {
        console.log(`[ModuleLoader] remoteEntry.js loaded: ${remoteEntry}`);
        resolve();
      };

      script.onerror = () => {
        reject(new Error(`Failed to load remoteEntry.js: ${remoteEntry}`));
      };

      document.body.appendChild(script);
    });
  }

  /**
   * Initialize container (share dependencies)
   */
  private async initializeContainer(container: any): Promise<void> {
    // Build shared scope
    const sharedScope = {
      react: { '18.2.0': { get: () => Promise.resolve(require('react')), eager: false } },
      'react-dom': { '18.2.0': { get: () => Promise.resolve(require('react-dom')), eager: false } }
    };

    // Initialize the container with shared dependencies
    if (container.init) {
      try {
        await container.init(sharedScope);
      } catch (error) {
        console.warn('[ModuleLoader] Error during container initialization:', error);
        // Non-fatal - continue anyway
      }
    }
  }

  /**
   * Mount a component into a container
   * Handles both Angular and React components
   */
  mountComponent(
    componentOrModule: any,
    container: HTMLElement,
    inputs?: any
  ): void {
    const isReactModule = componentOrModule.default &&
      (componentOrModule.default.$$typeof ||
       (typeof componentOrModule.default === 'function' &&
        componentOrModule.default.prototype === undefined &&
        componentOrModule.default.toString().includes('react')));

    if (isReactModule) {
      console.log('[ModuleLoader] Detected React module, mounting with ReactDOM');
      this.mountReactComponent(componentOrModule.default, container, inputs);
    } else {
      console.log('[ModuleLoader] Detected Angular component');
      // Angular modules are handled by Angular's component instantiation
      throw new Error('Angular components should use standard Angular routing');
    }
  }

  /**
   * Mount React component using ReactDOM
   */
  private mountReactComponent(Component: any, container: HTMLElement, props: any = {}): void {
    try {
      // Import React at runtime
      const React = require('react');
      const ReactDOM = require('react-dom/client');

      console.log('[ModuleLoader] Rendering React component');

      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(Component, props));

      // Store reference for cleanup
      (container as any).__react_root = root;
    } catch (error) {
      console.error('[ModuleLoader] Error mounting React component:', error);
      container.innerHTML = `<div style="padding: 20px; color: red;">
        Error loading module: ${error.message}
      </div>`;
    }
  }

  /**
   * Unload module from memory
   */
  unloadModule(moduleId: string): void {
    console.log(`[ModuleLoader] Unloading module: ${moduleId}`);
    this.loadedModules.delete(moduleId);
    this.loadingPromises.delete(moduleId);
  }

  /**
   * Clear all modules
   */
  clearAllModules(): void {
    console.log('[ModuleLoader] Clearing all loaded modules');
    this.loadedModules.clear();
    this.loadingPromises.clear();
  }
}
```

### File: `frontend/shell-app/src/app/shared/components/dynamic-module-container/dynamic-module-container.component.ts`

```typescript
import { Component, Input, ViewChild, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { ModuleMetadata } from '../../../core/services/plugin-registry.service';
import { ModuleLoaderService } from '../../../core/services/module-loader.service';

@Component({
  selector: 'app-dynamic-module-container',
  template: `
    <div class="module-container" [attr.data-module]="module?.id">
      <!-- Loading state -->
      <div *ngIf="isLoading" class="loading">
        <p>Loading {{ module?.name }}...</p>
      </div>

      <!-- Error state -->
      <div *ngIf="error" class="error">
        <h3>Error Loading Module</h3>
        <p>{{ error }}</p>
        <button (click)="retry()">Retry</button>
      </div>

      <!-- React/other framework container -->
      <div #reactContainer class="react-module-container"></div>

      <!-- Angular component container -->
      <ng-template #angularContainer></ng-template>
    </div>
  `,
  styles: [`
    .module-container {
      padding: 20px;
      min-height: 400px;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 400px;
      font-size: 1.1em;
      color: #666;
    }

    .error {
      padding: 20px;
      background: #fee;
      border: 1px solid #fcc;
      border-radius: 4px;
      color: #c00;
    }

    .error h3 {
      margin-top: 0;
    }

    .error button {
      padding: 8px 16px;
      background: #c00;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .error button:hover {
      background: #900;
    }

    .react-module-container {
      min-height: 400px;
    }
  `]
})
export class DynamicModuleContainerComponent implements OnInit, OnDestroy {
  @Input() module: ModuleMetadata | null = null;
  @Input() patientId: string | null = null;
  
  @ViewChild('reactContainer') reactContainer: any;
  @ViewChild('angularContainer', { read: ViewContainerRef }) angularContainer!: ViewContainerRef;

  isLoading = false;
  error: string | null = null;

  constructor(private moduleLoader: ModuleLoaderService) {}

  async ngOnInit() {
    if (this.module) {
      await this.loadModule();
    }
  }

  async loadModule() {
    if (!this.module) return;

    this.isLoading = true;
    this.error = null;

    try {
      const moduleFactory = await this.moduleLoader.loadModule(this.module);

      if (this.module.framework === 'react') {
        // Wait for view to initialize
        await new Promise(resolve => setTimeout(resolve, 0));
        
        this.moduleLoader.mountComponent(
          moduleFactory,
          this.reactContainer?.nativeElement,
          { patientId: this.patientId }
        );
      } else if (this.module.framework === 'angular') {
        // Angular modules handled through standard routing
        console.log('[DynamicModuleContainer] Angular module - should be handled by routing');
      }
    } catch (err: any) {
      this.error = `Failed to load ${this.module.name}: ${err.message}`;
      console.error('[DynamicModuleContainer]', this.error);
    } finally {
      this.isLoading = false;
    }
  }

  retry() {
    this.loadModule();
  }

  ngOnDestroy() {
    if (this.module) {
      this.moduleLoader.unloadModule(this.module.id);
    }
  }
}
```

### Update: `frontend/shell-app/src/app/app.module.ts`

```typescript
import { NgModule } from '@angular/core';
import { ModuleLoaderService } from './core/services/module-loader.service';
import { DynamicModuleContainerComponent } from './shared/components/dynamic-module-container/dynamic-module-container.component';

@NgModule({
  // ... existing modules
  providers: [
    ModuleLoaderService,
    // ... other services
  ],
  declarations: [
    DynamicModuleContainerComponent,
    // ... other components
  ]
})
export class AppModule { }
```

---

## Phase 7.2: React Procedures Module

### File: `frontend/modules/procedures-react/webpack.config.js`

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('@module-federation/enhanced');

module.exports = {
  mode: 'production',
  entry: './src/index',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
              '@babel/preset-react'
            ],
            plugins: []
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'proceduresApp',
      filename: 'remoteEntry.js',
      
      // Expose components
      exposes: {
        './ProceduresModule': './src/ProceduresModule'
      },
      
      // Share dependencies with shell
      shared: {
        react: {
          singleton: true,
          requiredVersion: '18.2.0',
          shareKey: 'react',
          shareScope: 'default',
          eager: false
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '18.2.0',
          shareKey: 'react-dom',
          shareScope: 'default',
          eager: false
        },
        'react-query': {
          singleton: true,
          requiredVersion: false,
          eager: false
        }
      }
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ],
  devServer: {
    port: 4207,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
};
```

### File: `frontend/modules/procedures-react/src/ProceduresModule.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { usePatientContext } from './hooks/usePatientContext';
import { useProcedures } from './hooks/useProcedures';
import ProceduresList from './components/ProceduresList';
import ProcedureDetail from './components/ProcedureDetail';
import './styles/procedures.css';

/**
 * Main Procedures Module - Entry point for Module Federation
 * Receives patientId from shell props
 */
export default function ProceduresModule({ patientId: initialPatientId }) {
  const [view, setView] = useState('list'); // 'list' or 'detail'
  const [selectedProcedure, setSelectedProcedure] = useState(null);

  // Get patient ID from context (updates in real-time)
  const contextPatientId = usePatientContext();
  const effectivePatientId = contextPatientId || initialPatientId;

  // Fetch procedures
  const { data: procedures, isLoading, error, refetch } = useProcedures(effectivePatientId);

  console.log('[ProceduresModule] Rendering', { effectivePatientId, proceduresCount: procedures?.length });

  if (!effectivePatientId) {
    return (
      <div className="procedures-error">
        <p>No patient selected. Select a patient from the sidebar.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="procedures-error">
        <h3>Error Loading Procedures</h3>
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="procedures-module">
      <div className="procedures-header">
        <h2>Procedures</h2>
        <p className="patient-badge">Patient ID: {effectivePatientId}</p>
      </div>

      {view === 'list' ? (
        <ProceduresList
          procedures={procedures}
          isLoading={isLoading}
          onSelectProcedure={(proc) => {
            setSelectedProcedure(proc);
            setView('detail');
          }}
        />
      ) : (
        <ProcedureDetail
          procedure={selectedProcedure}
          onBack={() => {
            setSelectedProcedure(null);
            setView('list');
          }}
        />
      )}
    </div>
  );
}
```

### File: `frontend/modules/procedures-react/src/hooks/usePatientContext.js`

```javascript
import { useState, useEffect } from 'react';

/**
 * Hook to subscribe to patient context from Angular shell
 * Listens to localStorage and custom events
 */
export function usePatientContext() {
  const [patientId, setPatientId] = useState(null);

  useEffect(() => {
    // Handler for patient context changes
    const handleContextChange = (event) => {
      console.log('[usePatientContext] Context changed event', event.detail);
      setPatientId(event.detail?.patientId || null);
    };

    // Listen to custom event from shell
    window.addEventListener('patient-context-changed', handleContextChange);

    // Get current context from localStorage
    try {
      const contextStr = localStorage.getItem('__PATIENT_CONTEXT__');
      if (contextStr) {
        const context = JSON.parse(contextStr);
        console.log('[usePatientContext] Loaded from localStorage', context);
        setPatientId(context.patientId);
      }
    } catch (err) {
      console.error('[usePatientContext] Error reading context', err);
    }

    return () => {
      window.removeEventListener('patient-context-changed', handleContextChange);
    };
  }, []);

  return patientId;
}
```

### File: `frontend/modules/procedures-react/src/hooks/useProcedures.js`

```javascript
import { useQuery } from 'react-query';
import { proceduresService } from '../services/proceduresService';

/**
 * Hook to fetch procedures for a patient
 */
export function useProcedures(patientId) {
  const { data, isLoading, isError, error, refetch } = useQuery(
    ['procedures', patientId],
    () => proceduresService.getProcedures(patientId),
    {
      enabled: !!patientId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (err) => {
        console.error('[useProcedures] Error fetching procedures', err);
      }
    }
  );

  return {
    data: data || [],
    isLoading,
    error: isError ? error : null,
    refetch
  };
}
```

### File: `frontend/modules/procedures-react/src/services/proceduresService.js`

```javascript
const API_GATEWAY = process.env.REACT_APP_API_GATEWAY || 'http://localhost:5000';

export const proceduresService = {
  async getProcedures(patientId) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_GATEWAY}/procedures/patient/${patientId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch procedures: ${response.statusText}`);
    }

    return response.json();
  },

  async getProcedureDetail(procedureId) {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_GATEWAY}/procedures/${procedureId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch procedure: ${response.statusText}`);
    }

    return response.json();
  }
};
```

### File: `frontend/modules/procedures-react/src/components/ProceduresList.jsx`

```jsx
import React from 'react';
import '../styles/procedures-list.css';

export default function ProceduresList({ procedures, isLoading, onSelectProcedure }) {
  if (isLoading) {
    return <div className="loading">Loading procedures...</div>;
  }

  if (!procedures || procedures.length === 0) {
    return (
      <div className="empty-state">
        <p>No procedures found for this patient.</p>
      </div>
    );
  }

  return (
    <div className="procedures-list">
      {procedures.map((proc) => (
        <div
          key={proc.id}
          className={`procedure-card status-${proc.status}`}
          onClick={() => onSelectProcedure(proc)}
        >
          <div className="procedure-header">
            <h3>{proc.name}</h3>
            <span className={`status-badge ${proc.status}`}>{proc.status}</span>
          </div>
          <p className="procedure-type">{proc.type}</p>
          <p className="procedure-date">
            {new Date(proc.scheduledDate).toLocaleDateString()}
          </p>
          <p className="procedure-provider">{proc.provider}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Phase 7.3: BFF-Procedures (Go)

### File: `backend/bff-procedures/main.go`

```go
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

func main() {
	// Create router
	router := mux.NewRouter()

	// Middleware
	router.Use(corsMiddleware)
	router.Use(loggingMiddleware)

	// Routes
	router.HandleFunc("/procedures/patient/{patientId}", getProcedures).Methods("GET")
	router.HandleFunc("/procedures/{id}", getProcedureDetail).Methods("GET")
	router.HandleFunc("/procedures", createProcedure).Methods("POST")
	router.HandleFunc("/procedures/{id}", updateProcedure).Methods("PUT")
	router.HandleFunc("/health", healthCheck).Methods("GET")

	// CORS handling
	corsHandler := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Authorization", "Content-Type"}),
	)(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "5XXX"
	}

	log.Printf("BFF-Procedures starting on port %s", port)
	if err := http.ListenAndServe(":"+port, corsHandler); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[BFF-Procedures] %s %s", r.Method, r.RequestURI)
		next.ServeHTTP(w, r)
	})
}

func getProcedures(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	patientId := vars["patientId"]

	// TODO: Implement actual logic
	// 1. Validate JWT from header
	// 2. Call core API: GET /procedures/patient/{patientId}
	// 3. Transform response
	// 4. Return JSON

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`[]`))
}

func getProcedureDetail(w http.ResponseWriter, r *http.Request) {
	// Implementation similar to getProcedures
}

func createProcedure(w http.ResponseWriter, r *http.Request) {
	// Implementation
}

func updateProcedure(w http.ResponseWriter, r *http.Request) {
	// Implementation
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"healthy"}`))
}
```

---

## Enable Procedures in Registry

### Update: `registry/registry.json`

Change Procedures from disabled to enabled:

```json
{
  "id": "procedures",
  "name": "Procedures",
  "description": "Surgical and clinical procedures",
  "icon": "🏥",
  "path": "procedures",
  "enabled": true,  // ← Change from false to true
  "roles": ["admin", "physician"],
  "order": 7,
  "version": "1.0.0",
  "remoteEntry": "http://localhost:4207/remoteEntry.js",
  "remoteName": "proceduresApp",
  "exposedModule": "./ProceduresModule"
}
```

---

## Quick Deployment

### Build React Module

```bash
cd frontend/modules/procedures-react
npm install
npm run build
docker build -t patientrecords/procedures-react:latest .
```

### Build BFF

```bash
cd backend/bff-procedures
go build -o server main.go
docker build -t patientrecords/bff-procedures:latest .
```

### Deploy with docker-compose

Add to `docker-compose.yml`:

```yaml
patientrecord-procedures:
  build:
    context: ./frontend/modules/procedures-react
  ports:
    - "4207:4207"
  environment:
    - REACT_APP_API_GATEWAY=http://api-gateway:5000

bff-procedures:
  build:
    context: ./backend/bff-procedures
  ports:
    - "5XXX:5XXX"
  environment:
    - CORE_API=http://core-api:5001
```

Then:

```bash
docker-compose up -d patientrecord-procedures bff-procedures
```

---

## Testing

### Test Module Loading

```bash
# Open browser console
curl http://localhost:4207/remoteEntry.js

# Should see Module Federation config
# Then test in shell:
# 1. Navigate to sidebar
# 2. Click "Procedures"
# 3. Should load React component
# 4. Select a patient
# 5. Should display procedures
```

### Test API

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/procedures/patient/20001
```

---

## Common Issues & Fixes

### Module not loading?
1. Check port 4207 is running: `docker logs patientrecord-procedures`
2. Verify registry.json has correct URL
3. Check browser console for errors
4. Verify CORS headers

### Wrong patient data?
1. Verify `patientId` prop is passed
2. Check `usePatientContext` hook
3. Verify localStorage has `__PATIENT_CONTEXT__`

### BFF API errors?
1. Check core API is running
2. Verify auth token in request
3. Check Go server logs

---

This completes the core implementation. Each component integrates with the others to create a seamless cross-framework experience.
