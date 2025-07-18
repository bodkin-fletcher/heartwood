/**
 * Custom ESLint formatter for Heartwood project
 * Adds project identification to lint results
 * Uses CommonJS format for ESLint compatibility
 */

module.exports = function(results, _context) {
  const projectName = process.env.PROJECT_NAME || 'Heartwood';
  const projectScope = process.env.PROJECT_SCOPE || 'whole project';
  
  // If there are no results or all results are clean
  if (!results || results.length === 0 || results.every(result => result.messages.length === 0)) {
    const timestamp = new Date().toLocaleTimeString();
    return `✓ Clean - ${projectName} (lint of ${projectScope}) (${timestamp})`;
  }
  
  // If there are linting issues, format them with project context
  let output = `\n🔍 ${projectName} (${projectScope}) - Linting Issues:\n`;
  
  results.forEach(result => {
    if (result.messages.length > 0) {
      output += `\n${result.filePath}\n`;
      result.messages.forEach(message => {
        const severity = message.severity === 2 ? 'error' : 'warning';
        output += `  ${message.line}:${message.column}  ${severity}  ${message.message}`;
        if (message.ruleId) {
          output += `  ${message.ruleId}`;
        }
        output += '\n';
      });
    }
  });
  
  // Add summary
  const errorCount = results.reduce((acc, result) => acc + result.errorCount, 0);
  const warningCount = results.reduce((acc, result) => acc + result.warningCount, 0);
  
  if (errorCount > 0 || warningCount > 0) {
    output += `\n✗ ${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''} - ${projectName}\n`;
  }
  
  return output;
};
