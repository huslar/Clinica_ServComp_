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

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

export const appointmentService = {
  list: (filters = {}) => request(`/reservas${queryString(filters)}`),
  availability: (filters) => request(`/reservas/disponibilidad${queryString(filters)}`),
  create: (appointment) => request("/reservas", { method: "POST", body: JSON.stringify(appointment) }),
  update: (id, appointment) => request(`/reservas/${id}`, { method: "PUT", body: JSON.stringify(appointment) }),
  cancel: (id) => request(`/reservas/${id}/cancelar`, { method: "PATCH" }),
};
