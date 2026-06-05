USE gestion_clinica;

CREATE TABLE IF NOT EXISTS profesionales (
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
  tipo_personal          ENUM('Salud', 'Administracion') NOT NULL,
  area_trabajo           VARCHAR(100) NOT NULL,
  especialidad           VARCHAR(100) NOT NULL DEFAULT 'No aplica',
  estado                 ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_ingreso_sistema  DATE NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  UNIQUE KEY uq_profesionales_rut (rut),
  KEY ix_profesionales_apellidos (apellido_paterno, apellido_materno),
  KEY ix_profesionales_tipo (tipo_personal)
) ENGINE = InnoDB;

INSERT IGNORE INTO profesionales (
  rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
  estado_civil, genero, direccion, comuna, movil, correo, profesion,
  tipo_personal, area_trabajo, especialidad, estado
)
VALUES
  ('16.142.118-8', 'Daniela Andrea', 'Soto', 'Morales', '1988-04-12', 'Casado/a', 'Femenino', 'Av. Apoquindo 3200', 'Las Condes', '+56 9 7123 4567', 'daniela.soto@saludcentral.cl', 'Medica cirujana', 'Salud', 'Atencion ambulatoria', 'Medicina general', 'Activo'),
  ('13.315.947-7', 'Rodrigo Esteban', 'Mella', 'Castro', '1982-09-23', 'Soltero/a', 'Masculino', 'Los Alerces 518', 'Providencia', '+56 9 6654 2231', 'rodrigo.mella@saludcentral.cl', 'Kinesiologo', 'Salud', 'Rehabilitacion', 'Kinesiologia respiratoria', 'Activo'),
  ('17.895.630-1', 'Paula Francisca', 'Vera', 'Munoz', '1993-01-08', 'Soltero/a', 'Femenino', 'Santa Isabel 1140', 'Santiago', '+56 9 8432 1098', 'paula.vera@saludcentral.cl', 'Ingeniera comercial', 'Administracion', 'Finanzas', 'No aplica', 'Activo');
