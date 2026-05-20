module.exports = function safeName(input) {
  return String(input || 'server')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 50) || 'server';
};
