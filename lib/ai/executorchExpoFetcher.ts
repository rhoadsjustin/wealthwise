import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

type ResourceSource = string | number | Record<string, unknown>;

const EXECUTORCH_DIR = `${FileSystem.documentDirectory}react-native-executorch/`;

function ensureDir() {
  return FileSystem.makeDirectoryAsync(EXECUTORCH_DIR, { intermediates: true });
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function stripFileScheme(path: string) {
  return path.startsWith('file://') ? path.slice('file://'.length) : path;
}

function isRemoteUrl(value: string) {
  return /^https?:\/\//.test(value);
}

function isFileUri(value: string) {
  return value.startsWith('file://');
}

async function resolveAsset(source: number) {
  const asset = Asset.fromModule(source);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  if (!asset.localUri) {
    throw new Error('Failed to resolve bundled ExecuTorch asset.');
  }

  return stripFileScheme(asset.localUri);
}

async function resolveObject(source: Record<string, unknown>, index: number) {
  const filename = `inline_${index}.json`;
  const uri = `${EXECUTORCH_DIR}${filename}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(source), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return stripFileScheme(uri);
}

async function resolveString(
  source: string,
  index: number,
  onProgress: (downloadProgress: number) => void,
  totalCount: number
) {
  if (isRemoteUrl(source)) {
    const url = new URL(source);
    const baseName = sanitizeFilename(
      url.pathname.split('/').filter(Boolean).pop() || `remote_${index}`
    );
    const targetUri = `${EXECUTORCH_DIR}${baseName}`;
    const existing = await FileSystem.getInfoAsync(targetUri);
    if (existing.exists) {
      onProgress((index + 1) / totalCount);
      return stripFileScheme(targetUri);
    }

    const download = FileSystem.createDownloadResumable(
      source,
      targetUri,
      {},
      ({ totalBytesExpectedToWrite, totalBytesWritten }) => {
        if (!totalBytesExpectedToWrite) return;
        const fileProgress = totalBytesWritten / totalBytesExpectedToWrite;
        onProgress((index + fileProgress) / totalCount);
      }
    );
    const result = await download.downloadAsync();
    if (!result?.uri) {
      return null;
    }
    return stripFileScheme(result.uri);
  }

  if (isFileUri(source)) {
    return stripFileScheme(source);
  }

  return source;
}

export const ExecuTorchExpoFetcher = {
  async fetch(
    callback: (downloadProgress: number) => void = () => {},
    ...sources: ResourceSource[]
  ): Promise<string[] | null> {
    await ensureDir();

    const results: string[] = [];
    const totalCount = Math.max(sources.length, 1);

    for (const [index, source] of sources.entries()) {
      let resolved: string | null;

      if (typeof source === 'number') {
        resolved = await resolveAsset(source);
        callback((index + 1) / totalCount);
      } else if (typeof source === 'string') {
        resolved = await resolveString(source, index, callback, totalCount);
      } else {
        resolved = await resolveObject(source, index);
        callback((index + 1) / totalCount);
      }

      if (resolved === null) {
        return null;
      }

      results.push(resolved);
    }

    callback(1);
    return results;
  },

  async readAsString(path: string) {
    const uri = path.startsWith('file://') ? path : `file://${path}`;
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  },
};
