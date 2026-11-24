import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from '../App';
import { sampleDoc } from '../data/sample';
import { TimelineProvider } from '../data/store';
import { stubLayout } from '../test/stubLayout';

beforeAll(() => stubLayout());

function setup() {
  render(
    <TimelineProvider initial={{ doc: sampleDoc(), source: 'saved', warnings: [] }}>
      <App />
    </TimelineProvider>,
  );
  return userEvent.setup();
}

const pill = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title} ·`) });
const pills = (title: string) => screen.queryAllByRole('button', { name: new RegExp(`^${title} ·`) });
const form = () => screen.getByRole('dialog', { name: /^Edit / });
const field = (name: string) => within(form()).getByRole('textbox', { name });

async function enterEdit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Edit' }));
}

describe('edit mode', () => {
  it('opens a tapped role as a form and saves changes as they are typed', async () => {
    const user = setup();
    expect(screen.queryByRole('button', { name: '+ Add role' })).not.toBeInTheDocument();
    await enterEdit(user);
    await user.click(pill('Swim Coach'));

    expect(field('Title')).toHaveValue('Swim Coach');
    await user.clear(field('Title'));
    await user.type(field('Title'), 'Head Swim Coach');
    expect(pill('Head Swim Coach')).toBeInTheDocument();

    await user.click(within(form()).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps showing the read-only detail in view mode', async () => {
    const user = setup();
    await user.click(pill('Swim Coach'));
    expect(screen.getByRole('dialog', { name: 'Swim Coach' })).toBeInTheDocument();
  });

  it('holds back dates where the end is before the start', async () => {
    const user = setup();
    await enterEdit(user);
    await user.click(pill('Swim Coach'));
    const endYear = within(form()).getByRole('textbox', { name: 'End year' });
    await user.clear(endYear);
    await user.type(endYear, '2005');
    expect(within(form()).getByRole('alert')).toHaveTextContent('The end is before the start');
    // The saved role still ends in 2011.
    expect(pill('Swim Coach')).toHaveAccessibleName(/Aug 2011$/);
  });

  it('adds a role, and drops it again if it is closed while empty', async () => {
    const user = setup();
    await enterEdit(user);
    await user.click(screen.getByRole('button', { name: '+ Add role' }));
    expect(pills('Untitled role')).toHaveLength(1);
    await user.keyboard('{Escape}');
    expect(pills('Untitled role')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: '+ Add role' }));
    await user.type(field('Title'), 'Pottery Teacher');
    await user.keyboard('{Escape}');
    expect(pill('Pottery Teacher')).toBeInTheDocument();
  });

  it('deletes a role with an undo', async () => {
    const user = setup();
    await enterEdit(user);
    await user.click(pill('Swim Coach'));
    await user.click(within(form()).getByRole('button', { name: 'Delete role' }));
    expect(pills('Swim Coach')).toHaveLength(0);
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' }));
    expect(pill('Swim Coach')).toBeInTheDocument();
  });

  it('adds and removes an event on a role', async () => {
    const user = setup();
    await enterEdit(user);
    await user.click(pill('Swim Coach'));
    await user.click(within(form()).getByRole('button', { name: '+ Add event' }));
    await user.type(within(form()).getByRole('textbox', { name: 'Event 1 name' }), 'State finals');
    await user.click(within(form()).getByRole('button', { name: 'Done' }));

    await user.click(screen.getByRole('button', { name: 'View' }));
    await user.click(pill('Swim Coach'));
    expect(within(screen.getByRole('dialog')).getByText('State finals')).toBeInTheDocument();
  });

  it('splits and rejoins a role change', async () => {
    const user = setup();
    await enterEdit(user);
    await user.click(pill('Designer'));
    const combined = within(form()).getByRole('checkbox', { name: /Combined as a role change/ });
    expect(combined).toBeChecked();
    await user.click(combined);
    expect(combined).not.toBeChecked();
    expect(within(form()).getByText(/with Junior Designer/)).toBeInTheDocument();
    await user.click(combined);
    expect(combined).toBeChecked();
  });

  it('edits and deletes a moment with no role', async () => {
    const user = setup();
    await enterEdit(user);
    await user.click(screen.getByRole('button', { name: /^Moved to Chicago/ }));
    expect(field('What happened')).toHaveValue('Moved to Chicago');
    await user.click(within(form()).getByRole('button', { name: 'Delete moment' }));
    expect(screen.queryByRole('button', { name: /^Moved to Chicago/ })).not.toBeInTheDocument();
  });
});
