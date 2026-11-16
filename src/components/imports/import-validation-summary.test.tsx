import { render, screen } from '@testing-library/react';
import { ImportJobDetail } from '@/types/api';
import { ImportValidationSummary } from './import-validation-summary';

const job: ImportJobDetail = {
  id: 'job-1',
  type: 'PRODUCTS',
  filename: 'products.csv',
  status: 'VALIDATED',
  totalRows: 4,
  validRows: 2,
  invalidRows: 1,
  duplicateRows: 1,
  importedRows: 0,
  failedRows: 0,
  createdAt: '2026-11-16T09:00:00.000Z',
  completedAt: null,
  summary: { fileErrors: [], mapping: {}, headers: ['Product name', 'Unit'] },
  previewLimit: 200,
  rows: [],
};

describe('ImportValidationSummary', () => {
  it('reports valid, invalid and duplicate counts', () => {
    render(<ImportValidationSummary job={job} />);

    expect(screen.getByText('Ready to import')).toBeInTheDocument();
    expect(screen.getByText('Rows in file')).toBeInTheDocument();
    expect(screen.getByText('1 invalid and 1 duplicate row(s) are excluded. Correct them using the error report, then upload the corrected file. Valid rows can still be imported now.')).toBeInTheDocument();
  });

  it('shows file level errors when the header could not be validated', () => {
    render(
      <ImportValidationSummary
        job={{
          ...job,
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          duplicateRows: 0,
          summary: {
            fileErrors: ['Missing required column(s): Unit. Map each required column to a header in your file.'],
            mapping: {},
            headers: ['Product name'],
          },
        }}
      />,
    );

    expect(screen.getByText('The file could not be validated')).toBeInTheDocument();
    expect(
      screen.getByText(/Missing required column\(s\): Unit/),
    ).toBeInTheDocument();
  });
});
