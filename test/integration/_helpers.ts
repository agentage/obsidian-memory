import { bootPlugin, signIn, type BootOptions, type Handles } from '../fakes/boot';

// Shared scenario setup for the assembled-plugin integration tests. Boots the plugin against
// the fakes and signs in so a test starts at "ready to sync".

export const MEMORY = 'work';

/** Boot + advertise one memory named MEMORY. */
export async function bootReady(opts: BootOptions = {}): Promise<Handles> {
  return bootPlugin({
    memories: [{ name: MEMORY, entries: 0, folderCount: 0, updated: null }],
    ...opts,
  });
}

/** Boot -> sign in -> select MEMORY. Returns a plugin sitting at "ready", first sync not yet run. */
export async function bootSignedIn(opts: BootOptions = {}): Promise<Handles> {
  const h = await bootReady(opts);
  await signIn(h);
  await h.plugin.selectVault(MEMORY);
  return h;
}

// The private status field that drives the dot tone (idle/syncing -> green, error/conflict ->
// red). The dot itself is a headless chainable no-op, so a test reads the state that computes it.
export function syncStateOf(h: Handles): string {
  return (h.plugin as unknown as { syncState: string }).syncState;
}

export { signIn, type Handles };
