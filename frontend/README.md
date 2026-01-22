# PatientRecords Frontend - Micro-Frontend Architecture

This is a monorepo containing the Angular micro-frontend architecture for PatientRecords.

## Directory Structure

```
frontend/
├── shell-app/                 # Host/Shell Application (Port 4200)
├── modules/
│   ├── demographics/          # Demographics Module (Port 4201)
│   ├── vitals/               # Vitals Module (Port 4202)
│   ├── labs/                 # Labs Module (Port 4203)
│   ├── medications/          # Medications Module (Port 4204)
│   └── visits/               # Visits Module (Port 4205)
├── shared/                   # Shared Library (services, models, auth)
├── package.json              # Root monorepo config
└── tsconfig.base.json        # Base TypeScript config
```

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm 9+
- Angular CLI 17+

### Install Dependencies

```bash
cd frontend
npm install
```

This will install dependencies for all workspaces (shell-app, modules, shared) due to npm workspaces configuration.

## Development

### Start All Applications

```bash
npm run start:all
```

This starts the shell app (port 4200) and all 5 micro-frontend modules in parallel.

### Start Individual Applications

```bash
# Shell app only
npm run start:shell          # Port 4200

# Individual modules
npm run start:demographics   # Port 4201
npm run start:vitals         # Port 4202
npm run start:labs           # Port 4203
npm run start:medications    # Port 4204
npm run start:visits         # Port 4205

# Start all modules (no shell)
npm run start:modules
```

### Access the Application

- **Shell App**: http://localhost:4200

The shell app will load and manage all micro-frontend modules. Each module can also be accessed independently during development.

## Building

### Build All

```bash
npm run build
```

Builds shared library, all modules, then shell app.

### Build Individual Components

```bash
npm run build:shell
npm run build:shared
npm run build:demographics
npm run build:vitals
npm run build:labs
npm run build:medications
npm run build:visits
```

## Testing

### Run All Tests

```bash
npm test
```

### Test Individual Components

```bash
npm run test:shell
npm run test:shared
npm run test:demographics
npm run test:vitals
npm run test:labs
npm run test:medications
npm run test:visits
```

## Linting

```bash
npm run lint
```

Or lint individual components:

```bash
npm run lint:shell
npm run lint:shared
npm run lint:demographics
# ... etc
```

## Architecture Overview

### Shell Application (Host)
- Orchestrates all micro-frontends
- Handles user authentication
- Manages patient search and selection
- Dynamically loads modules based on user role
- Uses Webpack Module Federation to integrate micro-frontends

### Micro-Frontend Modules
Each module is independently developed, tested, and deployed:
- **Demographics**: Patient information display
- **Vitals**: Vital signs and health metrics
- **Labs**: Laboratory results
- **Medications**: Medication records
- **Visits**: Visit/appointment records

### Shared Library
Common code used across all modules:
- Authentication service & JWT interceptor
- API service for backend communication
- Patient context service (shared state)
- Common models and interfaces
- Shared utilities

## Key Technologies

- **Angular 17**: Frontend framework
- **TypeScript 5**: Programming language
- **Webpack 5 Module Federation**: Micro-frontend integration
- **RxJS**: Reactive programming
- **npm Workspaces**: Monorepo management

## API Integration

All modules communicate with the Node.js backend API at `http://localhost:5001`.

The shared library's `ApiService` handles:
- Base URL management
- JWT token injection (from shared auth service)
- Error handling
- Request/response interceptors

## Troubleshooting

### Module Not Loading
- Ensure the module's dev server is running on the correct port
- Check browser console for CORS errors
- Verify webpack Module Federation configuration

### Token Issues
- Clear localStorage and log in again
- Check JWT token expiration
- Verify backend is issuing tokens correctly

### Dependency Conflicts
```bash
# Clear node_modules and reinstall
rm -rf node_modules && npm install
```

## Next Steps

1. Implement shell app with login and patient search
2. Create shared library services and interceptors
3. Build individual micro-frontend modules
4. Configure Module Federation for each module
5. Test module loading and data sharing
6. Deploy to Docker containers

## Documentation

For detailed architecture documentation, see [MICRO_FRONTEND_ARCHITECTURE.md](../MICRO_FRONTEND_ARCHITECTURE.md)

## Support

For issues or questions, refer to the architecture documentation or the individual module READMEs.
