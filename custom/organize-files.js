import { posix as pathPosix } from 'path';

export default async function(input) {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object');
  }
  if (input.type !== 'dir_contents') {
    throw new Error('Input must have type "dir_contents"');
  }
  if (!Array.isArray(input.files)) {
    throw new Error('Input must have a "files" array');
  }

  const updatedFiles = input.files.map(file => {
    if (file.existing && file.existing.modified) {
      const modifiedDate = new Date(file.existing.modified);
      if (isNaN(modifiedDate.getTime())) {
        return file;
      }
      const year = modifiedDate.getFullYear();
      const month = String(modifiedDate.getMonth() + 1).padStart(2, '0');
      const day = String(modifiedDate.getDate()).padStart(2, '0');
      const dateFolder = `${year}-${month}-${day}`;
      const newDirectory = pathPosix.join(file.existing.directory, dateFolder);
      const newFullPath = pathPosix.join(newDirectory, file.existing.filename);
      const relativePath = pathPosix.join(dateFolder, file.existing.filename);
      return {
        ...file,
        proposed: {
          fullpath: newFullPath,
          relativepath: relativePath
        }
      };
    } else {
      return file;
    }
  });

  const output = {
    ...input,
    type: 'file_change_manifest',
    files: updatedFiles
  };

  return output;
}