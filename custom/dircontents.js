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
    const timestamp = new Date().toISOString(); // Capture timestamp after reading directory

    // Separate files and directories
    const files = dirents.filter(dirent => dirent.isFile());
    const directories = dirents.filter(dirent => dirent.isDirectory());

    // Process files
    const fileDetails = await Promise.all(files.map(async (dirent) => {
      const filename = dirent.name;
      const fullPath = path.join(absolutePath, filename);
      const extension = path.extname(filename);
      const normalizedDirectory = normalizePath(absolutePath);
      const normalizedFullPath = normalizePath(fullPath);
      const existing = {
        filename,
        extension,
        directory: normalizedDirectory,
        fullpath: normalizedFullPath
      };
      try {
        const stats = await fs.promises.stat(fullPath);
        existing.filesize = stats.size;
        existing.modified = stats.mtime.toISOString(); // Date modified
      } catch (error) {
        return {
          existing,
          error: `Could not retrieve file stats: ${error.message}`
        };
      }
      return { existing };
    }));

    // Process directories
    const dirDetails = directories.map((dirent) => {
      const dirname = dirent.name;
      const fullPath = path.join(absolutePath, dirname);
      const normalizedDirectory = normalizePath(absolutePath);
      const normalizedFullPath = normalizePath(fullPath);
      const existing = {
        dirname,
        directory: normalizedDirectory,
        fullpath: normalizedFullPath,
        isSymlink: dirent.isSymbolicLink() // Check if it's a symbolic link
      };
      return { existing };
    });

    return {
      type: "dir_contents", // Add type attribute
      timestamp: timestamp, // Add timestamp attribute
      files: fileDetails, // List of file details
      dirs: dirDetails // List of directory details
    };
  } catch (error) {
    throw new Error(`Failed to read directory "${normalizePath(absolutePath)}": ${error.message}`);
  }
}