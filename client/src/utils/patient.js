export const emptyPatient = {
  rut: "",
  nombres: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  fechaNacimiento: "",
  estadoCivil: "",
  genero: "",
  direccion: "",
  comuna: "",
  movil: "",
  correo: "",
  profesion: "",
  estado: "Activo",
};

export function formatRut(value) {
  const clean = value.replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  return `${Number(body).toLocaleString("es-CL")}-${verifier}`;
}

export function isValidRut(rut) {
  const clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const expected = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const calculated = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return calculated === expected;
}

export function validatePatient(patient) {
  const errors = {};
  if (!isValidRut(patient.rut)) errors.rut = "Ingresa un RUT valido";
  if (!patient.nombres.trim()) errors.nombres = "Ingresa al menos un nombre";
  if (!patient.apellidoPaterno.trim()) errors.apellidoPaterno = "Campo obligatorio";
  if (!patient.apellidoMaterno.trim()) errors.apellidoMaterno = "Campo obligatorio";
  if (!patient.fechaNacimiento) errors.fechaNacimiento = "Selecciona una fecha";
  if (!patient.estadoCivil) errors.estadoCivil = "Selecciona una opcion";
  if (!patient.genero) errors.genero = "Selecciona una opcion";
  if (!patient.direccion.trim()) errors.direccion = "Campo obligatorio";
  if (!patient.comuna.trim()) errors.comuna = "Campo obligatorio";
  if (!/^\+?[\d\s-]{8,}$/.test(patient.movil)) errors.movil = "Ingresa un movil valido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.correo)) errors.correo = "Ingresa un correo valido";
  if (!patient.profesion.trim()) errors.profesion = "Campo obligatorio";
  return errors;
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function initials(patient) {
  return `${patient.nombres[0] || ""}${patient.apellidoPaterno[0] || ""}`.toUpperCase();
}
