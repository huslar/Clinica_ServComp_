import React from "react";

const findingLabels = {
  Caries: "Caries",
  Restauracion: "Restauracion",
  Ausente: "Pieza ausente",
  Fractura: "Fractura",
  Corona: "Corona",
  Endodoncia: "Endodoncia",
  Implante: "Implante",
  Sellante: "Sellante",
  Observacion: "Observacion",
};

function FindingOverlay({ type }) {
  if (type === "Caries") return <circle className="tooth-image-caries" cx="42" cy="36" r="9" />;
  if (type === "Restauracion") return <path className="tooth-image-restoration" d="M28 29h28v18H28z" />;
  if (type === "Ausente") return <path className="tooth-image-absent" d="M20 17l44 58m0-58L20 75" />;
  if (type === "Fractura") return <path className="tooth-image-fracture" d="M44 20l-10 18 12 8-11 20" />;
  if (type === "Corona") return <path className="tooth-image-crown" d="M22 26h40l-4 20H26zM23 21h38" />;
  if (type === "Endodoncia") return <path className="tooth-image-root" d="M38 36l-4 43m12-43l4 43" />;
  if (type === "Implante") return <path className="tooth-image-implant" d="M31 27h22m-19 7h16m-16 7h16m-14 7h12m-10 7h8m-4-28v35" />;
  if (type === "Sellante") return <path className="tooth-image-sealant" d="M27 32c8-8 22-8 30 0" />;
  return <path className="tooth-image-observation" d="M66 18a8 8 0 1 1-16 0 8 8 0 0 1 16 0m-8-4v5m0 4h.01" />;
}

export function ToothFindingImage({ findings = [], compact = false, label }) {
  const findingTypes = [...new Set(findings.map((finding) => finding.findingType))];
  const description = findingTypes.length ? findingTypes.map((type) => findingLabels[type] || type).join(", ") : "Sin hallazgos";

  return (
    <svg className={`tooth-finding-image ${compact ? "compact" : ""}`} viewBox="0 0 84 92" role="img" aria-label={`${label || "Pieza dental"}: ${description}`}>
      <path className="tooth-image-base" d="M20 11c-9 5-10 18-5 30 5 11 8 17 9 31 1 11 5 16 10 9 4-6 3-24 8-24s4 18 8 24c5 7 9 2 10-9 1-14 4-20 9-31 5-12 4-25-5-30-8-4-13 3-22 3s-14-7-22-3Z" />
      <path className="tooth-image-detail" d="M24 26c9 5 27 5 36 0M42 17v35" />
      {findingTypes.map((type) => <FindingOverlay key={type} type={type} />)}
    </svg>
  );
}

export const toothFindingLegend = Object.entries(findingLabels);
