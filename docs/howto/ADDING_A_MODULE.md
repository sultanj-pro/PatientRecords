# How to Add a Remote Module to PatientRecords

**Audience**: Frontend developers  
**Last Updated**: March 16, 2026

---

## Overview

PatientRecords uses **Webpack 5 Module Federation** to load micro-frontend modules at runtime. Each module is an independent Angular application built into its own Docker container and served on its own port. The shell app (port 4200) discovers what modules to show via the registry, federates them in via webpack remotes, and routes to them via Angular's router.

To wire up a new module end-to-end, six things need to be in place:

1. The module's own Angular app (with webpack federation config)
2. A Docker container for it
3. An entry in `docker-compose.yml`
4. An entry in the module registry
5. The shell's webpack remote registration
6. The shell's Angular routes

---

## Port Convention

| Module       | Host Port |
|--------------|-----------|
| shell        | 4200      |
| demographics | 4201      |
| vitals       | 4202      |
| labs         | 4203      |
| medications  | 4204      |
| visits       | 4205      |
| care-team    | 4206      |
| procedures   | 4207      |

Pick the next available port for your new module.

---

## Step 1 — The Module App

The module must be an Angular standalone app under `frontend/modules/<module-name>/`.

Its `webpack.config.js` must expose a routes/module file:

```js
// frontend/modules/<module-name>/webpack.config.js
const mfConfig = {
  name: '<module-name>App',           // e.g. proceduresApp
  filename: 'remoteEntry.js',
  exposes: {
    './<ModuleName>Module': './src/app/<module-name>.module.ts',
  },
  shared: shareAll({ singleton: true, strictVersion: false, requiredVersion: false }),
};
```

The exposed file (`<module-name>.module.ts`) must re-export the routes constant:

```ts
// frontend/modules/<module-name>/src/app/<module-name>.module.ts
export { MY_MODULE_ROUTES } from './<module-name>.routes';
export { MyModuleComponent } from './components/<module-name>/<module-name>.component';
```

The routes file should have a single empty-path route:

```ts
// frontend/modules/<module-name>/src/app/<module-name>.routes.ts
export const MY_MODULE_ROUTES: Routes = [
  { path: '', component: MyModuleComponent }
];
```

---

## Step 2 — Docker Container

Add a `Dockerfile` under `frontend/modules/<module-name>/Dockerfile`. Copy the pattern from any existing module (e.g. `frontend/modules/labs/Dockerfile`).

---

## Step 3 — docker-compose.yml

Add a service entry to `docker-compose.yml`:

```yaml
patientrecord-<module-name>:
  build:
    context: ./frontend
    dockerfile: modules/<module-name>/Dockerfile
  image: patientrecord-<module-name>
  container_name: patientrecord-<module-name>
  ports:
    - "<host-port>:4200"
  depends_on:
    patientrecord-backend:
      condition: service_started
  networks:
    - patientrecords
```

---

## Step 4 — Module Registry

The registry is seeded from `backend/registry.json` (and mirrored in `frontend/modules/registry.json`) on first startup. Add your module to both files:

```json
{
  "id": "<module-name>",
  "name": "My Module",
  "description": "What this module does",
  "icon": "🔬",
  "path": "<module-name>",
  "enabled": true,
  "roles": ["admin", "physician"],
  "order": 8,
  "version": "1.0.0",
  "framework": "angular",
  "remoteEntry": "http://localhost:<host-port>/remoteEntry.js",
  "remoteName": "<module-name>App",
  "exposedModule": "./<ModuleName>Module"
}
```

> **`enabled`** controls sidebar visibility. Set to `false` to hide without removing the entry.  
> **`roles`** controls which user roles see the module in the sidebar (`admin`, `physician`, `nurse`).  
> **`order`** controls the position in the sidebar (lower = higher up).

> **Note:** If the backend is already running and the registry has been seeded into MongoDB, you must either restart the backend with a fresh database, or update it via the admin API:
> ```
> PUT /api/admin/registry/modules/<id>
> ```

---

## Step 5 — Shell Webpack Remote

Register the module as a remote in the shell's webpack config so Module Federation can resolve `import('...')` calls at build time:

```js
// frontend/shell-app/webpack.config.js
remotes: {
  demographicsApp: 'http://localhost:4201/remoteEntry.js',
  vitalsApp:       'http://localhost:4202/remoteEntry.js',
  labsApp:         'http://localhost:4203/remoteEntry.js',
  medicationsApp:  'http://localhost:4204/remoteEntry.js',
  // add your module here:
  myModuleApp:     'http://localhost:<host-port>/remoteEntry.js',
},
```

The key (e.g. `myModuleApp`) must exactly match the `name` field in the module's own `webpack.config.js`.

---

## Step 6 — Shell Angular Routes

Add two routes to `frontend/shell-app/src/bootstrap.ts` inside the `dashboard` children array — one with a patient ID parameter and one without:

```ts
{
  path: '<module-name>/:patientId',
  loadChildren: () => (import('myModuleApp/<ModuleName>Module') as any).then((m: any) => m.MY_MODULE_ROUTES)
},
{
  path: '<module-name>',
  loadChildren: () => (import('myModuleApp/<ModuleName>Module') as any).then((m: any) => m.MY_MODULE_ROUTES)
},
```

The import path format is `<remoteName>/<exposedKey>` — matching the `name` in webpack and the key in `exposes`.

---

## Step 7 — Build & Deploy

Build the new module and rebuild the shell (the shell embeds the webpack remote registration):

```powershell
docker-compose build --no-cache patientrecord-<module-name>
docker-compose build --no-cache patientrecord-shell
docker-compose up -d
```

Then hard-refresh the browser (**Ctrl+Shift+R**).

---

## Checklist

- [ ] `webpack.config.js` — module exposes its routes file with correct `name`
- [ ] `<module-name>.module.ts` — re-exports the routes constant
- [ ] `Dockerfile` exists under `frontend/modules/<module-name>/`
- [ ] `docker-compose.yml` — service added with correct port
- [ ] `backend/registry.json` — module entry added with `enabled: true`
- [ ] `frontend/modules/registry.json` — same entry mirrored
- [ ] `frontend/shell-app/webpack.config.js` — remote registered
- [ ] `frontend/shell-app/src/bootstrap.ts` — two routes added
- [ ] Shell rebuilt and restarted

---

## Common Mistakes

| Symptom | Likely Cause |
|---|---|
| Module not in sidebar | `enabled: false` in registry, or wrong `roles`, or registry not reseeded |
| `NullInjectorError` / blank on navigation | Routes missing from `bootstrap.ts` |
| `Loading chunk failed` | Remote not in `webpack.config.js`, or module container not running |
| Module loads but shows wrong data | `remoteName` in registry doesn't match `name` in module's webpack config |
| Shell builds but patient data doesn't load | Module component doesn't subscribe to `ActivatedRoute.params` |
