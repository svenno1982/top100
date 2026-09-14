import "dotenv/config";
import Database from "better-sqlite3";
import pg from "pg";

const { Client } = pg;

const sqlitePath =
  process.env.SQLITE_DATABASE_PATH ?? "data/chart.db";

const postgresUrl =
  process.env.POSTGRES_DATABASE_URL;

if (!postgresUrl) {
  throw new Error(
    "POSTGRES_DATABASE_URL is not configured",
  );
}

const tableDefinitions = [
  {
    name: "Album",
    columns: [
      "id",
      "position",
      "title",
      "artist",
      "releaseYear",
      "artworkUrl",
      "artworkSource",
      "musicBrainzId",
      "createdAt",
      "updatedAt",
    ],
  },
  {
    name: "Film",
    columns: [
      "id",
      "position",
      "title",
      "director",
      "releaseYear",
      "posterUrl",
      "tmdbId",
      "createdAt",
      "updatedAt",
    ],
  },
  {
    name: "Song",
    columns: [
      "id",
      "position",
      "title",
      "artist",
      "releaseYear",
      "artworkUrl",
      "appleTrackId",
      "trackUrl",
      "previewUrl",
      "createdAt",
      "updatedAt",
    ],
  },
];

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function normalizeValue(column, value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    column === "createdAt" ||
    column === "updatedAt"
  ) {
    if (typeof value === "number") {
      return new Date(value).toISOString();
    }

    return value;
  }

  return value;
}

async function getPostgresCount(client, tableName) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(
      tableName,
    )}`,
  );

  return result.rows[0].count;
}

async function copyTable(
  sqlite,
  postgres,
  definition,
) {
  const { name, columns } = definition;

  const rows = sqlite
    .prepare(
      `SELECT ${columns
        .map(quoteIdentifier)
        .join(", ")}
       FROM ${quoteIdentifier(name)}
       ORDER BY "id" ASC`,
    )
    .all();

  const quotedColumns = columns
    .map(quoteIdentifier)
    .join(", ");

  const placeholders = columns
    .map((_, index) => `$${index + 1}`)
    .join(", ");

  const insertStatement =
    `INSERT INTO ${quoteIdentifier(name)} ` +
    `(${quotedColumns}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = columns.map((column) =>
      normalizeValue(column, row[column]),
    );

    await postgres.query(insertStatement, values);
  }

  await postgres.query(
    `SELECT setval(
       pg_get_serial_sequence(
         '${quoteIdentifier(name)}',
         'id'
       ),
       COALESCE(MAX("id"), 1),
       MAX("id") IS NOT NULL
     )
     FROM ${quoteIdentifier(name)}`,
  );

  return rows.length;
}

const sqlite = new Database(sqlitePath, {
  readonly: true,
});

const integrity = sqlite.pragma(
  "integrity_check",
  { simple: true },
);

if (integrity !== "ok") {
  sqlite.close();

  throw new Error(
    `SQLite integrity check failed: ${integrity}`,
  );
}

const postgres = new Client({
  connectionString: postgresUrl,
});

try {
  await postgres.connect();

  const existingCounts = {};

  for (const definition of tableDefinitions) {
    existingCounts[definition.name] =
      await getPostgresCount(
        postgres,
        definition.name,
      );
  }

  const existingTotal = Object.values(
    existingCounts,
  ).reduce((total, count) => total + count, 0);

  if (existingTotal !== 0) {
    throw new Error(
      `PostgreSQL is not empty: ${JSON.stringify(
        existingCounts,
      )}`,
    );
  }

  await postgres.query("BEGIN");

  const copiedCounts = {};

  for (const definition of tableDefinitions) {
    copiedCounts[definition.name] =
      await copyTable(
        sqlite,
        postgres,
        definition,
      );
  }

  await postgres.query("COMMIT");

  const verifiedCounts = {};

  for (const definition of tableDefinitions) {
    verifiedCounts[definition.name] =
      await getPostgresCount(
        postgres,
        definition.name,
      );
  }

  console.log("Copied:", copiedCounts);
  console.log("Verified:", verifiedCounts);
  console.log("Migration completed successfully");
} catch (error) {
  try {
    await postgres.query("ROLLBACK");
  } catch {
    // No active transaction to roll back.
  }

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
} finally {
  sqlite.close();
  await postgres.end();
}