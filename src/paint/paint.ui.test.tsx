import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from '../App';
import { sampleDoc } from '../data/sample';
import { TimelineProvider } from '../data/store';
import { stubLayout } from '../test/stubLayout';

beforeAll(() => stubLayout());

/** The sample timeline with two roles' threads cleared. */
function setup() {
  const doc = sampleDoc();
  for (const role of doc.roles) if (role.id === 'coach1' || role.id === 'talk') role.threads = [];
  render(
    <TimelineProvider initial={{ doc, source: 'saved', warnings: [] }}>
      <App />
    </TimelineProvider>,
  );
  return userEvent.setup();
}

const pill = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title} ·`) });
const bar = () => screen.getByRole('region', { name: 'Color your timeline' });

describe('color your timeline', () => {
  it('nudges when roles have no threads, and opens coloring from there', async () => {
    const user = setup();
    // The sample also has a sabbatical with no threads.
    expect(screen.getByText(/3 roles have no threads yet/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Color your timeline' }));
    expect(bar()).toBeInTheDocument();
    expect(within(bar()).getByRole('radio', { name: /Design/ })).toBeChecked();
  });

  it('adds the chosen thread on a tap and takes it off on the next', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Color' }));
    await user.click(within(bar()).getByRole('radio', { name: /Coaching/ }));

    expect(pill('Swim Coach')).toHaveAttribute('aria-pressed', 'false');
    await user.click(pill('Swim Coach'));
    expect(pill('Swim Coach')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Coaching added to Swim Coach')).toBeInTheDocument();
    expect(screen.getByText(/2 roles have no threads yet/)).toBeInTheDocument();
    // Coloring doesn't open the detail panel.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(pill('Swim Coach'));
    expect(pill('Swim Coach')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Coaching removed from Swim Coach')).toBeInTheDocument();
  });

  it('shows titles while coloring and goes back to reading on Done', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Color' }));
    expect(screen.getByRole('checkbox', { name: 'Titles' })).toBeChecked();

    await user.click(within(bar()).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('region', { name: 'Color your timeline' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Titles' })).not.toBeChecked();
    await user.click(pill('Swim Coach'));
    expect(screen.getByRole('dialog', { name: 'Swim Coach' })).toBeInTheDocument();
  });

  it('leaves coloring with Escape', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Color' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Color your timeline' })).not.toBeInTheDocument();
  });
});
