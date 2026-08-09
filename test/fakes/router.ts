import type { RequestUrlParam, RequestUrlResponse } from 'obsidian';
import { FakeAuthServer } from './fake-auth-server';

// The single requestUrl seam: every HTTP call the assembled plugin makes goes through here.
// Dispatch by host to the right fake (sync. discovery, auth. AS, api. memories). Counts calls
// so a test can assert "re-sync is zero-HTTP".

export interface RouterOptions {
  fqdn: string; // active site fqdn, e.g. 'test.local'
  auth: FakeAuthServer;
}

export class Router {
  calls: Array<{ method: string; url: string }> = [];
  private opts: RouterOptions;

  constructor(opts: RouterOptions) {
    this.opts = opts;
  }

  get syncOrigin(): string {
    return `https://sync.${this.opts.fqdn}`;
  }
  get authOrigin(): string {
    return `https://auth.${this.opts.fqdn}`;
  }
  get apiOrigin(): string {
    return `https://api.${this.opts.fqdn}`;
  }

  callCount(): number {
    return this.calls.length;
  }
  reset(): void {
    this.calls = [];
  }

  private reply(status: number, json: unknown): RequestUrlResponse {
    const text = JSON.stringify(json);
    return {
      status,
      headers: {},
      arrayBuffer: new ArrayBuffer(0),
      json,
      text,
    } as unknown as RequestUrlResponse;
  }

  // The resolution (GET sync.<fqdn>/.well-known/agentage-sync): git_endpoint is the sync host.
  private resolution(): unknown {
    return {
      git_endpoint: `https://sync.${this.opts.fqdn}`,
      region: 'default',
      ttl: 3600,
    };
  }

  /** The vi.mock('obsidian').requestUrl implementation. */
  requestUrl = async (param: RequestUrlParam | string): Promise<RequestUrlResponse> => {
    const p = typeof param === 'string' ? { url: param } : param;
    const method = p.method ?? 'GET';
    const url = p.url;
    const body = typeof p.body === 'string' ? p.body : undefined;
    this.calls.push({ method, url });
    const host = new URL(url).host;

    if (host === new URL(this.syncOrigin).host) return this.reply(200, this.resolution());

    if (host === new URL(this.apiOrigin).host) {
      if (url.includes('/api/memories'))
        return method === 'POST'
          ? this.replyAuth(this.opts.auth.createMemory(body))
          : this.replyAuth(this.opts.auth.listMemories());
      return this.reply(404, { error: 'not_found' });
    }

    if (host === new URL(this.authOrigin).host)
      return this.replyAuth(this.opts.auth.handle(method, url, body));

    return this.reply(404, { error: `no fake for host ${host}` });
  };

  private replyAuth(r: { status: number; json: unknown }): RequestUrlResponse {
    return this.reply(r.status, r.json);
  }
}
