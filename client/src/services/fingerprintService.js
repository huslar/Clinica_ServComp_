const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const READER_URL = import.meta.env.VITE_FINGERPRINT_READER_URL || "http://127.0.0.1:52181";

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.message || "No fue posible completar la solicitud");
  }
  return response.json();
}

export const fingerprintService = {
  list: () => request(`${API_URL}/huellas-profesionales`),
  enroll: (professionalId, fingerprint) => request(`${API_URL}/huellas-profesionales/${professionalId}`, {
    method: "POST",
    body: JSON.stringify(fingerprint),
  }),
};

export const fingerprintReaderService = {
  health: () => request(`${READER_URL}/health`),
  status: () => request(`${READER_URL}/capture/status`),
  capture: () => request(`${READER_URL}/capture`, {
    method: "POST",
    body: JSON.stringify({ samples: 4, format: "DPFP_PROPRIETARY" }),
  }),
};
