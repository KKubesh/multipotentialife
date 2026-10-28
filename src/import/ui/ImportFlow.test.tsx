import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { emptyDoc } from '../../data/defaults';
import { TimelineProvider } from '../../data/store';
import { useTimeline } from '../../data/timelineContext';
import type { ImportDraft, ImportResult } from '../drafts';
import { PdfReadError } from '../pdf';
import { ImportFlow } from './ImportFlow';

const draft = (over: Partial<ImportDraft>): ImportDraft => ({
  key: over.title ?? 'k',
  kind: 'work',
  title: 'Role',
  company: 'Northwind',
  start: '2020-01',
  end: '2021-01',
  startPrecision: 'month',
  endPrecision: 'month',
  location: '',
  details: [],
  chain: null,
  overlapsWith: null,
  ...over,
});

const result: ImportResult = {
  profile: { name: 'Sam Example', headline: 'Maker', linkedin: 'www.linkedin.com/in/sam' },
  drafts: [
    draft({ title: 'Cartographer', details: ['Drew maps', 'Taught classes'] }),
    draft({ title: 'Volunteer', start: '2014-01', end: '2014-12', startPrecision: 'year', endPrecision: 'year' }),
    draft({ title: 'BA, Geography', kind: 'education', company: 'UMD', start: null, end: null }),
  ],
};

/** Shows what's on the timeline, so tests can check the import landed. */
function TimelineProbe() {
  const { doc } = useTimeline();
  return <output data-testid="probe">{JSON.stringify({ roles: doc.roles, name: doc.profile.name })}</output>;
}

function setup(readFile: (file: File) => Promise<ImportResult> = async () => result) {
  const onClose = vi.fn();
  const file = new File(['%PDF-'], 'sam.pdf', { type: 'application/pdf' });
  render(
    <TimelineProvider initial={{ doc: emptyDoc(), source: 'new', warnings: [] }}>
      <ImportFlow file={file} onClose={onClose} readFile={readFile} />
      <TimelineProbe />
    </TimelineProvider>,
  );
  const probe = () => JSON.parse(screen.getByTestId('probe').textContent ?? '{}');
  return { user: userEvent.setup(), onClose, probe };
}

const firstCard = () => screen.findByText('Role 1 of 3', {}, { timeout: 3000 });

describe('ImportFlow', () => {
  it('shows the loader, then walks through each role and imports them', async () => {
    const { user, onClose, probe } = setup();
    expect(screen.getByText('Reading your PDF…')).toBeInTheDocument();
    await firstCard();

    // No threads are pre-picked; pick two.
    expect(screen.getByRole('button', { name: /Design/ })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: /Software/ }));
    await user.click(screen.getByRole('button', { name: /Design/ }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // A year-only role says its months are a guess.
    expect(screen.getByText('Role 2 of 3')).toBeInTheDocument();
    expect(screen.getByText(/only shows the year/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Missing dates block Next until the role is left out.
    expect(screen.getByText('Education 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Leave this one out' }));
    await user.click(screen.getByRole('button', { name: 'Review' }));

    expect(screen.getByText('Ready to add')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show my timeline' }));

    expect(onClose).toHaveBeenCalled();
    const { roles, name } = probe();
    expect(roles.map((r: { title: string }) => r.title)).toEqual(['Cartographer', 'Volunteer']);
    expect(roles[0].threads).toEqual(['software', 'design']);
    expect(name).toBe('Sam Example');
  });

  it('edits, removes and restores details', async () => {
    const { user } = setup();
    await firstCard();

    await user.click(screen.getByRole('button', { name: 'Drew maps' }));
    await user.keyboard(' of lakes{Enter}');
    expect(screen.getByRole('button', { name: 'Drew maps of lakes' })).toBeInTheDocument();

    const list = screen.getByRole('list');
    await user.click(within(list).getAllByRole('button', { name: 'Remove detail' })[1]);
    expect(screen.queryByText('Taught classes')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Taught classes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Add detail' }));
    await user.keyboard('Led field trips{Enter}');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('lets missing dates be filled in', async () => {
    const { user } = setup();
    await firstCard();
    await user.click(screen.getByRole('button', { name: 'Finish' })); // disabled: education has no dates
    expect(screen.getByText('Role 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.selectOptions(screen.getByLabelText('Start month'), 'Sep');
    await user.type(screen.getByLabelText('Start year'), '2010');
    await user.selectOptions(screen.getByLabelText('End month'), 'May');
    await user.type(screen.getByLabelText('End year'), '2014');
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled();
  });

  it('explains when the file is not a LinkedIn PDF', async () => {
    setup(async () => {
      throw new PdfReadError('unreadable', "This doesn't look like a LinkedIn profile PDF.");
    });
    expect(await screen.findByRole('alert')).toHaveTextContent("doesn't look like a LinkedIn profile PDF");
  });
});
