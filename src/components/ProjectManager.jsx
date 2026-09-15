import { useState } from 'react';
import { X, Save, Trash2, FolderOpen } from 'lucide-react';
import { loadProjects, saveProject, deleteProject } from '../utils/storage';
import './ProjectManager.css';

function ProjectManager({ currentData, onLoad, onClose }) {
  const [projects, setProjects] = useState(loadProjects());
  const [projectName, setProjectName] = useState('');

  const handleSave = () => {
    if (!projectName.trim()) return;
    const updated = saveProject({
      name: projectName.trim(),
      data: currentData,
    });
    setProjects(updated);
    setProjectName('');
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this project?')) {
      const updated = deleteProject(id);
      setProjects(updated);
    }
  };

  const handleLoad = (project) => {
    onLoad(project.data);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Project Manager</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Save current project */}
          <div className="save-section">
            <h4>Save Current Configuration</h4>
            <div className="save-row">
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button className="btn-primary" onClick={handleSave} disabled={!projectName.trim()}>
                <Save size={16} />
                Save
              </button>
            </div>
          </div>

          {/* Saved projects */}
          <div className="projects-list">
            <h4>Saved Projects ({projects.length})</h4>
            {projects.length === 0 ? (
              <p className="empty-state">No saved projects yet. Save your current configuration above.</p>
            ) : (
              <div className="project-items">
                {projects.map(project => (
                  <div key={project.id} className="project-item">
                    <div className="project-info">
                      <span className="project-name">{project.name}</span>
                      <span className="project-date">
                        {new Date(project.updatedAt).toLocaleDateString()} {new Date(project.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="project-actions">
                      <button className="btn-icon" onClick={() => handleLoad(project)} title="Load project">
                        <FolderOpen size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(project.id)} title="Delete project">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectManager;
