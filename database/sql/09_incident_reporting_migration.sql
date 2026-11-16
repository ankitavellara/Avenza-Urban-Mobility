-- Extend incidents so signed-in users can submit attributed reports with details.
-- Apply once to an existing avenza_db before using the updated incident API.

ALTER TABLE incidents
  MODIFY verified_by int DEFAULT NULL,
  ADD COLUMN reported_by int DEFAULT NULL AFTER segment_id,
  ADD COLUMN description text DEFAULT NULL AFTER severity,
  ADD KEY fk_incident_reporter (reported_by),
  ADD CONSTRAINT fk_incident_reporter
    FOREIGN KEY (reported_by) REFERENCES users (user_id) ON DELETE RESTRICT;
