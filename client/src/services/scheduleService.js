const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.message || "No fue posible completar la solicitud");
  }
  return response.json();
}

export const scheduleService = {
  list: (professionalId) => request(`/horarios/${professionalId}`),
  save: (professionalId, blocks) => request(`/horarios/${professionalId}`, {
    method: "PUT",
    body: JSON.stringify({ blocks }),
  }),
};

export const studentScheduleService = {
  list: (studentId) => request(`/horarios-alumnos/${studentId}`),
  save: (studentId, blocks) => request(`/horarios-alumnos/${studentId}`, {
    method: "PUT",
    body: JSON.stringify({ blocks }),
  }),
};
