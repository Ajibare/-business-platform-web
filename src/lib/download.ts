/**
 * Triggers a browser download for text content returned by the API.
 * Used for CSV templates and import error reports.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  contentType = 'text/csv;charset=utf-8',
) {
  saveBlob(filename, new Blob([content], { type: contentType }));
}

/**
 * Triggers a browser download for base64 content returned by the API, such as
 * the Excel import template. The API only speaks JSON, so binaries are encoded.
 */
export function downloadBase64File(
  filename: string,
  base64: string,
  contentType: string,
) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  saveBlob(filename, new Blob([bytes], { type: contentType }));
}

/** Downloads a file returned by the API in whichever encoding it used. */
export function downloadApiFile(file: {
  filename: string;
  content: string;
  contentType: string;
  encoding?: 'text' | 'base64';
}) {
  if (file.encoding === 'base64') {
    downloadBase64File(file.filename, file.content, file.contentType);
    return;
  }
  downloadTextFile(file.filename, file.content, file.contentType);
}

function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
