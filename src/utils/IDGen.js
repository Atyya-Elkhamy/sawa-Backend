// utils/IDGen.js

/**
 *
 */
async function generateUniqueUserId() {
  const { customAlphabet } = await import('nanoid');

  // Custom alphabet limited to digits only
  const nanoid = customAlphabet('0123456789', 8);
  let userId = '';

  while (true) {
    userId = nanoid(); // Generate a 10-digit ID using nanoid

    // Check if any character repeats more than three times in a row
    if (!/(.)\1\1/.test(userId)) {
      break; // Valid ID, exit the loop
    }
  }

  return userId;
}

module.exports = { generateUniqueUserId };
