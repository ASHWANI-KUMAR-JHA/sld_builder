const STORAGE_KEY = 'solar-plan-generator';
const PROJECTS_KEY = 'solar-plan-projects';

export function loadFormData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load form data:', e);
    return null;
  }
}

export function saveFormData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save form data:', e);
  }
}

export function loadProjects() {
  try {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load projects:', e);
    return [];
  }
}

export function saveProject(project) {
  const projects = loadProjects();
  const existingIndex = projects.findIndex(p => p.id === project.id);
  if (existingIndex >= 0) {
    projects[existingIndex] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    projects.push({ ...project, id: Date.now().toString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return projects;
}

export function deleteProject(projectId) {
  const projects = loadProjects().filter(p => p.id !== projectId);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return projects;
}
