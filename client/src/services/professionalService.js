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

export const professionalService = {
  list: () => request("/profesionales"),
  findByRut: (rut) => request(`/profesionales/rut/${encodeURIComponent(rut)}`),
  create: (professional) => request("/profesionales", { method: "POST", body: JSON.stringify(professional) }),
  update: (id, professional) => request(`/profesionales/${id}`, { method: "PUT", body: JSON.stringify(professional) }),
  remove: (id) => request(`/profesionales/${id}`, { method: "DELETE" }),
};
