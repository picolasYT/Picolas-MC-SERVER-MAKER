function parsePinggyOutput(text) {
  const m = String(text).match(/tcp:\/\/([a-zA-Z0-9.-]+:\d+)/);
  if (m) return m[1];
  const m2 = String(text).match(/([a-zA-Z0-9.-]+\.pinggy\.[a-z]+:\d+)/);
  if (m2) return m2[1];
  const m3 = String(text).match(/([a-zA-Z0-9.-]+\.a\.pinggy\.link:\d+)/);
  if (m3) return m3[1];
  return null;
}
module.exports = { parsePinggyOutput };
