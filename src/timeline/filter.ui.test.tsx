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
const key = () => screen.getByRole('list', { name: 'Threads' });
const chip = (name: string) => within(key()).getByRole('button', { name });
const has = (el: HTMLElement, cls: string) => el.classList.contains(cls);
// The sample's Coaching roles.
const COACHING = ['Swim Coach', 'Senior Frontend Developer', 'Mentorship Lead', 'Board Member'];

describe('thread filter', () => {
  it('lights up the picked thread’s roles and fades the rest', async () => {
    const user = setup();
    await user.click(chip('Coaching'));
    expect(chip('Coaching')).toHaveAttribute('aria-pressed', 'true');
    expect(has(chip('Design'), 'faded')).toBe(true);
    for (const title of COACHING) expect(has(pill(title), 'lit')).toBe(true);
    expect(has(pill('Product Designer'), 'dim')).toBe(true);
    expect(has(pill('Product Designer'), 'lit')).toBe(false);
  });

  it('clears when the chip is tapped again, on Escape, or on a tap elsewhere', async () => {
    const user = setup();
    await user.click(chip('Coaching'));
    await user.click(chip('Coaching'));
    expect(has(pill('Swim Coach'), 'lit')).toBe(false);

    await user.click(chip('Coaching'));
    await user.keyboard('{Escape}');
    expect(has(pill('Swim Coach'), 'lit')).toBe(false);

    await user.click(chip('Coaching'));
    await user.click(screen.getByRole('heading', { name: /multipotential/ }));
    expect(has(pill('Swim Coach'), 'lit')).toBe(false);
  });

  it('stays on while switching palette or titles', async () => {
    const user = setup();
    await user.click(chip('Coaching'));
    await user.click(screen.getByRole('checkbox', { name: 'Titles' }));
    await user.click(screen.getByRole('button', { name: 'Earth' }));
    expect(has(pill('Swim Coach'), 'lit')).toBe(true);
  });

  it('opening one of its roles keeps the filter and steps the others back', async () => {
    const user = setup();
    await user.click(chip('Coaching'));
    await user.click(pill('Board Member'));
    expect(screen.getByRole('dialog', { name: 'Board Member' })).toBeInTheDocument();
    expect(has(pill('Board Member'), 'selected')).toBe(true);
    expect(has(pill('Board Member'), 'lit')).toBe(true);
    expect(has(pill('Swim Coach'), 'soft')).toBe(true);
    expect(has(pill('Swim Coach'), 'lit')).toBe(true);
    expect(has(pill('Product Designer'), 'dim')).toBe(true);
  });

  it('opening a role without the thread turns the filter off', async () => {
    const user = setup();
    await user.click(chip('Coaching'));
    await user.click(pill('Product Designer'));
    expect(screen.getByRole('dialog', { name: 'Product Designer' })).toBeInTheDocument();
    expect(chip('Coaching')).toHaveAttribute('aria-pressed', 'false');
    expect(has(pill('Swim Coach'), 'lit')).toBe(false);
  });

  it('picking a thread the open role doesn’t have closes it', async () => {
    const user = setup();
    await user.click(pill('Product Designer'));
    await user.click(chip('Coaching'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(has(pill('Swim Coach'), 'lit')).toBe(true);
  });

  it('picking a thread the open role has keeps it open', async () => {
    const user = setup();
    await user.click(pill('Board Member'));
    await user.click(chip('Coaching'));
    expect(screen.getByRole('dialog', { name: 'Board Member' })).toBeInTheDocument();
    expect(has(pill('Swim Coach'), 'soft')).toBe(true);
  });

  it('a tap elsewhere closes the open role and clears the filter together', async () => {
    const user = setup();
    await user.click(chip('Coaching'));
    await user.click(pill('Board Member'));
    await user.click(screen.getByRole('heading', { name: /multipotential/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(has(pill('Board Member'), 'lit')).toBe(false);
  });

  it('steps aside while coloring', async () => {
    const user = setup();
    await user.click(chip('Coaching'));
    await user.click(screen.getByRole('button', { name: 'Color' }));
    expect(screen.queryByRole('list', { name: 'Threads' })).not.toBeInTheDocument();
    expect(has(pill('Product Designer'), 'dim')).toBe(false);
  });
});
