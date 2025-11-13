// server/services/conversationStore.js
// Simple in-memory conversation store. Keeps last N messages per conversationId.
// Replace this with Redis or another persistent store for production.

const MAX_PER_CONVERSATION = 8; // last N messages (pairs). Keep small for safety.

const store = new Map(); // conversationId -> array of { role, content }

function get(id) {
  if (!id) return [];
  return store.get(id) ?? [];
}

function push(id, message) {
  if (!id) return;
  let arr = store.get(id);
  if (!arr) {
    arr = [];
    store.set(id, arr);
  }
  arr.push(message);
  // Keep only last MAX_PER_CONVERSATION messages
  if (arr.length > MAX_PER_CONVERSATION) {
    arr.splice(0, arr.length - MAX_PER_CONVERSATION);
  }
}

function clear(id) {
  if (!id) return;
  store.delete(id);
}

module.exports = { conversationStore: { get, push, clear } };
