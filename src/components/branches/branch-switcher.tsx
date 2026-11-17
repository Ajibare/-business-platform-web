'use client';

import { Building2 } from 'lucide-react';
import { useBranch } from '@/hooks/use-branch';
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select';
import { ALL_BRANCHES } from '@/lib/branch-selection';

/**
 * Chooses the branch every request is made against.
 *
 * The choice is a hint the API validates, so a member only ever sees the
 * branches they are assigned to. "All branches" appears only when the API would
 * answer a consolidated request, and the option is labelled in the list rather
 * than left to the reader to infer.
 */
export function BranchSwitcher() {
  const { branches, value, setSelection, canViewAll, isConsolidated, singleBranch } = useBranch();

  if (branches.length === 0) return null;

  const options: SearchableOption[] = [
    ...(canViewAll
      ? [
          {
            value: ALL_BRANCHES,
            label: 'All branches',
            description: 'Consolidated across every branch you can reach',
          },
        ]
      : []),
    ...branches.map((branch) => ({
      value: branch.id,
      label: branch.name,
      description: `${branch.code}${branch.isDefault ? ' · default' : ''}`,
    })),
  ];

  return (
    <div className="flex items-center gap-2">
      <Building2
        className={isConsolidated ? 'h-4 w-4 shrink-0 text-info' : 'h-4 w-4 shrink-0 text-slate'}
        aria-hidden="true"
      />
      <SearchableSelect
        options={options}
        value={value}
        onChange={setSelection}
        placeholder={singleBranch ? 'Branch' : 'Choose a branch'}
        searchPlaceholder="Search branches…"
        emptyMessage="No branch matches that search."
        ariaLabel="Active branch"
        size="sm"
        disabled={options.length <= 1}
        className="w-40 sm:w-56"
      />
    </div>
  );
}
