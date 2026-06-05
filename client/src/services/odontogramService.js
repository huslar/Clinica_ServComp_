const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const CLINICAL_ACTOR = import.meta.env.VITE_CLINICAL_ACTOR || "Administrador";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Clinical-Actor": CLINICAL_ACTOR,
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.message || "No fue posible completar la solicitud clinica");
  }
  if (response.status === 204) return null;
  return response.json();
}

export const odontogramService = {
  get: (patientId) => request(`/odontogramas/${patientId}`),
  recordInteraction: (patientId, dentition, tooth) => request(`/odontogramas/${patientId}/interacciones`, {
    method: "POST",
    body: JSON.stringify({ action: "PIEZA_SELECCIONADA", dentition, tooth }),
  }),
  createFinding: (patientId, finding) => request(`/odontogramas/${patientId}/hallazgos`, {
    method: "POST",
    body: JSON.stringify(finding),
  }),
  annulFinding: (patientId, findingId, reason) => request(`/odontogramas/${patientId}/hallazgos/${findingId}/anular`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }),
};
