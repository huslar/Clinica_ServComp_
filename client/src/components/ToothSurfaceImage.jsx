import React from "react";

const surfaceLabels = {
  Vestibular: "Vestibular",
  LingualPalatina: "Lingual / palatina",
  Mesial: "Mesial",
  Distal: "Distal",
  OclusalIncisal: "Oclusal / incisal",
  Completa: "Pieza completa",
};

const surfacePaths = {
  Vestibular: "M18 12h48L56 28H28Z",
  LingualPalatina: "M28 56h28l10 16H18Z",
  Mesial: "M12 18l16 10v28L12 66Z",
  Distal: "M72 18L56 28v28l16 10Z",
  OclusalIncisal: "M28 28h28v28H28Z",
};

const findingClasses = {
  Caries: "caries",
  Restauracion: "restauracion",
  Ausente: "ausente",
  Fractura: "fractura",
  Corona: "corona",
  Endodoncia: "endodoncia",
  Implante: "implante",
  Sellante: "sellante",
  Observacion: "observacion",
};

function findingsForSurface(findings, surface) {
  return findings.filter((finding) => finding.surface === surface || finding.surface === "Completa");
}

export function ToothSurfaceImage({ findings = [], compact = false, label }) {
  const completeFindings = findings.filter((finding) => finding.surface === "Completa");
  const description = findings.length
    ? findings.map((finding) => `${finding.findingType} en ${surfaceLabels[finding.surface] || finding.surface}`).join(", ")
    : "Sin hallazgos";

  return (
    <svg className={`tooth-surface-image ${compact ? "compact" : ""}`} viewBox="0 0 84 84" role="img" aria-label={`${label || "Pieza dental"}: ${description}`}>
      <rect className={`tooth-surface-complete ${completeFindings.length ? "marked" : ""}`} x="7" y="7" width="70" height="70" rx="19" />
      {Object.entries(surfacePaths).map(([surface, path]) => {
        const surfaceFindings = findingsForSurface(findings, surface);
        const lastFinding = surfaceFindings.at(-1);
        const findingClass = lastFinding ? findingClasses[lastFinding.findingType] || "observacion" : "";
        return <path key={surface} className={`tooth-surface-zone ${findingClass}`} d={path}><title>{surfaceLabels[surface]}: {surfaceFindings.length ? surfaceFindings.map((finding) => finding.findingType).join(", ") : "sin hallazgos"}</title></path>;
      })}
      {Object.entries(surfacePaths).map(([surface]) => {
        const count = findingsForSurface(findings, surface).length;
        if (count < 2 || compact) return null;
        const positions = { Vestibular: [42, 20], LingualPalatina: [42, 66], Mesial: [18, 44], Distal: [66, 44], OclusalIncisal: [42, 44] };
        const [x, y] = positions[surface];
        return <g className="tooth-surface-count" key={`${surface}-count`}><circle cx={x} cy={y} r="8" /><text x={x} y={y + 3}>{count}</text></g>;
      })}
    </svg>
  );
}

export const toothSurfaceLegend = Object.entries(surfaceLabels).filter(([surface]) => surface !== "Completa");
