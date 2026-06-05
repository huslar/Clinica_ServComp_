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
    throw new Error(detail.message || "No fue posible completar la solicitud periodontal");
  }
  return response.json();
}

export const periodontogramService = {
  get: (patientId) => request(`/periodontogramas/${patientId}`),
  save: (patientId, payload) => request(`/periodontogramas/${patientId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
};
