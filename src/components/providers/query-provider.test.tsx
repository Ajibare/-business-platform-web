import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { QueryProvider } from '@/components/providers/query-provider';
import { toast } from '@/components/ui/toast';
import { ApiError, NETWORK_ERROR_MESSAGE } from '@/services/api';

/**
 * The caches are the one place that decides what the user is told. These tests
 * pin the contract every screen relies on: `meta.successMessage` confirms a
 * write after it is confirmed, `meta.errorMessage` is the sentence used when the
 * API's own wording cannot be shown, and `meta.silent` keeps the popup away from
 * a screen that already prints the failure.
 */
interface Meta {
  successMessage?: string;
  errorMessage?: string;
  silent?: boolean;
}

function SaveButton({ run, meta }: { run: () => Promise<unknown>; meta?: Meta }) {
  const mutation = useMutation({ meta, mutationFn: run });
  return (
    <div>
      <button type="button" onClick={() => mutation.mutate()}>
        Save
      </button>
      <p>{mutation.isPending ? 'pending' : mutation.isError ? 'failed' : mutation.isSuccess ? 'saved' : 'idle'}</p>
    </div>
  );
}

function Loader({ run, meta }: { run: () => Promise<unknown>; meta?: Meta }) {
  const query = useQuery({ queryKey: ['probe'], queryFn: run, retry: false, meta });
  return <p>{query.isPending ? 'loading' : 'settled'}</p>;
}

function pressSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

beforeEach(() => {
  toast.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a write that succeeds', () => {
  it('confirms it only once the API has answered', async () => {
    const success = jest.spyOn(toast, 'success');
    let settle: (value: string) => void = () => undefined;
    const pending = new Promise<string>((resolve) => {
      settle = resolve;
    });

    render(
      <QueryProvider>
        <SaveButton run={() => pending} meta={{ successMessage: 'Medicine created successfully.' }} />
      </QueryProvider>,
    );

    pressSave();
    await waitFor(() => expect(screen.getByText('pending')).toBeInTheDocument());
    expect(success).not.toHaveBeenCalled();

    settle('created');
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith('Medicine created successfully.'),
    );
  });

  it('stays quiet when the caller has nothing to announce', async () => {
    const success = jest.spyOn(toast, 'success');

    render(
      <QueryProvider>
        <SaveButton run={() => Promise.resolve('ok')} meta={{ silent: true }} />
      </QueryProvider>,
    );

    pressSave();
    await waitFor(() => expect(screen.getByText('saved')).toBeInTheDocument());
    expect(success).not.toHaveBeenCalled();
  });
});

describe('a write that fails', () => {
  it('shows the API’s own wording for a rejection the user can act on', async () => {
    const error = jest.spyOn(toast, 'error');

    render(
      <QueryProvider>
        <SaveButton
          run={() =>
            Promise.reject(
              new ApiError('This medicine already exists.', { statusCode: 409, code: 'CONFLICT' }),
            )
          }
          meta={{ errorMessage: 'Failed to create the medicine. Please try again.' }}
        />
      </QueryProvider>,
    );

    pressSave();
    await waitFor(() => expect(error).toHaveBeenCalledWith('This medicine already exists.'));
  });

  it('replaces server text on a 500 so internals never reach the screen', async () => {
    const error = jest.spyOn(toast, 'error');

    render(
      <QueryProvider>
        <SaveButton
          run={() =>
            Promise.reject(
              new ApiError('PrismaClientKnownRequestError: Unique constraint failed on field id', {
                statusCode: 500,
              }),
            )
          }
          meta={{ errorMessage: 'Failed to create the medicine. Please try again.' }}
        />
      </QueryProvider>,
    );

    pressSave();
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Failed to create the medicine. Please try again.'),
    );
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining('Prisma'));
  });

  it('uses the shared sentence when the request never reached the API', async () => {
    const error = jest.spyOn(toast, 'error');

    render(
      <QueryProvider>
        <SaveButton
          run={() => Promise.reject(new Error('Failed to fetch'))}
          meta={{ errorMessage: 'Failed to create the medicine. Please try again.' }}
        />
      </QueryProvider>,
    );

    pressSave();
    await waitFor(() => expect(error).toHaveBeenCalledWith(NETWORK_ERROR_MESSAGE));
  });

  it('falls back to a generic sentence when the caller supplies none', async () => {
    const error = jest.spyOn(toast, 'error');

    render(
      <QueryProvider>
        <SaveButton run={() => Promise.reject(new ApiError('Internal server error', { statusCode: 500 }))} />
      </QueryProvider>,
    );

    pressSave();
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Something went wrong. Please try again.'),
    );
  });

  it('leaves an expired session to the refresh flow', async () => {
    const error = jest.spyOn(toast, 'error');

    render(
      <QueryProvider>
        <SaveButton
          run={() => Promise.reject(new ApiError('Unauthorized', { statusCode: 401 }))}
          meta={{ errorMessage: 'Failed to save. Please try again.' }}
        />
      </QueryProvider>,
    );

    pressSave();
    await waitFor(() => expect(screen.getByText('failed')).toBeInTheDocument());
    expect(error).not.toHaveBeenCalled();
  });

  it('does not repeat a failure the screen already shows', async () => {
    const error = jest.spyOn(toast, 'error');

    render(
      <QueryProvider>
        <SaveButton
          run={() => Promise.reject(new ApiError('Insufficient stock.', { statusCode: 409 }))}
          meta={{ silent: true }}
        />
      </QueryProvider>,
    );

    pressSave();
    await waitFor(() => expect(screen.getByText('failed')).toBeInTheDocument());
    expect(error).not.toHaveBeenCalled();
  });
});

describe('a read that fails', () => {
  it('reports the failure with the copy the screen asked for', async () => {
    const error = jest.spyOn(toast, 'error');

    render(
      <QueryProvider>
        <Loader
          run={() => Promise.reject(new ApiError('Internal server error', { statusCode: 500 }))}
          meta={{ errorMessage: 'Unable to load products.' }}
        />
      </QueryProvider>,
    );

    await waitFor(() => expect(error).toHaveBeenCalledWith('Unable to load products.'));
  });

  it('says nothing when the table below already prints the row of text', async () => {
    const error = jest.spyOn(toast, 'error');

    render(
      <QueryProvider>
        <Loader run={() => Promise.reject(new ApiError('Nope', { statusCode: 400 }))} meta={{ silent: true }} />
      </QueryProvider>,
    );

    await waitFor(() => expect(screen.getByText('settled')).toBeInTheDocument());
    expect(error).not.toHaveBeenCalled();
  });

  it('does not interrupt a background refresh with a popup', async () => {
    const error = jest.spyOn(toast, 'error');
    const run = jest.fn(() => Promise.reject(new ApiError('Nope', { statusCode: 500 })));

    function Cached() {
      // Data is already on screen; the refetch failing changes nothing for the user.
      const query = useQuery({ queryKey: ['cached'], queryFn: run, retry: false, initialData: 'cached' });
      return <p>{String(query.data)}</p>;
    }

    render(
      <QueryProvider>
        <Cached />
      </QueryProvider>,
    );

    await waitFor(() => expect(run).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(error).not.toHaveBeenCalled();
  });
});
