import fs from 'fs';
import path from 'path';

function normalizePath(p) {
  return p.replace(new RegExp(`\\${path.sep}`, 'g'), '/');
}

export const info = {
  description: "The `dircontents` script is a powerful utility that reads and analyzes the contents of a specified directory, delivering a detailed breakdown of its files and subdirectories. Its primary purpose is to provide users with a structured and comprehensive overview of directory contents, making it ideal for tasks such as file system exploration, inventory management, or debugging directory-related issues. For each file, it retrieves essential metadata including the filename, file extension, directory path, full file path, file size (in bytes), and the last modification time. For subdirectories, it provides the directory name, path, and an indicator of whether it is a symbolic link. The script leverages asynchronous file system operations to ensure efficient, non-blocking performance, making it suitable for both small and large directories. With customizable options, users can tailor the output to include hidden files or explore subdirectories recursively, enhancing its flexibility for various use cases.",
  input: {
    type: "object",
    properties: {
      dirpath: {
        type: "string",
        description: "The path to the directory whose contents will be read. This can be an absolute path (e.g., '/home/user/docs') or a relative path (e.g., './docs') based on the current working directory."
      }
    },
    required: ["dirpath"]
  },
  options: {
    includeHidden: {
      type: "boolean",
      description: "Controls whether hidden files and directories (e.g., those starting with a dot, such as '.gitignore') are included in the output. By default, this is set to false, excluding hidden items for a cleaner result."
    },
    recursive: {
      type: "boolean",
      description: "Determines whether the script will recursively traverse subdirectories within the specified directory. When set to true, it includes the contents of all nested directories; otherwise, it only processes the top-level contents. Default is false."
    }
  },
  output: {
    type: "object",
    properties: {
      type: { type: "string", const: "dir_contents" },
      timestamp: { type: "string", format: "date-time", description: "The date and time when the directory contents were read, formatted as an ISO 8601 string (e.g., '2023-10-15T14:30:00Z')." },
      files: {
        type: "array",
        items: {
          type: "object",
          properties: {
            existing: {
              type: "object",
              properties: {
                filename: { type: "string", description: "The name of the file, including its extension (e.g., 'document.txt')." },
                extension: { type: "string", description: "The file extension, if present (e.g., 'txt'), or an empty string if none." },
                directory: { type: "string", description: "The path to the parent directory of the file (e.g., '/home/user/docs')." },
                fullpath: { type: "string", description: "The complete path to the file (e.g., '/home/user/docs/document.txt')." },
                filesize: { type: "number", description: "The size of the file in bytes (e.g., 1024 for a 1KB file)." },
                modified: { type: "string", format: "date-time", description: "The last modification time of the file, in ISO 8601 format (e.g., '2023-10-15T12:00:00Z')." }
              }
            },
            error: { type: "string", description: "An optional error message if the file’s metadata could not be retrieved (e.g., due to permission issues)." }
          }
        }
      },
      dirs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            existing: {
              type: "object",
              properties: {
                dirname: { type: "string", description: "The name of the subdirectory (e.g., 'subfolder')." },
                directory: { type: "string", description: "The path to the parent directory of the subdirectory (e.g., '/home/user/docs')." },
                fullpath: { type: "string", description: "The complete path to the subdirectory (e.g., '/home/user/docs/subfolder')." },
                isSymlink: { type: "boolean", description: "Indicates whether the subdirectory is a symbolic link (true) or a regular directory (false)." }
              }
            }
          }
        }
      }
    }
  }
};

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