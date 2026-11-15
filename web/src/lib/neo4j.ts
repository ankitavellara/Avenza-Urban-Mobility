import neo4j, { type Driver } from "neo4j-driver";

const globalForNeo4j = globalThis as typeof globalThis & {
  avenzaNeo4jDriver?: Driver;
};

export function getNeo4jDriver() {
  if (globalForNeo4j.avenzaNeo4jDriver) {
    return globalForNeo4j.avenzaNeo4jDriver;
  }

  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error(
      "Neo4j is not configured. Set NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD."
    );
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  globalForNeo4j.avenzaNeo4jDriver = driver;
  return driver;
}

export function getNeo4jDatabase() {
  return process.env.NEO4J_DATABASE || "neo4j";
}
