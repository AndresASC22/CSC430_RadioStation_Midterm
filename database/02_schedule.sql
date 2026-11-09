-- Run against radio_station_db as a MySQL account with CREATE privileges.
-- This does not modify users or sessions.
CREATE TABLE IF NOT EXISTS radio_shows (
  show_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  host VARCHAR(120) NOT NULL,
  genre VARCHAR(120) NOT NULL DEFAULT '',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

-- day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday.
-- Broadcasts are station-local times and must start and end on the same day.
CREATE TABLE IF NOT EXISTS broadcast_slots (
  slot_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  show_id INT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT fk_broadcast_show FOREIGN KEY (show_id)
    REFERENCES radio_shows(show_id) ON DELETE CASCADE,
  CONSTRAINT chk_broadcast_day CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT chk_broadcast_time CHECK (start_time < end_time),
  UNIQUE KEY uq_show_slot (show_id, day_of_week, start_time),
  INDEX idx_broadcast_day_time (day_of_week, start_time, end_time)
) ENGINE=InnoDB;

-- After running this as root, grant the existing radio_app the necessary rights:
-- GRANT SELECT, INSERT, UPDATE, DELETE ON radio_station_db.radio_shows TO 'radio_app'@'127.0.0.1';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON radio_station_db.broadcast_slots TO 'radio_app'@'127.0.0.1';
