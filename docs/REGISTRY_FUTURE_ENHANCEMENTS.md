# Registry Future Enhancements

## Current State (v1.0)

**Assumptions:**
- All micro-frontend modules are on the same domain (`http://localhost`)
- Only localhost development environment supported
- No authentication/credentials needed for module loading
- All modules use HTTP protocol
- remoteEntry URLs are fully qualified: `http://localhost:PORT/remoteEntry.js`

**Current registry structure:**
```json
{
  "id": "demographics",
  "name": "Demographics",
  "remoteEntry": "http://localhost:4201/remoteEntry.js",
  "remoteName": "demographicsApp",
  "exposedModule": "./DemographicsModule"
}
```

## Future Enhancements (To Consider)

### 1. Multi-Domain Support

**Problem:** Modules might be deployed on different domains/servers:
- Demographics on `demographics-service.example.com:4201`
- Labs on `labs-service.example.com:4203`
- Or multi-region: `us-east`, `eu-west`, `asia-pacific`

**Solution Options:**

**Option A: Deconstructed URL** (recommended - most flexible)
```json
{
  "id": "demographics",
  "name": "Demographics",
  "remote": {
    "protocol": "https",
    "host": "demographics-service.example.com",
    "port": 4201,
    "path": "/remoteEntry.js"
  },
  "remoteName": "demographicsApp",
  "exposedModule": "./DemographicsModule"
}
```

**Option B: Environment-based baseUrl**
```json
{
  "baseUrl": "${REMOTE_BASE_URL}",  // resolved from env: http://localhost or https://api.example.com
  "modules": [{
    "id": "demographics",
    "remotePort": 4201,
    "remotePath": "/remoteEntry.js"
  }]
}
```

**Implementation effort:**
- Update `PluginRegistryService.getModuleFederationConfig()` to construct URLs from parts
- Update `ModuleLoaderService.loadModule()` to support constructed URLs

---

### 2. HTTPS Support

**Problem:** Current implementation hardcodes `http://` protocol. Production uses HTTPS.

**Solution:**
- Store protocol in registry per module
- ModuleLoaderService already supports any URL, so this is just a registry data change

**Implementation effort:** LOW - Just registry structure change, no code changes needed

---

### 3. Authentication & Credentials

**Problem:** Some remotes might require:
- API keys
- Bearer tokens  
- Client certificates
- Basic auth

**Solution:**
```json
{
  "id": "demographics",
  "credentials": {
    "type": "bearer|api-key|basic|cert|none",
    "headerName": "Authorization",
    "valueSourceType": "env|hardcoded|oauth2",
    "valueFromEnv": "DEMOGRAPHICS_API_KEY",  // Never hardcode secrets
    "authEndpoint": "https://auth.example.com/token"  // for oauth2
  }
}
```

**Implementation effort:** MEDIUM
- Create custom HTTP interceptor to add credentials based on registry config
- Read from environment variables (never hardcode in registry)
- Handle different auth types (Bearer, Basic, API Key, OAuth2)

**Security considerations:**
- ⚠️ Never store credentials in registry.json
- ✅ Always reference environment variables
- ✅ Use runtime environment value injection
- ✅ Ensure credentials not logged/exposed in browser console

---

### 4. Service Discovery

**Problem:** In microservices deployments, module locations might change dynamically.

**Solution:**
- Support service discovery: `ServiceName.local:PORT`
- Kubernetes: `demographics-service.default.svc.cluster.local:4201`
- Consul/Eureka integration for dynamic discovery

**Implementation effort:** HIGH - Requires external integration

---

### 5. Registry per Environment

**Current:** Single registry.json

**Enhancement:** Environment-specific registries
```
registry.json              (local development - localhost)
registry-staging.json      (staging environment URLs)
registry-prod.json         (production environment URLs)

Loaded based on: environment variable, meta tag, or build-time config
```

**Implementation effort:** MEDIUM
- Add environment configuration to PluginRegistryService
- Update bootstrap to load correct registry version

---

## Migration Path

When implementing these enhancements:

1. **Phase 1: Multi-Domain** (prerequisite for others)
   - Change registry structure to deconstructed format
   - Update PluginRegistryService methods
   - Update ModuleLoaderService to construct URLs

2. **Phase 2: HTTPS**
   - Add protocol field to registry
   - No code changes needed (already works with any URL)

3. **Phase 3: Authentication**
   - Create credentials interceptor
   - Read from environment variables
   - Add to PluginRegistryService

4. **Phase 4: Environment-specific registries**
   - Support multiple registry files
   - Implement environment-based selection

---

## Current Assumptions Document

**Valid through:** Until multi-domain support is needed

**Requirements met:**
- ✅ Single domain (localhost for dev, same domain for production)
- ✅ All modules accessible via same protocol
- ✅ No authentication needed for module loading
- ✅ All modules on HTTP (no HTTPS needed for v1)

**When to revisit:**
- [ ] Need to deploy modules on different domains
- [ ] Need HTTPS support for production
- [ ] Need authentication for module loading
- [ ] Need to support multi-region deployments
- [ ] Need dynamic service discovery

---

## Code Impact Analysis

**If multi-domain implemented:**
- `PluginRegistryService`: +20-30 lines (URL construction logic)
- `ModuleLoaderService`: No changes (already generic)
- `ModuleDashboardComponent`: No changes
- `registry.json`: Structure change, no new endpoints needed

**If authentication implemented:**
- New HTTP interceptor: ~50-80 lines
- `PluginRegistryService`: No changes
- All other services: No changes

**If environment-specific registries:**
- `PluginRegistryService`: +30-50 lines (environment detection)
- Other services: No changes
- Operations: Multiple registry files to maintain

---

## Conclusion

Current implementation is **clean and flexible enough** for single-domain deployments. When multi-domain support is needed, implement Phase 1 (Multi-Domain) first as it enables all other enhancements.

The registry-driven architecture makes these enhancements straightforward - just data structure changes with minimal code impact.
