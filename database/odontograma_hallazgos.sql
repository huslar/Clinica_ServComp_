USE gestion_clinica;

CREATE TABLE IF NOT EXISTS odontograma_eventos (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  paciente_id           INT UNSIGNED NOT NULL,
  tipo_evento           ENUM('ODONTOGRAMA_CONSULTADO', 'PIEZA_SELECCIONADA', 'HALLAZGO_REGISTRADO', 'HALLAZGO_ANULADO') NOT NULL,
  denticion              ENUM('Permanente', 'Temporal') NULL,
  pieza                  CHAR(2) NULL,
  superficie             ENUM('Completa', 'Vestibular', 'LingualPalatina', 'Mesial', 'Distal', 'OclusalIncisal') NULL,
  tipo_hallazgo          ENUM('Caries', 'Restauracion', 'Ausente', 'Fractura', 'Corona', 'Endodoncia', 'Implante', 'Sellante', 'Observacion') NULL,
  severidad              ENUM('Leve', 'Moderada', 'Severa') NULL,
  nota_clinica           VARCHAR(500) NULL,
  evento_referencia_id   BIGINT UNSIGNED NULL,
  actor                  VARCHAR(120) NOT NULL,
  origen                 VARCHAR(64) NOT NULL,
  solicitud_id           CHAR(36) NOT NULL,
  fecha_evento           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY ix_odontograma_paciente_fecha (paciente_id, fecha_evento),
  KEY ix_odontograma_referencia (evento_referencia_id),
  CONSTRAINT fk_odontograma_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id),
  CONSTRAINT fk_odontograma_evento_referencia
    FOREIGN KEY (evento_referencia_id) REFERENCES odontograma_eventos (id)
) ENGINE = InnoDB;

DROP TRIGGER IF EXISTS tr_odontograma_eventos_no_update;
DROP TRIGGER IF EXISTS tr_odontograma_eventos_no_delete;

DELIMITER $$
CREATE TRIGGER tr_odontograma_eventos_no_update
BEFORE UPDATE ON odontograma_eventos
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los eventos clinicos del odontograma son inmutables';
END$$

CREATE TRIGGER tr_odontograma_eventos_no_delete
BEFORE DELETE ON odontograma_eventos
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los eventos clinicos del odontograma no se pueden eliminar';
END$$
DELIMITER ;
