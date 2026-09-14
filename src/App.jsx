import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import DiagramView from './components/DiagramView';
import ResizableSplit from './components/ResizableSplit';
import ProjectManager from './components/ProjectManager';
import ExportPanel from './components/ExportPanel';
import SLDBuilder from './components/SLDBuilder/SLDBuilder';
import FlashReport from './components/FlashReport';
import JCR from './components/JCR';
import MergePDF from './components/MergePDF';
import WorkOrders from './components/WorkOrders';
import InstallationRegister from './components/InstallationRegister';
import PublicInstallationForm from './components/PublicInstallationForm';
import GeoDebug from './components/GeoDebug';
import UserManager from './components/UserManager';
import Login from './components/Login';
import { loadFormData, saveFormData } from './utils/storage';
import { DEFAULT_FORM_DATA, calculateDerivedValues } from './utils/defaults';
import { isAuthenticated, clearSession } from './utils/auth';
import './App.css';

// Public, shareable installation form. No login required so it can be sent
// to field users. Accessed via ?form=install in the URL.
const isPublicForm =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('form') === 'install';

// Optional work order name from the URL (?form=install&workorder=test). When
// present, the installation form constrains the equipment serials to that
// work order's uploaded master list.
const workOrderParam =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('workorder') || ''
    : '';

// Standalone geolocation diagnostic screen. Open with ?geo=debug in the URL.
const isGeoDebug =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('geo') === 'debug';

function App() {
  const [loggedIn, setLoggedIn] = useState(() => isAuthenticated());
  const [currentPage, setCurrentPage] = useState('generator'); // 'generator' | 'builder' | 'flashReport' | 'mergePdf'
  const [formData, setFormData] = useState(() => {
    const saved = loadFormData();
    return saved || { ...DEFAULT_FORM_DATA };
  });
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const derivedValues = calculateDerivedValues(formData);

  // Auto-save on every change
  useEffect(() => {
    saveFormData(formData);
  }, [formData]);

  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleLoadProject = useCallback((projectData) => {
    setFormData(projectData);
    setShowProjectManager(false);
  }, []);

  const handleReset = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA });
  }, []);

  const handleLogout = useCallback(() => {
    clearSession();
    setLoggedIn(false);
  }, []);

  // Geolocation inspector — no login required, purely a diagnostic view.
  if (isGeoDebug) {
    return <GeoDebug />;
  }

  // Show login page if not authenticated. The public installation form now
  // also requires login so the submitting user is identified on the form.
  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />;
  }

  // Shareable installation form — opens (after login) with the user's name on top.
  if (isPublicForm) {
    return <PublicInstallationForm onLogout={handleLogout} initialWorkOrder={workOrderParam} />;
  }

  // Show the interactive SLD builder page
  if (currentPage === 'builder') {
    return <SLDBuilder onBack={() => setCurrentPage('generator')} onLogout={handleLogout} />;
  }

  // Show the Flash Report page
  if (currentPage === 'flashReport') {
    return <FlashReport onBack={() => setCurrentPage('generator')} onLogout={handleLogout} />;
  }

  // Show the Merge PDF page
  if (currentPage === 'mergePdf') {
    return <MergePDF onBack={() => setCurrentPage('generator')} onLogout={handleLogout} />;
  }

  // Show the Work Orders page
  if (currentPage === 'workOrders') {
    return <WorkOrders onBack={() => setCurrentPage('generator')} onLogout={handleLogout} />;
  }

  // Show the JCR (Joint Commissioning Report) page
  if (currentPage === 'jcr') {
    return <JCR onBack={() => setCurrentPage('generator')} onLogout={handleLogout} />;
  }

  // Show the Installation Register page
  if (currentPage === 'installations') {
    return <InstallationRegister onBack={() => setCurrentPage('generator')} onLogout={handleLogout} />;
  }

  // Show the User Manager page
  if (currentPage === 'users') {
    return <UserManager onBack={() => setCurrentPage('generator')} onLogout={handleLogout} />;
  }

  return (
    <div className="app">
      <Header
        companyName={formData.companyName}
        onProjectsClick={() => setShowProjectManager(true)}
        onExportClick={() => setShowExport(true)}
        onResetClick={handleReset}
        onBuilderClick={() => setCurrentPage('builder')}
        onFlashReportClick={() => setCurrentPage('flashReport')}
        onMergePdfClick={() => setCurrentPage('mergePdf')}
        onWorkOrdersClick={() => setCurrentPage('workOrders')}
        onInstallationsClick={() => setCurrentPage('installations')}
        onJcrClick={() => setCurrentPage('jcr')}
        onUsersClick={() => setCurrentPage('users')}
        onLogoutClick={handleLogout}
      />

      <div className="app-body">
        <ResizableSplit
          left={
            <InputPanel
              formData={formData}
              derivedValues={derivedValues}
              onChange={handleFieldChange}
            />
          }
          right={
            <DiagramView
              formData={formData}
              derivedValues={derivedValues}
            />
          }
        />
      </div>

      {showProjectManager && (
        <ProjectManager
          currentData={formData}
          onLoad={handleLoadProject}
          onClose={() => setShowProjectManager(false)}
        />
      )}

      {showExport && (
        <ExportPanel
          formData={formData}
          derivedValues={derivedValues}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

export default App;
