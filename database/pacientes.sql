CREATE DATABASE IF NOT EXISTS gestion_clinica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gestion_clinica;

CREATE TABLE IF NOT EXISTS pacientes (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rut                    VARCHAR(12) NOT NULL,
  nombres                VARCHAR(100) NOT NULL,
  apellido_paterno       VARCHAR(60) NOT NULL,
  apellido_materno       VARCHAR(60) NOT NULL,
  fecha_nacimiento       DATE NOT NULL,
  estado_civil           VARCHAR(30) NOT NULL,
  genero                 VARCHAR(30) NOT NULL,
  direccion              VARCHAR(180) NOT NULL,
  comuna                 VARCHAR(80) NOT NULL,
  movil                  VARCHAR(20) NOT NULL,
  correo                 VARCHAR(150) NOT NULL,
  profesion              VARCHAR(100) NOT NULL,
  estado                 ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_ingreso_sistema  DATE NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  UNIQUE KEY uq_pacientes_rut (rut),
  KEY ix_pacientes_apellidos (apellido_paterno, apellido_materno)
) ENGINE = InnoDB;

ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE NULL AFTER apellido_materno,
  ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(30) NULL AFTER fecha_nacimiento,
  ADD COLUMN IF NOT EXISTS genero VARCHAR(30) NULL AFTER estado_civil;

UPDATE pacientes
SET fecha_nacimiento = COALESCE(fecha_nacimiento, '1990-01-01'),
    estado_civil = COALESCE(estado_civil, 'Prefiere no informar'),
    genero = COALESCE(genero, 'Prefiere no informar');

ALTER TABLE pacientes
  MODIFY fecha_nacimiento DATE NOT NULL,
  MODIFY estado_civil VARCHAR(30) NOT NULL,
  MODIFY genero VARCHAR(30) NOT NULL;

INSERT IGNORE INTO pacientes (
  rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
  estado_civil, genero, direccion, comuna, movil, correo, profesion, estado
)
VALUES
  ('12.345.678-5', 'Camila Fernanda', 'Rojas', 'Silva', '1991-08-14', 'Soltero/a', 'Femenino', 'Av. Providencia 1845, Depto. 402', 'Providencia', '+56 9 8765 4321', 'camila.rojas@email.cl', 'Arquitecta', 'Activo'),
  ('9.876.543-3', 'Ignacio Andres', 'Munoz', 'Vega', '1984-03-22', 'Casado/a', 'Masculino', 'Los Olmos 726', 'La Reina', '+56 9 6234 1880', 'ignacio.munoz@email.cl', 'Profesor', 'Activo'),
  ('18.765.432-7', 'Valentina Paz', 'Contreras', 'Fuentes', '1996-11-05', 'Soltero/a', 'Femenino', 'Camino El Alba 9810', 'Las Condes', '+56 9 5512 9320', 'valentina.contreras@email.cl', 'Ingeniera comercial', 'Activo');
