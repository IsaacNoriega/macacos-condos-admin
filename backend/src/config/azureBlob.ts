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