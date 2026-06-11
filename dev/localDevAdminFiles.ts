import { promises as fs } from 'node:fs';
import path from 'node:path';

type KnownLocalFile = {
  name: string;
  ext: string;
  size: number;
};

type LocalDevAdminFolderInventory = {
  label: string;
  relativePath: string;
  absolutePath: string;
  exists: boolean;
  fileCount: number;
  totalBytes: number;
  wavCount: number;
  jsonCount: number;
  transcriptCount: number;
};

const adminInventoryFolders = [
  { label: 'Fixtures', relativePath: 'fixtures' },
  { label: 'Public assets', relativePath: 'public' },
];

async function listKnownFiles(root: string): Promise<KnownLocalFile[] | null> {
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) {
      return null;
    }
  } catch {
    return null;
  }

  const found: KnownLocalFile[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const stat = await fs.stat(absolutePath);
      found.push({
        name: entry.name,
        ext: path.extname(entry.name).toLowerCase(),
        size: stat.size,
      });
    }
  }

  await walk(root);
  return found;
}

export async function buildLocalDevAdminFileInventory(projectRoot: string): Promise<{
  projectRoot: string;
  folders: LocalDevAdminFolderInventory[];
}> {
  const folders = await Promise.all(
    adminInventoryFolders.map(async (folder) => {
      const absolutePath = path.resolve(projectRoot, folder.relativePath);
      const files = await listKnownFiles(absolutePath);
      return {
        label: folder.label,
        relativePath: folder.relativePath,
        absolutePath,
        exists: files !== null,
        fileCount: files?.length ?? 0,
        totalBytes: files?.reduce((sum, file) => sum + file.size, 0) ?? 0,
        wavCount: files?.filter((file) => file.ext === '.wav').length ?? 0,
        jsonCount: files?.filter((file) => file.ext === '.json').length ?? 0,
        transcriptCount: files?.filter((file) => file.name.toLowerCase().includes('transcript')).length ?? 0,
      };
    }),
  );

  return { projectRoot, folders };
}
