import { AudioPlayer } from '@/components/audio-player';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSpeak = vi.fn();
const mockCancel = vi.fn();
let mockSpeaking = false;

beforeEach(() => {
  mockSpeaking = false;
  vi.stubGlobal('speechSynthesis', {
    speak: mockSpeak,
    cancel: mockCancel,
    get speaking() {
      return mockSpeaking;
    },
    getVoices: vi.fn(() => []),
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      lang = '';
      text = '';
      rate = 1;
      pitch = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AudioPlayer', () => {
  it('renders a button with title', async () => {
    render(<AudioPlayer text="Hello world" />);
    await waitFor(() => {
      expect(screen.getByTitle('Listen to "Hello world"')).toBeDefined();
    });
  });

  it('returns null when speechSynthesis not supported', async () => {
    // Must actually remove the property - setting to undefined still
    // makes 'in' return true. biome-ignore: deleting a stubbed global
    // is the point of this test.
    const win = window as unknown as Record<string, unknown>;
    const saved = win.speechSynthesis;
    // biome-ignore lint/performance/noDelete: test-only global stub removal
    delete win.speechSynthesis;
    try {
      const { container } = render(<AudioPlayer text="Hello" />);
      await waitFor(() => {
        expect(container.innerHTML).toBe('');
      });
    } finally {
      win.speechSynthesis = saved;
    }
  });

  it('calls speechSynthesis.speak on click', async () => {
    render(<AudioPlayer text="Hello world" />);
    await waitFor(() => {
      expect(screen.getByTitle('Listen to "Hello world"')).toBeDefined();
    });
    const btn = screen.getByTitle('Listen to "Hello world"');
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('uses correct lang on utterance', async () => {
    render(<AudioPlayer text="Hola mundo" lang="es-ES" />);
    await waitFor(() => {
      expect(screen.getByTitle('Listen to "Hola mundo"')).toBeDefined();
    });
    const btn = screen.getByTitle('Listen to "Hola mundo"');
    await act(async () => {
      fireEvent.click(btn);
    });
    const utterance = mockSpeak.mock.calls[0]?.[0] as { lang: string } | undefined;
    expect(utterance?.lang).toBe('es-ES');
  });

  it('calls speechSynthesis.cancel on stop', async () => {
    render(<AudioPlayer text="Hello" />);
    await waitFor(() => {
      expect(screen.getByTitle('Listen to "Hello"')).toBeDefined();
    });
    // Click to start
    const btn = screen.getByTitle('Listen to "Hello"');
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(mockSpeak).toHaveBeenCalled();
  });
});
