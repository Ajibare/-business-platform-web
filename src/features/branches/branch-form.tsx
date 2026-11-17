'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/services/api';
import { branchApi } from '@/services/platform';
import type { BranchRecord } from '@/types/platform';

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

interface BranchFormProps {
  /** Present when editing an existing branch. */
  branch?: BranchRecord;
  onSaved: (branch: BranchRecord) => void;
  onCancel?: () => void;
}

/**
 * Creates or edits a branch.
 *
 * The code is the one value the API must enforce uniquely, so the form checks
 * its shape locally and leaves the duplicate decision to the server, which
 * reports it against the field.
 */
export function BranchForm({ branch, onSaved, onCancel }: BranchFormProps) {
  const [name, setName] = useState(branch?.name ?? '');
  const [code, setCode] = useState(branch?.code ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [phone, setPhone] = useState(branch?.phone ?? '');
  const [email, setEmail] = useState(branch?.email ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter a branch name of at least 2 characters.';
    if (!CODE_PATTERN.test(code.trim())) {
      next.code = 'Use letters, numbers and dashes, starting with a letter or number.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      };
      const saved = branch
        ? await branchApi.update(branch.id, {
            name: payload.name,
            code: payload.code,
            address: address.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
          })
        : await branchApi.create(payload);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.field) setErrors({ [error.field]: error.message });
        else setFormError(error.message);
      } else {
        setFormError('We could not save that branch. Check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Branch name" htmlFor="branch-name" required error={errors.name}>
          <Input
            id="branch-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ikeja City Mall"
            autoComplete="off"
          />
        </Field>

        <Field
          label="Branch code"
          htmlFor="branch-code"
          required
          error={errors.code}
          hint="Short and unique inside this organisation, for example IKEJA-1."
        >
          <Input
            id="branch-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="IKEJA-1"
            autoComplete="off"
          />
        </Field>

        <Field label="Address" htmlFor="branch-address" className="sm:col-span-2">
          <Input
            id="branch-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="12 Allen Avenue, Ikeja, Lagos"
            autoComplete="off"
          />
        </Field>

        <Field label="Phone" htmlFor="branch-phone">
          <Input
            id="branch-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0803 123 4567"
            autoComplete="off"
          />
        </Field>

        <Field label="Email" htmlFor="branch-email">
          <Input
            id="branch-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ikeja@pharmacy.com"
            autoComplete="off"
          />
        </Field>
      </div>

      {formError ? (
        <p className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : branch ? 'Save changes' : 'Create branch'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
