import { useState } from 'react';
import { COMPONENT_TEMPLATES, COMPONENT_CATEGORIES } from './componentTemplates';

function ComponentSidebar() {
  const [searchTerm, setSearchTerm] = useState('');
  // Track collapsed categories — all open by default
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const components = Object.entries(COMPONENT_TEMPLATES);

  const filteredComponents = components.filter(([, template]) =>
    template.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = {};
  filteredComponents.forEach(([key, template]) => {
    const cat = template.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ key, ...template });
  });

  const handleDragStart = (e, componentType) => {
    e.dataTransfer.setData('componentType', componentType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const toggleCategory = (catKey) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  return (
    <aside className="builder-sidebar">
      <div className="sidebar-header">
        <h3>Components</h3>
        <input
          type="text"
          className="sidebar-search"
          placeholder="Search..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="sidebar-components">
        {Object.entries(COMPONENT_CATEGORIES).map(([catKey, catInfo]) => {
          const items = grouped[catKey];
          if (!items || items.length === 0) return null;
          // Open by default unless explicitly collapsed (and not searching)
          const isExpanded = searchTerm ? true : !collapsedCategories[catKey];

          return (
            <div key={catKey} className="sidebar-category">
              <button
                className="category-header"
                onClick={() => toggleCategory(catKey)}
              >
                <span
                  className="category-dot"
                  style={{ background: catInfo.color }}
                />
                <span className="category-label">{catInfo.label}</span>
                <span className="category-count">{items.length}</span>
                <span className={`category-arrow ${isExpanded ? 'expanded' : ''}`}>▸</span>
              </button>
              {isExpanded && (
                <div className="category-items">
                  {items.map(item => (
                    <div
                      key={item.key}
                      className="component-item"
                      draggable
                      onDragStart={e => handleDragStart(e, item.key)}
                      title={`Drag to canvas: ${item.label}`}
                    >
                      <span className="component-icon">{item.icon}</span>
                      <span className="component-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="sidebar-footer">
        <p>Drag items to canvas</p>
      </div>
    </aside>
  );
}

export default ComponentSidebar;
