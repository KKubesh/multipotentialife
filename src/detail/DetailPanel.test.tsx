import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { App } from '../App';
import { sampleDoc } from '../data/sample';
import { TimelineProvider } from '../data/store';

// jsdom has no layout: give the timeline a width and a no-op ResizeObserver so it draws.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 1200 });
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function setup() {
  render(
    <TimelineProvider initial={{ doc: sampleDoc(), source: 'saved', warnings: [] }}>
      <App />
    </TimelineProvider>,
  );
  return userEvent.setup();
}

const pill = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title} ·`) });

describe('role detail', () => {
  it('opens when a role is tapped and shows everything about it', async () => {
    const user = setup();
    await user.click(pill('Senior Frontend Developer'));

    const panel = screen.getByRole('dialog', { name: 'Senior Frontend Developer' });
    expect(within(panel).getByText('Brightline')).toBeInTheDocument();
    expect(within(panel).getByText(/Role change · after Frontend Developer/)).toBeInTheDocument();
    expect(within(panel).getByText(/With Mentorship Lead alongside/)).toBeInTheDocument();
    expect(within(panel).getByText('Launched component library')).toBeInTheDocument();
    expect(pill('Senior Frontend Developer')).toHaveAttribute('aria-pressed', 'true');
    expect(pill('Designer')).toHaveClass('dim');
  });

  it('switches roles from a relation line, and closes with Escape', async () => {
    const user = setup();
    await user.click(pill('Senior Frontend Developer'));
    await user.click(screen.getByRole('button', { name: /after Frontend Developer/ }));
    expect(screen.getByRole('dialog', { name: 'Frontend Developer' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Focus goes back to what opened the panel.
    expect(pill('Senior Frontend Developer')).toHaveFocus();
  });

  it('closes on a tap outside, and opens from the keyboard', async () => {
    const user = setup();
    await user.click(pill('Swim Coach'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('heading', { name: /multipotential/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    pill('Board Member').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Board Member' })).toBeInTheDocument();
  });

  it('opens a role from its event dot and points out the event', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^Graduated ·/ }));
    const panel = screen.getByRole('dialog', { name: 'B.A. Graphic Design' });
    expect(within(panel).getByText('Graduated').closest('li')).toHaveClass('highlight');
  });

  it('shows an event with no role', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^Moved to Chicago/ }));
    expect(screen.getByRole('dialog', { name: 'Moved to Chicago' })).toBeInTheDocument();
  });
});
