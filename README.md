# Avenza Urban Mobility

Avenza is a Next.js web app for exploring Bengaluru walking routes. It combines MySQL records with a Neo4j road graph to compare paths by reported incidents, accessibility, lighting, and distance.

> **Demo data:** The included route, incident, stop, and coordinate data is generated demonstration data. It is not an official survey and must not be used as real-world safety or navigation advice.

## What the app does

- Search between two localities and view ranked saved paths.
- Inspect the Neo4j graph around a locality, including road segments and their route, stop, and incident relationships.
- View a suggested path on the map and open walking directions in Google Maps. Google Maps may choose a different route.
- Submit incident reports with an intensity, description, road segment, and occurrence time.
- Manage incident records according to the signed-in user's role.

MySQL stores the source records. Neo4j is synchronized from MySQL when the graph page loads and is used for relationship traversal and path search.

## Requirements

- Node.js and npm
- MySQL 8.x
- Neo4j Desktop or a reachable Neo4j DBMS

## Set up the databases

1. Create a MySQL database named `avenza_db`.
2. For a fresh demo database only, run `database/sql/01_schema_ddl.sql`, then run `database/sql/avenza_bengaluru_all_locality_pairs_seed.sql` once.
   - The schema export contains `DROP TABLE` statements. The replacement seed script truncates data. Do not run either against a database whose data you need to keep.
   - If you have an older Avenza schema, apply `database/sql/09_incident_reporting_migration.sql` once to add incident reporters and descriptions. A fresh schema from `01_schema_ddl.sql` already includes those fields, so do not apply the migration again after creating that schema.
3. In Neo4j Desktop, start a DBMS and create/select a database named `avenza-maps`.

## Configure and run the web app

Create `web/.env.local` with your local database connection values:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=avenza_db

NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
NEO4J_DATABASE=avenza-maps

SESSION_SECRET=replace-with-a-random-secret-at-least-32-bytes-long
```

Then use Command Prompt or a terminal:

```cmd
cd /d C:\Projects\Avenza\web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in. Keep the terminal running while you use the app. The graph page needs Neo4j to be running; MySQL supplies the underlying records and locality choices.

For the included seed data, the demo password is `password`. Example accounts are `aarav.menon01@example.com` (USER) and `arjun.rao11@example.com` (ADMIN). These shared demo credentials are for local presentation use only.

## SQL demonstration

Open `database/sql/10_dml_operations_demo.sql` in MySQL Workbench and run the **whole script**. It demonstrates `INSERT`, `SELECT`, `UPDATE`, `DELETE`, joins, grouping, `HAVING`, ordering, aggregates, and a subquery. It runs the sample changes inside a transaction and rolls them back; the final check should show `0` demo rows remaining.

## More documentation

- [Database design, SQL objects, and verification notes](database/README.md)
- [Neo4j graph model and setup](database/neo4j/README.md)
