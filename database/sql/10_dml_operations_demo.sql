-- Avenza database operations demonstration
-- Run the entire script against a demo/test copy of avenza_db.
-- It requires the incident-reporting columns from 09_incident_reporting_migration.sql.
-- The sample INSERT, UPDATE, and DELETE are rolled back at the end.

USE avenza_db;

START TRANSACTION;

-- Pick existing related rows so the demo respects the foreign keys.
SET @demo_reporter_id := (
    SELECT user_id
    FROM users
    WHERE is_active = 1
    ORDER BY user_id
    LIMIT 1
);

SET @demo_segment_id := (
    SELECT segment_id
    FROM road_segments
    ORDER BY segment_id
    LIMIT 1
);

-- INSERT: add a clearly labeled temporary incident report.
INSERT INTO incidents
    (segment_id, reported_by, verified_by, incident_type, severity,
     description, occurred_at, reported_at, source_observation_id)
VALUES
    (@demo_segment_id, @demo_reporter_id, NULL, 'OTHER', 'LOW',
     'DEMO ONLY: temporary report used to demonstrate database operations.',
     CURRENT_TIMESTAMP - INTERVAL 1 HOUR, CURRENT_TIMESTAMP, NULL);

SET @demo_incident_id := LAST_INSERT_ID();

SELECT @demo_incident_id AS inserted_demo_incident_id;

-- SELECT + JOIN: retrieve the inserted incident with its road and reporter.
SELECT i.incident_id,
       s.road_name,
       i.incident_type,
       i.severity,
       i.description,
       u.name AS reported_by,
       i.occurred_at,
       i.reported_at
FROM incidents AS i
JOIN road_segments AS s ON s.segment_id = i.segment_id
LEFT JOIN users AS u ON u.user_id = i.reported_by
WHERE i.incident_id = @demo_incident_id;

-- UPDATE: change the temporary report's intensity and description.
UPDATE incidents
SET severity = 'MEDIUM',
    description = 'DEMO ONLY: updated temporary report; this change will be rolled back.'
WHERE incident_id = @demo_incident_id;

-- SELECT: verify the updated values before removing the temporary row.
SELECT incident_id, severity, description
FROM incidents
WHERE incident_id = @demo_incident_id;

-- DELETE: remove the temporary report inside the transaction.
DELETE FROM incidents
WHERE incident_id = @demo_incident_id;

SELECT ROW_COUNT() AS rows_deleted_inside_demo_transaction;

-- GROUP BY + HAVING + ORDER BY + aggregates: summarize incident counts.
SELECT incident_type,
       severity,
       COUNT(*) AS incident_count,
       COUNT(DISTINCT segment_id) AS affected_segments
FROM incidents
GROUP BY incident_type, severity
HAVING COUNT(*) >= 2
ORDER BY incident_count DESC, incident_type, severity;

-- Subquery + JOIN + GROUP BY + HAVING: find segments with more incidents
-- than the average incident count among segments that have reports.
SELECT s.segment_id,
       s.road_name,
       COUNT(i.incident_id) AS incident_count
FROM road_segments AS s
JOIN incidents AS i ON i.segment_id = s.segment_id
GROUP BY s.segment_id, s.road_name
HAVING COUNT(i.incident_id) > (
    SELECT AVG(segment_counts.incident_count)
    FROM (
        SELECT segment_id, COUNT(*) AS incident_count
        FROM incidents
        GROUP BY segment_id
    ) AS segment_counts
)
ORDER BY incident_count DESC, s.road_name
LIMIT 10;

-- Undo the demonstration INSERT, UPDATE, and DELETE so the database is unchanged.
ROLLBACK;

-- Confirm the temporary incident is no longer present (expected result: 0).
SELECT COUNT(*) AS demo_rows_remaining
FROM incidents
WHERE incident_id = @demo_incident_id;
