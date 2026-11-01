import { JobSourceAdapter, JobSourceId } from './types.ts';
import { CareerPagesAdapter } from './sources/career-pages.ts';
import { NaukriAdapter } from './sources/naukri-adapter.ts';
import { LinkedInAdapter } from './sources/linkedin-adapter.ts';
import { InternshalaAdapter } from './sources/internshala-adapter.ts';
import { FounditAdapter } from './sources/foundit-adapter.ts';

export class SourceAdapterRegistry {
  private adapters: Map<string, JobSourceAdapter> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register(new CareerPagesAdapter());
    this.register(new NaukriAdapter());
    this.register(new LinkedInAdapter());
    this.register(new InternshalaAdapter());
    this.register(new FounditAdapter());
  }

  public register(adapter: JobSourceAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public get(id: string): JobSourceAdapter | undefined {
    return this.adapters.get(id);
  }

  public getBySource(source: JobSourceId): JobSourceAdapter | undefined {
    for (const adapter of this.adapters.values()) {
      if (adapter.source === source) {
        return adapter;
      }
    }
    return undefined;
  }

  public getAll(): JobSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getActive(): JobSourceAdapter[] {
    return this.getAll().filter((a) => a.status === 'Active' || a.status === 'Configured');
  }

  public async testConnection(id: string): Promise<{ success: boolean; message: string; details?: any }> {
    const adapter = this.get(id);
    if (!adapter) {
      return {
        success: false,
        message: `Unknown source adapter: ${id}`,
      };
    }
    return await adapter.testConnection();
  }

  public getMetadata(adapter: JobSourceAdapter) {
    return {
      id: adapter.id,
      source: adapter.source,
      displayName: adapter.displayName,
      description: adapter.description,
      status: adapter.status,
      capabilities: adapter.capabilities,
      lastChecked: adapter.lastChecked,
      activeJobsCount: adapter.activeJobsCount || 0,
      isConfigured: adapter.isConfigured(),
    };
  }

  public getAllMetadata() {
    return this.getAll().map((a) => this.getMetadata(a));
  }
}

export const sourceRegistry = new SourceAdapterRegistry();

