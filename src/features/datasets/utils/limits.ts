export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ROWS = 20_000;
export const MAX_COLUMNS = 200;
export const MAX_PREVIEW_ROWS = 5;
export const SUPPORTED_EXTENSIONS = [".csv", ".xlsx"] as const;

export const isSupportedFilename = (filename: string) =>
  SUPPORTED_EXTENSIONS.some((extension) => filename.toLowerCase().endsWith(extension));
