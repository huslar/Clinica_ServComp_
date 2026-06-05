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

export const studentService = {
  list: () => request("/alumnos"),
  findByRut: (rut) => request(`/alumnos/rut/${encodeURIComponent(rut)}`),
  create: (student) => request("/alumnos", { method: "POST", body: JSON.stringify(student) }),
  update: (id, student) => request(`/alumnos/${id}`, { method: "PUT", body: JSON.stringify(student) }),
  remove: (id) => request(`/alumnos/${id}`, { method: "DELETE" }),
};
