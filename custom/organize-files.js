import { posix as pathPosix } from 'path';

// Export the info object with detailed metadata about the script
export const info = {
  description:
    "Organizes files into date-based folders based on their modification times. Optionally groups files into subfolders if their modification times are within a specified contiguous time range. If 'contiguousTime' is not provided, files are organized into folders named 'YYYY-MM-DD'. If provided, files are grouped into 'YYYY-MM-DD__NN' folders based on time proximity.",
  input: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            existing: {
              type: 'object',
              properties: {
                fullpath: { type: 'string' },
                modified: { type: 'string', format: 'date-time' }
              },
              required: ['fullpath', 'modified']
            }
          }
        }
      }
    },
    required: ['files']
  },
  options: {
    contiguousTime: {
      type: 'number',
      description:
        'Maximum time difference in minutes between files to be grouped into the same subfolder.'
    }
  },
  output: {
    type: 'object',
    properties: {
      type: { type: 'string', const: 'file_change_manifest' },
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            existing: { type: 'object' },
            proposed: {
              type: 'object',
              properties: {
                fullpath: { type: 'string' },
                relativepath: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};

export default async function (input, options = {}) {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object');
  }
  if (input.type !== 'dir_contents') {
    throw new Error('Input must have type "dir_contents"');
  }
  if (!Array.isArray(input.files)) {
    throw new Error('Input must have a "files" array');
  }

  if (options.contiguousTime) {
    const contiguousTime = options.contiguousTime;
    if (typeof contiguousTime !== 'number' || contiguousTime <= 0) {
      throw new Error('contiguousTime must be a positive number');
    }

    // Filter files with valid modification dates
    const filesWithDates = input.files.filter(
      (file) =>
        file.existing &&
        file.existing.modified &&
        !isNaN(new Date(file.existing.modified).getTime())
    );

    // Group files by date
    const filesByDate = {};
    for (const file of filesWithDates) {
      const modifiedDate = new Date(file.existing.modified);
      const dateString = `${modifiedDate.getFullYear()}-${String(modifiedDate.getMonth() + 1).padStart(2, '0')}-${String(modifiedDate.getDate()).padStart(2, '0')}`;
      if (!filesByDate[dateString]) {
        filesByDate[dateString] = [];
      }
      filesByDate[dateString].push(file);
    }

    // Process each date group
    for (const date in filesByDate) {
      // Sort files by modification time within the day
      const sortedFiles = filesByDate[date].sort(
        (a, b) => new Date(a.existing.modified).getTime() - new Date(b.existing.modified).getTime()
      );

      let folderCounter = 1;
      let currentFolder = `${date}__01`;
      let lastTime = null;

      for (const file of sortedFiles) {
        const modifiedDate = new Date(file.existing.modified);
        const currentTime = modifiedDate.getTime();

        if (lastTime === null) {
          // First file of the day
          lastTime = currentTime;
        } else {
          const timeDiff = (currentTime - lastTime) / 60000; // Difference in minutes
          if (timeDiff >= contiguousTime) {
            folderCounter += 1;
            currentFolder = `${date}__${String(folderCounter).padStart(2, '0')}`;
          }
          lastTime = currentTime;
        }

        const newDirectory = pathPosix.join(file.existing.directory, currentFolder);
        const newFullPath = pathPosix.join(newDirectory, file.existing.filename);
        const relativePath = pathPosix.join(currentFolder, file.existing.filename);
        file.proposed = {
          fullpath: newFullPath,
          relativepath: relativePath
        };
      }
    }
  } else {
    // Fallback logic: organize by date only
    for (const file of input.files) {
      if (file.existing && file.existing.modified) {
        const modifiedDate = new Date(file.existing.modified);
        if (!isNaN(modifiedDate.getTime())) {
          const dateFolder = `${modifiedDate.getFullYear()}-${String(modifiedDate.getMonth() + 1).padStart(2, '0')}-${String(modifiedDate.getDate()).padStart(2, '0')}`;
          const newDirectory = pathPosix.join(file.existing.directory, dateFolder);
          const newFullPath = pathPosix.join(newDirectory, file.existing.filename);
          const relativePath = pathPosix.join(dateFolder, file.existing.filename);
          file.proposed = {
            fullpath: newFullPath,
            relativepath: relativePath
          };
        }
      }
    }
  }

  // Sort files by modified time, earliest first
  const getModifiedTime = (file) => {
    if (file.existing && file.existing.modified) {
      const date = new Date(file.existing.modified);
      if (!isNaN(date.getTime())) {
        return date.getTime();
      }
    }
    return Infinity; // Place at the end
  };

  input.files.sort((a, b) => getModifiedTime(a) - getModifiedTime(b));

  const output = {
    ...input,
    type: 'file_change_manifest',
    files: input.files
  };

  return output;
}
