-- Avenza: database health and schema checks
-- Run against avenza_db after loading or updating the project data.
-- These statements inspect data and schema; they do not change table rows.

USE avenza_db;

-- 1. Count rows in each of the 12 base tables. Use this to confirm that
--    tables contain the expected data after setup or a seed import.
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'routes', COUNT(*) FROM routes
UNION ALL SELECT 'road_segments', COUNT(*) FROM road_segments
UNION ALL SELECT 'route_segments', COUNT(*) FROM route_segments
UNION ALL SELECT 'segment_infrastructure', COUNT(*) FROM segment_infrastructure
UNION ALL SELECT 'pedestrian_density', COUNT(*) FROM pedestrian_density
UNION ALL SELECT 'transport_stops', COUNT(*) FROM transport_stops
UNION ALL SELECT 'segment_transport', COUNT(*) FROM segment_transport
UNION ALL SELECT 'incidents', COUNT(*) FROM incidents
UNION ALL SELECT 'infrastructure_audit', COUNT(*) FROM infrastructure_audit
UNION ALL SELECT 'localities', COUNT(*) FROM localities
UNION ALL SELECT 'locality_road_segments', COUNT(*) FROM locality_road_segments;

-- 2. Find road segments with no infrastructure rating. Ideally this
--    returns no rows; any result identifies a segment to complete.
SELECT s.segment_id, s.road_name
FROM road_segments AS s
LEFT JOIN segment_infrastructure AS si
    ON s.segment_id = si.segment_id
WHERE si.segment_id IS NULL;

-- 3. Find saved routes that have no road segments assigned. Ideally this
--    returns no rows for routes intended to be searchable.
SELECT r.route_id, r.route_name
FROM routes AS r
LEFT JOIN route_segments AS rs
    ON r.route_id = rs.route_id
WHERE rs.route_id IS NULL;

-- 4. Find incidents whose report time is earlier than the occurrence time.
--    The result should be empty because reported_at must not precede occurred_at.
SELECT incident_id, occurred_at, reported_at
FROM incidents
WHERE reported_at < occurred_at;

-- 5. Preview the calculated route summary view.
SELECT * FROM route_summary;

-- 6. Inspect indexes on incidents, including keys used for lookup and filtering.
SHOW INDEX FROM incidents;

-- 7. List the triggers defined in the current database.
SHOW TRIGGERS;

-- 8. Display the stored procedure definition for incident lookup.
SHOW CREATE PROCEDURE GetIncidentsBySegment;

-- 9. Display the SQL definition of the route summary view.
SHOW CREATE VIEW route_summary;
