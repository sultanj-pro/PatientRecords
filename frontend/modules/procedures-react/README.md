# Procedures Module - React Micro-Frontend

A React-based micro-frontend module for managing clinical procedures, built with Module Federation for dynamic loading into the PatientRecords shell application.

## Overview

This module demonstrates:
- ✅ React as a remote module (vs Angular)
- ✅ Module Federation for dynamic loading
- ✅ Integration with the PatientRecords shell
- ✅ Registration through dynamic module discovery

Currently displays a welcome message. Phase 7.2+ will add:
- Procedures list for selected patient
- Procedure details and history
- Procedure scheduling
- Integration with BFF-Procedures API
- Real-time patient context synchronization

## Architecture

```
webpack with Module Federation
        ↓
Generates remoteEntry.js at build time
        ↓
Served on port 4207 via nginx
        ↓
Shell app loads remoteEntry.js dynamically
        ↓
Gets ProceduresModule component
        ↓
Renders in shell's module container
```

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
cd frontend/modules/procedures-react
npm install
```

### Development Server

```bash
npm start
```

Runs on http://localhost:4207 with hot reload support.

### Build for Production

```bash
npm run build
```

Outputs to `dist/` directory with:
- `remoteEntry.js` - Module Federation entry point
- `*.js` - Bundled and optimized code
- `index.html` - HTML template

## Docker Deployment

### Build Image

```bash
docker build -t patientrecords/procedures-react:latest .
```

### Run Container

```bash
docker run -d \
  -p 4207:4207 \
  -e NODE_ENV=production \
  --name procedures-react \
  patientrecords/procedures-react:latest
```

### Verify

```bash
curl http://localhost:4207/remoteEntry.js
```

Should return Module Federation configuration.

## Integration with Shell

The shell application:
1. Queries registry service (`/registry/registry.json`)
2. Finds procedures module entry (port 4207)
3. Dynamically loads `remoteEntry.js`
4. Gets exposed `./ProceduresModule` component
5. Renders it in the module container

### Navigation

Access via the sidebar:
- Shell app: http://localhost:4200
- Navigate to "Procedures" in sidebar
- Should load this React module

## Configuration

### Module Metadata (in registry.json)

```json
{
  "id": "procedures",
  "name": "Procedures",
  "path": "procedures",
  "enabled": true,
  "remoteEntry": "http://localhost:4207/remoteEntry.js",
  "remoteName": "proceduresApp",
  "exposedModule": "./ProceduresModule"
}
```

### Environment Variables

Create `.env.local`:

```
REACT_APP_API_GATEWAY=http://localhost:5000
```

## Deployment with docker-compose

Add to `docker-compose.yml`:

```yaml
patientrecord-procedures:
  build:
    context: ./frontend/modules/procedures-react
    dockerfile: Dockerfile
  ports:
    - "4207:4207"
  environment:
    - REACT_APP_API_GATEWAY=http://api-gateway:5000
  depends_on:
    - api-gateway
```

Then deploy:

```bash
docker-compose up -d patientrecord-procedures
```

## Project Structure

```
.
├── src/
│   ├── ProceduresModule.jsx      # Main React component
│   ├── ProceduresModule.css      # Styling
│   ├── bootstrap.js              # React entry point
│   └── index.js                  # Module entry
├── public/
│   └── index.html                # HTML template
├── webpack.config.js             # Module Federation config
├── package.json                  # Dependencies
├── Dockerfile                    # Container image
├── nginx.conf                    # Production web server
└── .babelrc                      # Babel configuration
```

## Module Federation Config

Key points in `webpack.config.js`:

```javascript
new ModuleFederationPlugin({
  name: 'proceduresApp',           // Container name on window
  filename: 'remoteEntry.js',      // Generated at build time
  exposes: {
    './ProceduresModule': './src/ProceduresModule'  // What's exposed
  },
  shared: {                        // Shared with shell
    react: { singleton: true },
    'react-dom': { singleton: true }
  }
})
```

## Shared Dependencies

To minimize bundle size, the module shares React/React-DOM with the shell:

```
Shell has React 18.2.0
Module requests React 18.2.0
→ Uses shared instance (no duplication)
```

## Future Development

### Phase 7.2: API Integration
- Fetch procedures from BFF-Procedures
- Display procedures list
- Show procedure details

### Phase 7.3: Patient Context
- Listen to patient context changes from shell
- Auto-update when patient selected
- Real-time synchronization

### Phase 7.4: Features
- Procedure scheduling
- Timeline visualization
- Status tracking
- Provider information

## Troubleshooting

### remoteEntry.js returns 404

Check:
1. Container is running: `docker ps | grep procedures`
2. Port 4207 is accessible: `curl localhost:4207`
3. Nginx serving files: `docker logs patientrecord-procedures`

### Module doesn't appear in shell

Check:
1. Registry has procedures enabled: `"enabled": true`
2. remoteEntry.js loads: `curl localhost:4207/remoteEntry.js`
3. Browser console for CORS errors
4. Shell is querying registry: Check Network tab for `/registry/registry.json`

### Styling looks wrong

Check:
1. CSS files bundled: `webpack-bundle-analyzer`
2. Import paths correct in JSX
3. No CSS conflicts with shell styles
4. nginx not stripping CSS files

## References

- [Module Federation Documentation](https://webpack.js.org/concepts/module-federation/)
- [React Documentation](https://react.dev/)
- [Webpack Documentation](https://webpack.js.org/)

## License

Part of PatientRecords (MIT License)
