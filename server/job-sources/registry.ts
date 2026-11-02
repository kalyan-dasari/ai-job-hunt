import { JobSourceAdapter, JobSourceId } from './types.ts';
import { JSearchAdapter } from './sources/jsearch-adapter.ts';
import { AdzunaAdapter } from './sources/adzuna-adapter.ts';
import { CareerPagesAdapter } from './sources/career-pages.ts';
import { NaukriAdapter } from './sources/naukri-adapter.ts';
import { LinkedInAdapter } from './sources/linkedin-adapter.ts';
import { InternshalaAdapter } from './sources/internshala-adapter.ts';
import { FounditAdapter } from './sources/foundit-adapter.ts';
import { apiUsageRepository } from '../database.ts';

export class SourceAdapterRegistry {
  private adapters: Map<string, JobSourceAdapter> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 3 Primary Dossier Channels
    this.register(new JSearchAdapter());
    this.register(new AdzunaAdapter());
    this.register(new CareerPagesAdapter());

    // Preserved Fallback Adapters
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

  public getPrimaryAdapters(): JobSourceAdapter[] {
    const primaryIds = ['jsearch-api', 'adzuna-api', 'career-pages-public'];
    return primaryIds.map((id) => this.get(id)).filter(Boolean) as JobSourceAdapter[];
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
    let usage = undefined;
    if (adapter.id === 'jsearch-api') {
      usage = apiUsageRepository.getUsage('jsearch', 200);
    } else if (adapter.id === 'adzuna-api') {
      usage = apiUsageRepository.getUsage('adzuna', 250);
    } else if (adapter.id === 'career-pages-public') {
      usage = apiUsageRepository.getUsage('career-pages', 5000);
    }

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
      usage,
    };
  }

  public getAllMetadata() {
    return this.getAll().map((a) => this.getMetadata(a));
  }

  public getPrimaryMetadata() {
    return this.getPrimaryAdapters().map((a) => this.getMetadata(a));
  }
}

export const sourceRegistry = new SourceAdapterRegistry();

