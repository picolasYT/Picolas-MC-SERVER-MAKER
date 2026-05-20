const fs = require('fs');
const path = require('path');
module.exports = function ensureFolders(root) {
  ['data','public','servers','downloads','downloads/jars','downloads/plugins','src'].forEach(d => {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  });
};
