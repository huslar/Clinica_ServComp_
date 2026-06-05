# Mantenedor de Pacientes

Aplicacion web para administrar pacientes con una interfaz React y una API preparada para MySQL.

## Requisitos

- Node.js 18 o superior
- MySQL local o XAMPP

## Base de datos

1. Inicia MySQL desde el panel de XAMPP.
2. Ejecuta `database/pacientes.sql` en MySQL.
3. Copia `server/.env.example` como `server/.env`.
4. Ajusta las credenciales de conexion si tu instalacion no utiliza los valores predeterminados de XAMPP.

## Ejecucion

En una terminal:

```powershell
cd server
npm install
npm run dev
```

En otra terminal:

```powershell
cd client
npm install
npm run dev
```

La interfaz estara disponible en `http://localhost:5173`.

Si la API aun no esta configurada, el frontend utiliza datos de demostracion y permite recorrer la experiencia completa de forma local.

## Enrolamiento de huella

1. Ejecuta `database/huellas_profesionales.sql` despues de crear la tabla de profesionales.
2. Genera una clave base64 de 32 bytes y configurala como `FINGERPRINT_ENCRYPTION_KEY` en `server/.env`.
3. Instala en el equipo de enrolamiento el SDK o runtime de DigitalPersona compatible con el lector U.are.U 4500 y un agente local que exponga el contrato HTTP indicado abajo.

El navegador no accede directamente al dispositivo USB. El agente local escucha por defecto en `http://127.0.0.1:52181`; puede cambiarse con `VITE_FINGERPRINT_READER_URL`.

```text
GET  /health
200  { "device": "U.are.U 4500" }

POST /capture
body { "samples": 4, "format": "DPFP_PROPRIETARY" }
200  { "template": "<base64>", "format": "DPFP_PROPRIETARY", "quality": 0..100, "device": "U.are.U 4500" }
```

La API central recibe una plantilla biometrica, no una imagen. La almacena cifrada con AES-256-GCM, exige una calidad minima de captura y coteja cada enrolamiento contra las huellas existentes para rechazar una huella que ya pertenezca a otro profesional.

### Agente local para Windows

Este repositorio incluye `fingerprint-agent`, un puente local para el SDK DigitalPersona One Touch instalado en el equipo:

```powershell
cd fingerprint-agent
dotnet run --configuration Release
```

El agente escucha exclusivamente en `127.0.0.1:52181` y solo acepta solicitudes del frontend local. La captura y su progreso se muestran dentro de la interfaz web; el agente no abre ventanas auxiliares.
Se compila para `win-x86` porque el SDK DigitalPersona One Touch instalado utiliza componentes nativos clasicos de 32 bits.

## Odontograma de hallazgos

El modulo permite seleccionar un paciente activo, registrar hallazgos por pieza y superficie,
consultar su historial y anular hallazgos mediante eventos compensatorios. Los eventos clinicos
son inmutables: la base de datos rechaza actualizaciones y eliminaciones directas.

Antes de iniciar la API, aplica la migracion:

```powershell
mysql -u root -p gestion_clinica < database/odontograma_hallazgos.sql
```

La interfaz envia el actor clinico mediante `X-Clinical-Actor`. Para desarrollo se utiliza
`Administrador`, configurable con `VITE_CLINICAL_ACTOR`. Antes de desplegar en produccion,
reemplaza este valor por la identidad obtenida de una sesion autenticada y autorizada por el
servidor; un encabezado enviado por el navegador no constituye por si solo una frontera de
autenticacion.

La navegacion incluye tambien `Odontograma de hallazgos (2)`, una variante visual que reutiliza
el mismo registro clinico auditado y representa graficamente los hallazgos vigentes sobre cada
pieza dental.

`Odontograma de hallazgos (3)` agrega una representacion oclusal por superficies para ubicar los
hallazgos vigentes en vestibular, lingual o palatina, mesial, distal y oclusal o incisal.

`Odontograma de hallazgos (4)` consolida ambas representaciones y permite alternar entre vista
combinada, superficies e imagen clinica interactiva sin duplicar el registro auditado.
