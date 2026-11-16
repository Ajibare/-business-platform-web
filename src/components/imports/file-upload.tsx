'use client';

import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  name: string;
  content: string;
  size: number;
  /** Excel workbooks are sent as base64 because the API accepts JSON bodies. */
  encoding: 'text' | 'base64';
}

export interface FileUploadProps {
  onFile: (file: UploadedFile) => void;
  accept?: string;
  maxBytes?: number;
  disabled?: boolean;
  hint?: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/**
 * Drag and drop or click to upload a spreadsheet. Files are read in the browser
 * and validated again on the server; nothing is imported here.
 */
export function FileUpload({
  onFile,
  accept = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  maxBytes = 5_000_000,
  disabled,
  hint = 'Excel (.xlsx) or CSV files. Download the sample template, fill it in, then upload it.',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UploadedFile | null>(null);

  const readFile = async (file: File) => {
    const isExcel = /\.xlsx$/i.test(file.name);

    if (/\.xls$/i.test(file.name)) {
      setError('Legacy .xls files are not supported. Save the sheet as .xlsx or CSV.');
      return;
    }
    if (!isExcel && !/\.csv$/i.test(file.name)) {
      setError('Only .xlsx and .csv files are supported.');
      return;
    }
    if (file.size > maxBytes) {
      setError(`The file is larger than ${(maxBytes / 1_000_000).toFixed(1)} MB.`);
      return;
    }

    try {
      const uploaded: UploadedFile = isExcel
        ? {
            name: file.name,
            content: arrayBufferToBase64(await file.arrayBuffer()),
            size: file.size,
            encoding: 'base64',
          }
        : { name: file.name, content: await file.text(), size: file.size, encoding: 'text' };
      setSelected(uploaded);
      setError(null);
      onFile(uploaded);
    } catch {
      setError('The file could not be read. Try saving it again as .xlsx or CSV.');
    }
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void readFile(file);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void readFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-md border-2 border-dashed p-6 text-center transition-colors',
          dragging ? 'border-primary-600 bg-primary-50' : 'border-border bg-background',
          disabled ? 'opacity-60' : '',
        )}
      >
        <FileSpreadsheet className="mx-auto h-8 w-8 text-slate" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-ink">
          {selected ? selected.name : 'Drag and drop your spreadsheet here'}
        </p>
        <p className="mt-1 text-xs text-slate">{hint}</p>
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
            Choose file
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInput}
          aria-label="Upload spreadsheet"
        />
      </div>

      {selected ? (
        <p className="mt-2 text-xs text-slate">
          {selected.name} · {(selected.size / 1024).toFixed(1)} KB loaded in the browser. Nothing is
          imported until you review and confirm.
        </p>
      ) : null}

      {error ? (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
