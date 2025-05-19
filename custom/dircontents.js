
import fs from 'fs';
import path from 'path';

function normalizePath(p) {
  return p.replace(new RegExp(`\\${path.sep}`, 'g'), '/');
}

export default async function(input) {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object with a "dirpath" property');
  }
  const dirpath = input.dirpath;
  if (typeof dirpath !== 'string') {
    throw new Error('"dirpath" must be a string');
  }
  const absolutePath = path.resolve(dirpath);
  try {
    const dirents = await fs.promises.readdir(absolutePath, { withFileTypes: true });
    const files = dirents.filter(dirent => dirent.isFile());
    const fileDetails = await Promise.all(files.map(async (dirent) => {
      const filename = dirent.name;
      const fullPath = path.join(absolutePath, filename);
      const stats = await fs.promises.stat(fullPath);
      const extension = path.extname(filename);
      const normalizedDirectory = normalizePath(absolutePath);
      const normalizedFullPath = normalizePath(fullPath);
      return {
        existing: {
          filename,
          extension,
          directory: normalizedDirectory,
          fullpath: normalizedFullPath,
          filesize: stats.size
        }
      };
    }));
    return { contents: fileDetails };
  } catch (error) {
    throw new Error(`Failed to read directory "${normalizePath(absolutePath)}": ${error.message}`);
  }
}