-- Avenza: examples of useful questions to ask the MySQL database
-- Run these queries against avenza_db in MySQL Workbench.
-- The SELECT statements and stored procedure call below only read data;
-- they do not insert, update, or delete any rows.

USE avenza_db;

-- 1. Show the saved routes with their segment counts, total distances,
--    and estimated walking times. This reads the route_summary view.
SELECT * FROM route_summary;

-- 2. Show each road segment and its lighting, road-condition, and
--    accessibility ratings. LEFT JOIN keeps segments that have no ratings.
SELECT s.segment_id, s.road_name,
       si.lighting_level,
       si.road_condition_level,
       si.accessibility_level
FROM road_segments AS s
LEFT JOIN segment_infrastructure AS si
    ON s.segment_id = si.segment_id
ORDER BY s.segment_id;

-- 3. Count incidents for each type and intensity (stored in severity).
--    GROUP BY makes one result row per type/intensity combination.
SELECT incident_type, severity, COUNT(*) AS incident_count
FROM incidents
GROUP BY incident_type, severity
ORDER BY incident_type, severity;

-- 4. Find segments that do not yet have an infrastructure rating.
--    No returned rows means every segment has a matching rating record.
SELECT s.segment_id, s.road_name
FROM road_segments AS s
LEFT JOIN segment_infrastructure AS si
    ON s.segment_id = si.segment_id
WHERE si.segment_id IS NULL;

-- 5. Demonstrate the relational joins between segments, segment_transport,
--    and transport stops. These are the distances stored in segment_transport;
--    the replacement demo seed contains generated pairings, not verified
--    geographic nearest-stop measurements.
SELECT s.segment_id, s.road_name,
       ts.stop_name, ts.transport_type,
       st.distance_m
FROM segment_transport AS st
JOIN road_segments AS s
    ON st.segment_id = s.segment_id
JOIN transport_stops AS ts
    ON st.stop_id = ts.stop_id
ORDER BY s.segment_id, st.distance_m;

-- 6. Call the stored procedure to list incidents for segment 1,
--    newest occurrence first. Change 1 to inspect a different segment.
CALL GetIncidentsBySegment(1);
