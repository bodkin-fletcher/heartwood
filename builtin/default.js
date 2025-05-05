/**
 * Example default script.
 * @param {object} input - The input data.
 * @returns {object} The processed data.
 */
export default function(input) {
  // For demonstration, just return a message with the input
  return { message: 'Processed ' + JSON.stringify(input) };
};