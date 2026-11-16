/**
 * Triggers a browser download for text content returned by the API.
 * Used for CSV templates and import error reports.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  contentType = 'text/csv;charset=utf-8',
) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
