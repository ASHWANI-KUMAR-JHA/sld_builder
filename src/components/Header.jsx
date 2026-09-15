import { FolderOpen, Download, RotateCcw, PenTool, LogOut, FileSpreadsheet, Combine, ClipboardList, FileCheck, Users, Package, ClipboardCheck } from 'lucide-react';
import Logo from './Logo';
import './Header.css';

function Header({ companyName, onProjectsClick, onExportClick, onResetClick, onBuilderClick, onFlashReportClick, onMergePdfClick, onWorkOrdersClick, onInstallationsClick, onJcrClick, onPdiClick, onUsersClick, onLogoutClick }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <div className="logo">
            <Logo size="medium" />
            <div className="logo-text">
              <h1>{companyName || 'Solar Plan Generator'}</h1>
              <span className="subtitle">Single Line Diagram Generator</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="header-btn primary" onClick={onBuilderClick} title="Interactive SLD Builder">
            <PenTool size={18} />
            <span>Builder</span>
          </button>
          <button className="header-btn primary" onClick={onFlashReportClick} title="Flash Test Report">
            <FileSpreadsheet size={18} />
            <span>Flash Report</span>
          </button>
          <button className="header-btn primary" onClick={onMergePdfClick} title="Merge PDF Files">
            <Combine size={18} />
            <span>Merge PDF</span>
          </button>
          <button className="header-btn primary" onClick={onWorkOrdersClick} title="Work Orders">
            <Package size={18} />
            <span>Work Orders</span>
          </button>
          <button className="header-btn primary" onClick={onInstallationsClick} title="Installation Register">
            <ClipboardList size={18} />
            <span>Installations</span>
          </button>
          <button className="header-btn primary" onClick={onJcrClick} title="Joint Commissioning Report (JCR)">
            <FileCheck size={18} />
            <span>JCR</span>
          </button>
          <button className="header-btn primary" onClick={onPdiClick} title="Pre-Dispatch Inspection (PDI)">
            <ClipboardCheck size={18} />
            <span>PDI</span>
          </button>
          <button className="header-btn primary" onClick={onUsersClick} title="Manage Users">
            <Users size={18} />
            <span>Users</span>
          </button>
          <button className="header-btn" onClick={onProjectsClick} title="Manage Projects">
            <FolderOpen size={18} />
            <span>Projects</span>
          </button>
          <button className="header-btn" onClick={onExportClick} title="Export Diagram">
            <Download size={18} />
            <span>Export</span>
          </button>
          <button className="header-btn danger" onClick={onResetClick} title="Reset to Defaults">
            <RotateCcw size={18} />
            <span>Reset</span>
          </button>
          <button className="header-btn logout" onClick={onLogoutClick} title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
