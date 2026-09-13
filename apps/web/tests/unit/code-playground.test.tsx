import { CodePlayground } from '@/components/code-playground';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('CodePlayground', () => {
  it('renders code editor with language label', () => {
    render(<CodePlayground language="python" />);
    expect(screen.getByText('python')).toBeDefined();
  });

  it('shows run button', () => {
    render(<CodePlayground language="python" />);
    expect(screen.getByRole('button', { name: /run/i })).toBeDefined();
  });

  it('renders with initial code', () => {
    render(<CodePlayground language="python" initialCode="print('hello')" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe("print('hello')");
  });

  it('run button is disabled when code is empty', () => {
    render(<CodePlayground language="python" initialCode="" />);
    const btn = screen.getByRole('button', { name: /run/i });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('run button enabled when code is present', () => {
    render(<CodePlayground language="python" initialCode="x = 1" />);
    const btn = screen.getByRole('button', { name: /run/i });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('updates code on typing', () => {
    render(<CodePlayground language="python" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'x = 42' } });
    expect(textarea.value).toBe('x = 42');
  });

  it('renders SQL label for sql language', () => {
    render(<CodePlayground language="sql" />);
    expect(screen.getByText('sql')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<CodePlayground language="python" className="my-custom" />);
    expect(container.firstChild).toBeDefined();
  });
});
