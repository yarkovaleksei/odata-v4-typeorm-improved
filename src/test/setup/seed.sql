INSERT INTO "user" ("id", "name", "email") VALUES
  (1, 'Alice', 'alice@example.com'),
  (2, 'Bob', 'bob@example.com');

INSERT INTO "post" ("id", "title", "content", "userId") VALUES
  (1, 'Alice first post', 'First post of Alice', 1),
  (2, 'Alice second post', 'Second post of Alice', 1),
  (3, 'Bob first post', 'First post of Bob', 2),
  (4, 'Bob second post', 'Second post of Bob', 2);