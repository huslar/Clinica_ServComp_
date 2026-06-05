import { Router } from "express";
import {
  createProfessionalFingerprint,
  findProfessionalFingerprintStatus,
  listFingerprintComparisonCandidates,
  listProfessionalFingerprintStatuses,
} from "./fingerprintRepository.js";

const router = Router();
const allowedFormats = new Set(["ANSI_378", "ISO_19794_2", "DPFP_PROPRIETARY"]);
const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

function validate(fingerprint) {
  if (!fingerprint || typeof fingerprint !== "object") return "La captura de huella no es valida";
  if (!allowedFormats.has(fingerprint.format)) return "El formato de plantilla biometrica no es valido";
  if (!Number.isInteger(fingerprint.quality) || fingerprint.quality < 0 || fingerprint.quality > 100) return "La calidad de la captura no es valida";
  if (fingerprint.quality < 60) return "La calidad de la captura es insuficiente. Limpia el lector e intenta nuevamente";
  if (!String(fingerprint.device || "").trim() || String(fingerprint.device).length > 100) return "El lector de huella no es valido";
  if (!base64Pattern.test(fingerprint.template || "")) return "La plantilla biometrica no es valida";
  if (!base64Pattern.test(fingerprint.verificationFeatures || "")) return "Los datos de verificacion biometrica no son validos";
  const templateSize = Buffer.byteLength(fingerprint.template, "base64");
  if (templateSize < 32 || templateSize > 16384) return "El tamano de la plantilla biometrica no es valido";
  const featureSize = Buffer.byteLength(fingerprint.verificationFeatures, "base64");
  if (featureSize < 32 || featureSize > 16384) return "El tamano de los datos de verificacion no es valido";
  return null;
}

async function findFingerprintOwner(verificationFeatures) {
  const candidates = await listFingerprintComparisonCandidates();
  if (!candidates.length) return null;
  const readerUrl = process.env.FINGERPRINT_READER_URL || "http://127.0.0.1:52181";
  const readerResponse = await fetch(`${readerUrl}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ featureSet: verificationFeatures, candidates }),
  });
  if (!readerResponse.ok) throw new Error("No fue posible cotejar la huella con los enrolamientos existentes");
  const result = await readerResponse.json();
  return result.professionalId ? findProfessionalFingerprintStatus(result.professionalId) : null;
}

router.get("/", async (_request, response, next) => {
  try {
    return response.json(await listProfessionalFingerprintStatuses());
  } catch (error) {
    return next(error);
  }
});

router.post("/:professionalId", async (request, response, next) => {
  try {
    const professionalId = Number(request.params.professionalId);
    if (!Number.isInteger(professionalId) || professionalId < 1) return response.status(400).json({ message: "Profesional no valido" });
    const professional = await findProfessionalFingerprintStatus(professionalId);
    if (!professional) return response.status(404).json({ message: "Profesional no encontrado" });
    if (professional.enrolled) return response.status(409).json({ message: "El profesional ya posee una huella enrolada" });
    const message = validate(request.body);
    if (message) return response.status(400).json({ message });
    const fingerprintOwner = await findFingerprintOwner(request.body.verificationFeatures);
    if (fingerprintOwner) {
      return response.status(409).json({
        message: `La huella ya pertenece a ${fingerprintOwner.nombres} ${fingerprintOwner.apellidoPaterno} ${fingerprintOwner.apellidoMaterno}`,
      });
    }
    return response.status(201).json(await createProfessionalFingerprint(professionalId, request.body));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(409).json({ message: "La huella ya se encuentra enrolada en el sistema" });
    }
    return next(error);
  }
});

export default router;
