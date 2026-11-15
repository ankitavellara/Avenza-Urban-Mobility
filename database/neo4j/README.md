# Avenza Neo4j graph

Avenza keeps structured records in MySQL and projects the route network into
Neo4j when the Graph page is opened. The Next.js API performs the sync and
graph query on the server; browser code calls `/api/graph` and never receives
Neo4j credentials.

## Graph model

| Node | Key and properties | Source |
|---|---|---|
| `Route` | `id`, `name`, `origin`, `destination` | MySQL `routes` |
| `Locality` | `name` | Distinct MySQL `routes.origin` and `routes.destination` values |
| `RoadSegment` | `id`, `name`, `lengthM`, lighting/condition/accessibility ratings, incident count | MySQL `road_segments`, `segment_infrastructure`, `incidents` |
| `TransportStop` | `id`, `name`, `type`, `latitude`, `longitude` | MySQL `transport_stops` |
| `Incident` | `id`, `type`, `severity`, `occurredAt` | MySQL `incidents` |

Relationships:

- `(Route)-[:HAS_SEGMENT {sequenceNo}]->(RoadSegment)` comes from
  `route_segments` and preserves route order. Locality searches use this ordered
  relationship to retrieve segments between matching route endpoints.
- `(Locality)-[:HAS_ENDPOINT {role, routeId}]->(RoadSegment)` maps each saved
  route's origin locality to its first ordered segment and its destination
  locality to its last ordered segment. This endpoint mapping is projected from
  `routes` and `route_segments` during graph sync, so both dropdowns use the
  same unique locality list without a separately maintained list.
- `(RoadSegment)-[:CONNECTS_TO {routeId, fromSequence, toSequence}]->(RoadSegment)`
  links consecutive segments in each predefined route and preserves the
  directed sequence for graph analysis.
- `(RoadSegment)-[:NEAR_STOP {distanceM}]->(TransportStop)` comes from
  `segment_transport` and records the distance to transit.
- `(RoadSegment)-[:HAS_INCIDENT]->(Incident)` carries the individual incident
  reports so each candidate path can show the reports on its segments.

The API creates unique constraints for node IDs and refreshes the graph
projection from MySQL in one Neo4j transaction when the Graph page loads. Path
searches then query Neo4j directly without repeating the MySQL sync. They accept
locality names, match saved routes with those endpoints, and retrieve their
ordered road segments, nearby stops, and incidents. The API returns compact
graph counts and locality names instead of sending the full graph route catalog
to the browser. MySQL handles authoritative records and
integrity; Neo4j handles route and incident traversal. The ranking is a
demonstration heuristic, not a safety guarantee or turn-by-turn navigation
result. Connections follow stored route sequences; geographic continuity has
not been verified.

## Local setup

1. Download and install [Neo4j Desktop](https://neo4j.com/download/) for
   Windows. Neo4j Desktop includes a local DBMS and the Java runtime. In Desktop,
   create a local DBMS, set a password, and start it.
2. The local Bolt URI is normally `bolt://localhost:7687`.
3. Add these values to `web/.env.local` alongside the existing MySQL settings:

   ```dotenv
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=replace-with-the-password-you-set
   NEO4J_DATABASE=avenza-maps
   ```

4. Start the app with `npm run dev` from `web` and open `/dashboard/graph`. The
   first page load syncs MySQL records into Neo4j. Use **Start from**, **End at**,
   and **Search paths** to query the graph and inspect incidents on each path.

Keep the actual password in the ignored `.env.local` file. Do not commit it.
The graph page reports a connection error when Neo4j is stopped or the
environment values are missing.

## Application files

- `web/src/lib/neo4j.ts` creates the server-side Neo4j driver.
- `web/src/app/api/graph/route.ts` projects MySQL data into Neo4j.
- `web/src/app/api/graph/paths/route.ts` searches path candidates and incident
  reports in Neo4j without re-running the full sync.
- `web/src/app/dashboard/graph/page.tsx` provides the start/end path search and
  displays route incidents and nearby transit relationships.
