import { connection } from "../sql/config.js";

async function createTableUsers() {
  await connection.query(
    'CREATE TABLE users (\
        id INTEGER PRIMARY KEY AUTOINCREMENT,\
        name TEXT NOT NULL,\
        email TEXT UNIQUE NOT NULL\
    );',
    {
      type: connection.QueryTypes.CREATE,
    },
  );
}

async function insertTableUsers() {
  await connection.query(
    "INSERT INTO users (name, email) VALUES\
    ('Alice Smith', 'alice.smith@example.com'),\
    ('Bob Johnson', 'bob.johnson@example.com'),\
    ('Carol Williams', 'carol.williams@example.com'),\
    ('David Brown', 'david.brown@example.com'),\
    ('Eve Davis', 'eve.davis@example.com'),\
    ('Frank Miller', 'frank.miller@example.com'),\
    ('Grace Wilson', 'grace.wilson@example.com'),\
    ('Hank Moore', 'hank.moore@example.com'),\
    ('Ivy Taylor', 'ivy.taylor@example.com'),\
    ('Jack Anderson', 'jack.anderson@example.com'),\
    ('Kim Harris', 'kim.harris@example.com'),\
    ('Leo Martin', 'leo.martin@example.com'),\
    ('Mia Clark', 'mia.clark@example.com'),\
    ('Noah Lewis', 'noah.lewis@example.com'),\
    ('Olivia Hall', 'olivia.hall@example.com'),\
    ('Paul Young', 'paul.young@example.com'),\
    ('Quinn King', 'quinn.king@example.com'),\
    ('Ruby Wright', 'ruby.wright@example.com'),\
    ('Sam Scott', 'sam.scott@example.com'),\
    ('Tina Green', 'tina.green@example.com');",
    {
      type: connection.QueryTypes.INSERT,
    },
  );
}

async function queryTable(query) {
  return await connection.query(query, {
    type: connection.QueryTypes.SELECT,
  });
}

export { createTableUsers, insertTableUsers, queryTable };
