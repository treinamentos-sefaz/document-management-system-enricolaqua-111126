const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { STORAGE_DIRECTORY } = require('../config/storage');

const USERS_FILE = process.env.DMS_USERS_FILE || path.join(STORAGE_DIRECTORY, 'users.json');
let writeQueue = Promise.resolve();

async function readUsers() {
  try {
    const contents = await fs.readFile(USERS_FILE, 'utf8');
    const users = JSON.parse(contents);

    if (!Array.isArray(users)) {
      throw new Error('Arquivo local de usuários inválido.');
    }

    return users;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function replaceUsers(users) {
  const directory = path.dirname(USERS_FILE);
  const temporaryFile = `${USERS_FILE}.${randomUUID()}.tmp`;

  await fs.mkdir(directory, { recursive: true, mode: 0o700 });

  try {
    await fs.writeFile(temporaryFile, JSON.stringify(users), { flag: 'wx', mode: 0o600 });
    await fs.rename(temporaryFile, USERS_FILE);
  } catch (error) {
    await fs.rm(temporaryFile, { force: true }).catch(() => {});
    throw error;
  }
}

function findByUsername(username) {
  return readUsers().then((users) => users.find((user) => user.username === username) || null);
}

function createUser(user) {
  const operation = writeQueue.then(async () => {
    const users = await readUsers();

    if (users.some((existingUser) => existingUser.username === user.username)) {
      return false;
    }

    users.push(user);
    await replaceUsers(users);
    return true;
  });

  writeQueue = operation.catch(() => {});
  return operation;
}

module.exports = {
  createUser,
  findByUsername
};