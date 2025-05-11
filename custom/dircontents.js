import fs from 'fs';
import path from 'path';

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
    const contents = await fs.promises.readdir(absolutePath);
    return { contents };
  } catch (error) {
    throw new Error(`Failed to read directory "${absolutePath}": ${error.message}`);
  }
}