import React from 'react';
import ReactDOM from 'react-dom/client';
import './ProceduresModule.css';

/**
 * Procedures Module - Main React Component
 * Exposed via Module Federation at ./ProceduresModule
 */
function ProceduresModule({ patientId }) {
  return (
    <div className="procedures-module">
      <div className="procedures-container">
        <h1>Procedures Module</h1>
        <div className="welcome-banner">
          <p className="greeting">Hello from the Procedure Module! 👋</p>
          <p className="subtitle">This is a React micro-frontend loaded via Module Federation</p>
        </div>

        <div className="info-section">
          <h2>Module Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Framework:</label>
              <span>React 18</span>
            </div>
            <div className="info-item">
              <label>Loading Method:</label>
              <span>Module Federation</span>
            </div>
            <div className="info-item">
              <label>Patient ID:</label>
              <span>{patientId || 'Not selected'}</span>
            </div>
            <div className="info-item">
              <label>Port:</label>
              <span>4207</span>
            </div>
          </div>
        </div>

        <div className="status-message">
          <p>✅ Module loaded successfully!</p>
          <p>Later phases will add:</p>
          <ul>
            <li>Procedures list for the selected patient</li>
            <li>Procedure details and history</li>
            <li>Integration with BFF-Procedures API</li>
            <li>Real-time patient context synchronization</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Render function for mounting the Procedures module into a DOM container
 * This function is called by the Angular shell to render the React module
 * @param {HTMLElement} container - The DOM element to render into
 * @param {string} patientId - The patient ID to pass to the component
 */
function renderProceduresModule(container, patientId) {
  console.log('[ProceduresModule] Rendering into container:', container);
  console.log('[ProceduresModule] Patient ID:', patientId);
  console.log('[ProceduresModule] React version:', React.version);
  console.log('[ProceduresModule] ReactDOM version:', ReactDOM.version);
  
  const root = ReactDOM.createRoot(container);
  root.render(
    React.createElement(React.StrictMode, null,
      React.createElement(ProceduresModule, { patientId })
    )
  );
  
  console.log('[ProceduresModule] Component rendered successfully');
  return root;
}

/**
 * Module exports object for Module Federation
 * When loaded via Module Federation, this entire object is exposed
 */
export default {
  default: ProceduresModule,
  ProceduresModule,
  renderProceduresModule
};
