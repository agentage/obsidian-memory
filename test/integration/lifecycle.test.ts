import { describe, it, expect, afterEach, vi } from 'vitest';
import { obsidianMockFactory } from '../fakes/obsidian';
vi.mock('obsidian', () => obsidianMockFactory());

import { bootReady, signIn, syncStateOf, MEMORY, type Handles } from './_helpers';

// The connect flow: discovery -> DCR -> authorize -> token exchange, dot goes green.

describe('account lifecycle', () => {
  let h: Handles;
  afterEach(async () => h.teardown());

  it('connect flow: discovery -> DCR -> authorize -> token exchange, dot goes green', async () => {
    h = await bootReady();
    expect(h.plugin.isSignedIn()).toBe(false); // gray dot at boot

    await signIn(h); // discovery + register + authorize + code->token, all through the router
    expect(h.plugin.isSignedIn()).toBe(true);

    // The connect flow touched each OAuth step exactly as the AS contract expects.
    const hit = (frag: string): boolean => h.router.calls.some((c) => c.url.includes(frag));
    expect(hit('/.well-known/oauth-authorization-server')).toBe(true); // discovery
    expect(hit('/register')).toBe(true); // DCR
    expect(hit('/token')).toBe(true); // code exchange

    // With a memory selected the dot is ready (green): signed in, no error, memory chosen.
    await h.plugin.selectVault(MEMORY);
    expect(syncStateOf(h)).not.toBe('error');
    expect(h.plugin.currentVault()).toBe(MEMORY);
  });
});
