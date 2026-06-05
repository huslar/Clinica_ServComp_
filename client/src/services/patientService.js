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
  if (response.status === 204) return null;
  return response.json();
}

export const patientService = {
  list: () => request("/pacientes"),
  findByRut: (rut) => request(`/pacientes/rut/${encodeURIComponent(rut)}`),
  create: (patient) => request("/pacientes", { method: "POST", body: JSON.stringify(patient) }),
  update: (id, patient) => request(`/pacientes/${id}`, { method: "PUT", body: JSON.stringify(patient) }),
  remove: (id) => request(`/pacientes/${id}`, { method: "DELETE" }),
};
