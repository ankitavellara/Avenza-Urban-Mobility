# Avenza Urban Mobility

Avenza is a database-driven web application for exploring and assessing pedestrian routes across Bengaluru. It combines relational database records with graph-based path traversal to help users compare walking routes using factors such as reported safety incidents, pedestrian accessibility, street lighting, public transport availability, and distance.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Prerequisites](#5-prerequisites)
6. [Project Structure](#6-project-structure)
7. [Database Setup](#7-database-setup)
   - [MySQL Setup](#71-mysql-setup)
   - [Neo4j Setup](#72-neo4j-setup)
8. [Environment Configuration](#8-environment-configuration)
9. [Application Installation and Execution](#9-application-installation-and-execution)
10. [Demo Accounts](#10-demo-accounts)
11. [SQL Demonstration](#11-sql-demonstration)
12. [Troubleshooting](#12-troubleshooting)
13. [Important Notes](#13-important-notes)

---

## 1. Project Overview

Avenza evaluates pedestrian routes by combining information stored in a relational database with graph-based relationships between roads, routes, and public transport stops.

The application uses:

- **MySQL** as the primary relational database and source of truth.
- **Neo4j** for graph representation, relationship traversal, and route search.
- **Next.js** for the web application and backend API functionality.

MySQL stores the structured project records. Neo4j receives synchronized data from MySQL when the graph page loads and is used to perform graph-based path searches.

## 2. Features

### 2.1 Route Search
- Search for walking routes between two localities.
- Retrieve ranked candidate paths.
- Compare routes using incident counts, accessibility, lighting, and distance.
- Display suggested paths on an interactive map.
- Open walking directions through Google Maps. Google Maps may calculate a different route.

### 2.2 Graph-Based Route Exploration
- Represent routes, road segments, and transport stops as graph nodes.
- Explore relationships between connected road segments.
- Identify nearby public transport stops.
- Use Neo4j traversal to identify candidate paths between locations.

### 2.3 Incident Reporting
- Submit incident reports associated with road segments.
- Specify incident intensity, description, and occurrence time.
- View existing incident records.
- Support role-based management of incident records.

### 2.4 User Authentication
- Sign in using registered application accounts.
- Maintain authenticated sessions.
- Apply role-based access restrictions for administrative operations.

---

## 3. Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Relational database | MySQL 8.x |
| Graph database | Neo4j |
| Database connectivity | mysql2 |
| Graph connectivity | Neo4j JavaScript driver |
| Map integration | Leaflet / OpenStreetMap |
| External directions | Google Maps |

---

## 4. System Architecture

Avenza uses a hybrid database architecture.

### MySQL – Relational Database

MySQL is the primary source of truth. It stores structured records such as:

- Users
- Routes
- Road segments
- Route-to-segment mappings
- Infrastructure assessments
- Pedestrian density observations
- Transport stops
- Segment-to-transport mappings
- Incident reports
- Infrastructure audit records

### Neo4j – Graph Database

Neo4j represents the connectivity between routes, road segments, and transport stops.

The graph uses the following node types:

- `Route`
- `RoadSegment`
- `TransportStop`

Relationships include:

- `HAS_SEGMENT` – connects routes to their road segments.
- `CONNECTS_TO` – represents connectivity between consecutive road segments.
- `NEAR_STOP` – connects road segments to nearby transport stops.

Neo4j is synchronized from MySQL when the graph page loads. MySQL remains the authoritative source of the underlying records.

### Application Flow

1. The user interacts with the Next.js application.
2. The application retrieves structured records from MySQL.
3. When graph functionality is required, the application synchronizes the relevant MySQL data with Neo4j.
4. Neo4j performs graph traversal and candidate path searches.
5. The application presents the resulting information through the dashboard, graph interface, and map.

---

## 5. Prerequisites

Install the following software before running the project.

### 5.1 Node.js and npm

Install a compatible Node.js LTS release.

Verify installation:

```bash
node --version
npm --version
```

### 5.2 MySQL Community Server

Required version: MySQL 8.x.

Recommended tools:

- MySQL Community Server
- MySQL Workbench

Verify that the MySQL server is running and that you can connect using your configured MySQL credentials.

### 5.3 Neo4j

Install Neo4j Desktop or configure access to a reachable Neo4j DBMS.

You will need:

- A running Neo4j DBMS.
- A database named `avenza-maps`, or an equivalent configured database.
- A valid Neo4j username and password.
- A Bolt connection endpoint.

Default local Bolt address:

```text
bolt://localhost:7687
```

---



## 6. Database Setup

Avenza requires both MySQL and Neo4j to be configured.

### 6.1 MySQL Setup

#### Step 1: Start MySQL Server

Open MySQL Workbench and connect to your local MySQL instance.

Alternatively, on Windows, verify that the MySQL service is running:

```cmd
sc query MySQL80
```

#### Step 2: Create the database

Open a new SQL query tab and execute:

```sql
CREATE DATABASE avenza_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;
```

Select the database:

```sql
USE avenza_db;
```

#### Step 3: Create the database schema

Open the following file in MySQL Workbench:

```text
database/sql/01_schema_ddl.sql
```

Execute the schema script to create the required tables, views, triggers, and other database objects.

**WARNING:** The schema export contains `DROP TABLE` statements. Only execute it when creating a fresh database or when you have a verified backup. Do not run it against a database containing records you need to preserve.

#### Step 4: Import demonstration data

For a fresh demonstration database, execute the corresponding seed-data script:

```text
database/sql/avenza_bengaluru_all_locality_pairs_seed.sql
```

Run the seed script only once on a fresh schema. It replaces existing data and should not be executed against a database whose records must be retained.

If you are using a populated database backup supplied by another developer, restore that backup instead of running the schema and seed scripts again.

#### Step 5: Apply the incident reporting migration if required

For an older Avenza database schema, execute:

```text
database/sql/09_incident_reporting_migration.sql
```

This migration adds incident reporter and description fields.

A fresh database created using `01_schema_ddl.sql` already includes these fields. Do not apply the migration again to a fresh schema.

#### Step 6: Verify the database

Execute:

```sql
USE avenza_db;

SHOW TABLES;
```

Verify that the expected tables and database objects have been created.

You can also execute the verification script:

```text
database/sql/08_verification_queries.sql
```

Review the results to check whether the database structure and records are available.

### 6.2 Neo4j Setup

#### Step 1: Install and start Neo4j

Open Neo4j Desktop.

Create a local DBMS and start it.

#### Step 2: Create or select the database

Use the database name:

```text
avenza-maps
```

#### Step 3: Configure credentials

Record the following connection details:

- URI: `bolt://localhost:7687`
- Username: `neo4j`
- Password: Your configured Neo4j password
- Database: `avenza-maps`

#### Step 4: Verify the connection

Ensure that the Neo4j DBMS is running and that the Bolt endpoint is accessible.

Refer to:

```text
database/neo4j/README.md
```

for the graph database setup and data model details.

---

## 7. Environment Configuration

The Next.js application requires environment variables to connect to MySQL, Neo4j, and the authentication system.

Create a file named:

```text
web/.env.local
```

Add the following configuration, replacing the example values with your own credentials:

```env
# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=avenza_db

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password
NEO4J_DATABASE=avenza-maps

# Authentication
SESSION_SECRET=replace-with-a-random-secret-at-least-32-bytes-long
```

### Generating a Session Secret

Generate a secure random value using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Copy the generated value into `SESSION_SECRET`.

### Important Environment Variable Notes

- Use the credentials configured on your own computer.
- `DB_HOST=localhost` assumes MySQL is running locally.
- `NEO4J_URI=bolt://localhost:7687` assumes Neo4j is running locally.
- Do not commit `.env.local` to GitHub.
- Never share database passwords or session secrets publicly.
- The `.env.example` file is intended as a configuration template, not a place to store real credentials.

If the database is hosted on another machine, the connection settings must be configured for that remote environment instead.

---

## 8. Application Installation and Execution

### Step 1: Clone the repository

```bash
git clone https://github.com/LogicNinja/Avenza-Urban-Mobility.git
```

Navigate into the project:

```bash
cd Avenza-Urban-Mobility
```

### Step 2: Navigate to the web application

```bash
cd web
```

### Step 3: Install dependencies

```bash
npm install
```

### Step 4: Configure environment variables

Ensure that `web/.env.local` exists and contains the correct MySQL, Neo4j, and session configuration.

### Step 5: Start the development server

```bash
npm run dev
```

### Step 6: Open the application

Visit:

[http://localhost:3000](http://localhost:3000)

Keep the terminal running while using the application.

### Database Availability

The following services must be running for the corresponding functionality:

| Functionality | Required service |
|---|---|
| Dashboard statistics | MySQL |
| User authentication | MySQL |
| Incident reporting | MySQL |
| Incident management | MySQL |
| Locality and route records | MySQL |
| Graph synchronization | MySQL and Neo4j |
| Graph-based route search | MySQL and Neo4j |

---

## 9. Demo Accounts

For the included demonstration dataset, the following accounts are available:

| Email | Role | Password |
|---|---|---|
| aarav.menon01@example.com | USER | password |
| arjun.rao11@example.com | ADMIN | password |

These credentials are intended for local academic demonstrations only.

Do not reuse these credentials in a production deployment.

---

## 10. SQL Demonstration

Avenza includes SQL demonstration and verification scripts for demonstrating database operations.

The DML demonstration script is:

```text
database/sql/10_dml_operations_demo.sql
```

Open it in MySQL Workbench and execute the complete script.

It demonstrates:

- INSERT
- SELECT
- UPDATE
- DELETE
- JOIN operations
- GROUP BY
- HAVING
- ORDER BY
- Aggregate functions
- Subqueries
- Transaction handling

The demonstration changes are executed within a transaction and rolled back at the end. The final verification should show zero demonstration rows remaining.

Additional SQL files:

| File | Description |
|---|---|
| `01_schema_ddl.sql` | Database schema creation |
| `07_dml_demo_queries.sql` | Demonstration queries |
| `08_verification_queries.sql` | Database verification queries |
| `09_incident_reporting_migration.sql` | Migration for older schemas |
| `10_dml_operations_demo.sql` | DML operations demonstration |
| `avenza_bengaluru_all_locality_pairs_seed.sql` | Demonstration dataset |

Only execute scripts appropriate to the database state. In particular, schema, migration, and seed scripts should not be blindly rerun on an existing populated database.

---

## 11. Troubleshooting

### 11.1 MySQL: Access Denied

Example:

```text
Access denied for user ''@'localhost'
```

Possible causes:

- `.env.local` is missing.
- MySQL environment variables are missing or incorrectly named.
- The configured username or password is incorrect.
- MySQL Server is not running.

Check the following:

1. Confirm that `web/.env.local` exists.
2. Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`.
3. Confirm that the MySQL service is running.
4. Restart the Next.js development server after changing environment variables.

### 11.2 MySQL Command Not Recognized

Example:

```text
'mysql' is not recognized as an internal or external command
```

This usually means that the MySQL executable directory is not included in the Windows PATH.

The default installation directory is:

```text
C:\Program Files\MySQL\MySQL Server 8.0\bin
```

Add this directory to the Windows PATH environment variable or execute MySQL using its full executable path.

### 11.3 Neo4j Connection Failure

Possible causes:

- Neo4j DBMS is stopped.
- The Bolt URI is incorrect.
- The username or password is incorrect.
- The configured database does not exist.

Verify that Neo4j is running and check the connection settings in `web/.env.local`.

### 11.4 Database Does Not Exist

Example:

```text
Unknown database 'avenza_db'
```

Create the database and import the schema and appropriate dataset using the MySQL setup instructions.

### 11.5 Environment Changes Not Applied

Next.js loads environment variables when the development server starts.

After modifying `.env.local`:

1. Stop the running server using `Ctrl + C`.
2. Restart it using `npm run dev`.

### 11.6 Graph Page Does Not Load

Check that:

- MySQL is running.
- Neo4j is running.
- The Neo4j connection details are correct.
- The configured Neo4j database exists.
- The MySQL records required for graph synchronization are available.

---

## 12. Important Notes

1. MySQL is the primary source of truth for Avenza's structured data.
2. Neo4j is used for graph representation, relationship traversal, and route search.
3. The graph is synchronized from MySQL when the graph page loads.
4. The demonstration dataset is synthetic and should not be interpreted as verified real-world information.
5. Each developer must configure their own `.env.local` file.
6. Environment files containing credentials must never be committed to the repository.
7. Database backups should be maintained before running schema changes, migrations, or replacement seed scripts.
8. A local MySQL database is independent of another developer's local database. Changes do not automatically synchronize between computers.

---

**Project:** Avenza Urban Mobility  
**Database Systems:** MySQL and Neo4j  
**Application Framework:** Next.js  
**Purpose:** Academic DBMS Mini Project
