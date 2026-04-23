import { randomUUID } from 'crypto';
import path from 'path';
import {
  BlobServiceClient,
  BlobSASPermissions,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { AppError } from '../utils/httpError';

const DEFAULT_CONTAINER_NAME = 'condominios';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const parseConnectionStringValue = (key: string) => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
  const match = connectionString.match(new RegExp(`${key}=([^;]+)`));

  return match?.[1] || '';
};

const getAccountName = () => process.env.AZURE_STORAGE_ACCOUNT_NAME || parseConnectionStringValue('AccountName');

const getAccountKey = () => process.env.AZURE_STORAGE_ACCOUNT_KEY || parseConnectionStringValue('AccountKey');

const getConnectionString = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!connectionString) {
    throw new AppError('AZURE_STORAGE_CONNECTION_STRING no configurado', 500);
  }

  return connectionString;
};

const getContainerName = () => process.env.AZURE_STORAGE_CONTAINER_NAME || DEFAULT_CONTAINER_NAME;

const getBlobServiceClient = () => BlobServiceClient.fromConnectionString(getConnectionString());

const getSharedKeyCredential = () => {
  const accountName = getAccountName();
  const accountKey = getAccountKey();

  if (!accountName || !accountKey) {
    throw new AppError('No se pudo leer AccountName o AccountKey de Azure Storage', 500);
  }

  return new StorageSharedKeyCredential(accountName, accountKey);
};

const getFileExtension = (file: Express.Multer.File) => {
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (extension) {
    return extension;
  }

  if (file.mimetype === 'image/jpeg') {
    return '.jpg';
  }

  if (file.mimetype === 'image/png') {
    return '.png';
  }

  if (file.mimetype === 'image/webp') {
    return '.webp';
  }

  return '.png';
};

export const uploadPaymentProofToAzure = async (
  file: Express.Multer.File,
  tenantId: string,
  userId?: string
): Promise<{ blobName: string; url: string }> => {
  if (!file) {
    throw new AppError('Debes seleccionar un archivo para el comprobante', 400);
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new AppError('Solo se permiten imágenes como comprobante', 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError('El comprobante no debe superar 10 MB', 400);
  }

  const containerClient = getBlobServiceClient().getContainerClient(getContainerName());
  await containerClient.createIfNotExists();

  const safeTenantId = String(tenantId || 'global').replace(/[^a-zA-Z0-9-_]/g, '-');
  const safeUserId = String(userId || 'user').replace(/[^a-zA-Z0-9-_]/g, '-');
  const blobName = `proofs/${safeTenantId}/${safeUserId}-${Date.now()}-${randomUUID()}${getFileExtension(file)}`;
  const blobClient = containerClient.getBlockBlobClient(blobName);

  await blobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype,
    },
  });

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: getContainerName(),
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000),
      protocol: SASProtocol.Https,
    },
    getSharedKeyCredential()
  ).toString();

  return {
    blobName,
    url: `${blobClient.url}?${sasToken}`,
  };
};

export const getPaymentProofSasUrl = async (blobName: string): Promise<string> => {
  if (!blobName) {
    throw new AppError('blobName es obligatorio', 400);
  }

  const containerName = getContainerName();
  const blobClient = getBlobServiceClient().getContainerClient(containerName).getBlockBlobClient(blobName);
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn: new Date(Date.now() + 24 * 60 * 60 * 1000),
      protocol: SASProtocol.Https,
    },
    getSharedKeyCredential()
  ).toString();

  return `${blobClient.url}?${sasToken}`;
};

export const extractBlobNameFromProofUrl = (proofUrl: string): string | null => {
  if (!proofUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(proofUrl);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      return null;
    }

    return pathParts.slice(1).join('/');
  } catch {
    return null;
  }
};

const sanitizeIdSegment = (value: string) => String(value || '').replace(/[^a-zA-Z0-9-_]/g, '-');

// Validate that a proofOfPaymentUrl actually targets a blob this server
// created for the given tenant/uploader and return the resolved blob name.
// Returns null on any mismatch so callers can reject untrusted URLs
// before persisting a blob name that would later mint a SAS URL.
export const resolveOwnedProofBlobName = (
  proofUrl: string,
  tenantId: string,
  uploaderUserId?: string
): string | null => {
  if (!proofUrl) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(proofUrl);
  } catch {
    return null;
  }

  const accountName = getAccountName();
  if (!accountName) {
    return null;
  }

  const expectedHost = `${accountName.toLowerCase()}.blob.core.windows.net`;
  if (parsed.hostname.toLowerCase() !== expectedHost) {
    return null;
  }

  const pathParts = parsed.pathname.split('/').filter(Boolean);
  if (pathParts.length < 4) {
    return null;
  }

  const [container, prefix, tenantSegment, ...rest] = pathParts;
  if (container !== getContainerName()) {
    return null;
  }

  if (prefix !== 'proofs') {
    return null;
  }

  const safeTenantId = sanitizeIdSegment(tenantId || 'global');
  if (tenantSegment !== safeTenantId) {
    return null;
  }

  if (!rest.length) {
    return null;
  }

  if (uploaderUserId) {
    const safeUploaderId = sanitizeIdSegment(uploaderUserId);
    const filename = rest[rest.length - 1];
    if (!filename.startsWith(`${safeUploaderId}-`)) {
      return null;
    }
  }

  return [prefix, tenantSegment, ...rest].join('/');
};