import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
const administratorEmail =
  process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

if (!administratorEmail) {
  throw new Error(
    "AUTH_BOOTSTRAP_ADMIN_EMAIL is not configured",
  );
}

const client = new Client({
  connectionString: databaseUrl,
});

const chartTables = [
  "Album",
  "Film",
  "Song",
];

let transactionStarted = false;

try {
  await client.connect();
  await client.query("BEGIN");
  transactionStarted = true;

  const userResult = await client.query(
    `
      SELECT
        "id",
        "username",
        "role",
        "status"
      FROM "users"
      WHERE LOWER("email") = $1
    `,
    [administratorEmail],
  );

  if (userResult.rowCount !== 1) {
    throw new Error(
      `Expected one administrator account, found ${
        userResult.rowCount ?? 0
      }`,
    );
  }

  const user = userResult.rows[0];

  if (
    user.role !== "ADMIN" ||
    user.status !== "APPROVED"
  ) {
    throw new Error(
      "The target user is not an approved administrator",
    );
  }

  const assignedCounts = {};

  for (const table of chartTables) {
    const conflictingOwners = await client.query(
      `
        SELECT COUNT(*)::integer AS "count"
        FROM "${table}"
        WHERE "ownerId" IS NOT NULL
          AND "ownerId" <> $1
      `,
      [user.id],
    );

    if (conflictingOwners.rows[0].count !== 0) {
      throw new Error(
        `${table} contains records owned by another user`,
      );
    }

    const updateResult = await client.query(
      `
        UPDATE "${table}"
        SET "ownerId" = $1
        WHERE "ownerId" IS NULL
      `,
      [user.id],
    );

    assignedCounts[table] =
      updateResult.rowCount ?? 0;
  }

  const verificationResult = await client.query(
    `
      SELECT
        (
          SELECT COUNT(*)::integer
          FROM "Album"
          WHERE "ownerId" = $1
        ) AS "albums",
        (
          SELECT COUNT(*)::integer
          FROM "Film"
          WHERE "ownerId" = $1
        ) AS "films",
        (
          SELECT COUNT(*)::integer
          FROM "Song"
          WHERE "ownerId" = $1
        ) AS "songs",
        (
          SELECT COUNT(*)::integer
          FROM "Album"
          WHERE "ownerId" IS NULL
        ) AS "unownedAlbums",
        (
          SELECT COUNT(*)::integer
          FROM "Film"
          WHERE "ownerId" IS NULL
        ) AS "unownedFilms",
        (
          SELECT COUNT(*)::integer
          FROM "Song"
          WHERE "ownerId" IS NULL
        ) AS "unownedSongs"
    `,
    [user.id],
  );

  const verification = verificationResult.rows[0];

  if (
    verification.unownedAlbums !== 0 ||
    verification.unownedFilms !== 0 ||
    verification.unownedSongs !== 0
  ) {
    throw new Error(
      "Some chart entries remain without an owner",
    );
  }

  await client.query("COMMIT");
  transactionStarted = false;

  console.log("Assigned existing charts:", {
    username: user.username,
    newlyAssigned: assignedCounts,
    totals: {
      Album: verification.albums,
      Film: verification.films,
      Song: verification.songs,
    },
  });
} catch (error) {
  if (transactionStarted) {
    await client.query("ROLLBACK");
  }

  console.error(
    error instanceof Error
      ? error.message
      : "Unable to assign existing charts",
  );

  process.exitCode = 1;
} finally {
  await client.end();
}