import fs from 'fs/promises';
import path from 'path';

const FILE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

const normalizeExtension = (value) => {
  const extension = String(value || 'bin')
    .trim()
    .replace(/^\.+/, '')
    .toLowerCase();
  return extension || 'bin';
};

export const getBackgroundJobArtifactDirectory = () =>
  path.resolve(
    process.env.BACKGROUND_JOB_ARTIFACT_DIR ||
      path.join(process.cwd(), 'tmp', 'background-job-artifacts')
  );

const ensureValidArtifactFileName = (fileName) => {
  const normalized = String(fileName || '').trim();
  if (!normalized || !FILE_NAME_PATTERN.test(normalized)) {
    throw new Error('Invalid background job artifact file name');
  }
  return normalized;
};

export const persistBackgroundJobArtifact = async ({
  jobId,
  buffer,
  extension = 'bin'
}) => {
  const normalizedJobId = String(jobId || '').trim();
  if (!normalizedJobId) {
    throw new Error('jobId is required to persist background job artifact');
  }

  if (!buffer) {
    throw new Error('buffer is required to persist background job artifact');
  }

  const directory = getBackgroundJobArtifactDirectory();
  await fs.mkdir(directory, { recursive: true });

  const normalizedExtension = normalizeExtension(extension);
  const fileName = `job-${normalizedJobId}.${normalizedExtension}`;
  const artifactPath = path.join(directory, fileName);

  await fs.writeFile(artifactPath, buffer);

  return {
    fileName,
    sizeBytes: Buffer.byteLength(buffer)
  };
};

export const readBackgroundJobArtifact = async ({ fileName }) => {
  const normalized = ensureValidArtifactFileName(fileName);
  const artifactPath = path.join(
    getBackgroundJobArtifactDirectory(),
    normalized
  );
  return fs.readFile(artifactPath);
};

export const deleteBackgroundJobArtifactsByPrefix = async ({
  fileNamePrefix = ''
}) => {
  const normalizedPrefix = String(fileNamePrefix || '').trim();
  if (!normalizedPrefix) return 0;

  const directory = getBackgroundJobArtifactDirectory();
  const entries = await fs
    .readdir(directory, { withFileTypes: true })
    .catch(() => []);
  const removals = entries
    .filter(
      (entry) => entry.isFile() && entry.name.startsWith(normalizedPrefix)
    )
    .map((entry) => fs.unlink(path.join(directory, entry.name)));
  await Promise.all(removals);
  return removals.length;
};

export default {
  getBackgroundJobArtifactDirectory,
  persistBackgroundJobArtifact,
  readBackgroundJobArtifact,
  deleteBackgroundJobArtifactsByPrefix
};
