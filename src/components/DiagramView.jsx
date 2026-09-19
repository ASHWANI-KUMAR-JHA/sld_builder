import SLDDiagram from './SLDDiagram';
import './DiagramView.css';

function DiagramView({ formData, derivedValues, unlocked, onSecretTap }) {
  return (
    <div className="diagram-view">
      <div className="diagram-header">
        <h3>Single Line Diagram</h3>
        <p className="diagram-subtitle">
          {formData.modules} × {formData.wattPerModule}W {formData.moduleBrand} | {derivedValues.totalKWP} KWP | {formData.phase} Phase
        </p>
      </div>
      <div className="diagram-canvas" id="sld-diagram">
        <SLDDiagram formData={formData} derivedValues={derivedValues} unlocked={unlocked} onSecretTap={onSecretTap} />
      </div>
    </div>
  );
}

export default DiagramView;
