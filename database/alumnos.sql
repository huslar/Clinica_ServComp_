USE gestion_clinica;

CREATE TABLE IF NOT EXISTS alumnos (
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
  carrera_especialidad   VARCHAR(120) NOT NULL,
  anio_cursa             TINYINT UNSIGNED NOT NULL,
  categoria              VARCHAR(50) NOT NULL,
  estado                 ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_ingreso_sistema  DATE NOT NULL DEFAULT (CURRENT_DATE),
  PRIMARY KEY (id),
  UNIQUE KEY uq_alumnos_rut (rut),
  KEY ix_alumnos_apellidos (apellido_paterno, apellido_materno),
  KEY ix_alumnos_carrera (carrera_especialidad)
) ENGINE = InnoDB;

INSERT IGNORE INTO alumnos (
  rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
  estado_civil, genero, direccion, comuna, movil, correo, profesion,
  carrera_especialidad, anio_cursa, categoria, estado
)
VALUES
  ('21.221.658-3', 'Catalina Isabel', 'Rios', 'Parra', '2001-06-15', 'Soltero/a', 'Femenino', 'Los Nogales 422', 'Santiago', '+56 9 4321 7788', 'catalina.rios@alumnos.cl', 'Estudiante', 'Enfermeria', 4, 'Practica profesional', 'Activo'),
  ('20.345.871-6', 'Matias Alejandro', 'Gonzalez', 'Reyes', '2000-12-03', 'Soltero/a', 'Masculino', 'Av. Grecia 2180', 'Nunoa', '+56 9 5123 8890', 'matias.gonzalez@alumnos.cl', 'Estudiante', 'Kinesiologia', 5, 'Internado', 'Activo'),
  ('22.103.487-0', 'Fernanda Paz', 'Salinas', 'Vidal', '2003-02-19', 'Soltero/a', 'Femenino', 'San Pablo 1640', 'Santiago', '+56 9 7345 6601', 'fernanda.salinas@alumnos.cl', 'Estudiante', 'Tecnico en enfermeria', 2, 'Practica curricular', 'Activo');
