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
}

export interface FileUploadProps {
  onFile: (file: UploadedFile) => void;
  accept?: string;
  maxBytes?: number;
  disabled?: boolean;
  hint?: string;
}

/**
 * Drag and drop or click to upload a CSV file. Files are read as text in the
 * browser and validated again on the server; nothing is imported here.
 */
export function FileUpload({
  onFile,
  accept = '.csv,text/csv',
  maxBytes = 5_000_000,
  disabled,
  hint = 'CSV files only. Open the template, fill it in, then save as CSV.',
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UploadedFile | null>(null);

  const readFile = async (file: File) => {
    if (!/\.csv$/i.test(file.name)) {
      setError('Only .csv files are supported.');
      return;
    }
    if (file.size > maxBytes) {
      setError(`The file is larger than ${(maxBytes / 1_000_000).toFixed(1)} MB.`);
      return;
    }

    try {
      const content = await file.text();
      const uploaded: UploadedFile = { name: file.name, content, size: file.size };
      setSelected(uploaded);
      setError(null);
      onFile(uploaded);
    } catch {
      setError('The file could not be read. Try saving it again as CSV.');
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
          {selected ? selected.name : 'Drag and drop your CSV file here'}
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
          aria-label="Upload CSV file"
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
