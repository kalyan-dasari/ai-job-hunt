import { AtsAdapter } from './types.ts';
import { GreenhouseAtsAdapter } from './greenhouse.ts';
import { LeverAtsAdapter } from './lever.ts';
import { AshbyAtsAdapter } from './ashby.ts';
import { WorkableAtsAdapter } from './workable.ts';
import { SmartRecruitersAtsAdapter } from './smartrecruiters.ts';
import { RecruiteeAtsAdapter } from './recruitee.ts';
import { PersonioAtsAdapter } from './personio.ts';
import { BreezyAtsAdapter } from './breezy.ts';
import { TeamtailorAtsAdapter } from './teamtailor.ts';
import { RipplingAtsAdapter } from './rippling.ts';
import { WorkdayAtsAdapter } from './workday.ts';

export * from './types.ts';
export * from './greenhouse.ts';
export * from './lever.ts';
export * from './ashby.ts';
export * from './workable.ts';
export * from './smartrecruiters.ts';
export * from './recruitee.ts';
export * from './personio.ts';
export * from './breezy.ts';
export * from './teamtailor.ts';
export * from './rippling.ts';
export * from './workday.ts';

const adapters = new Map<string, AtsAdapter>();

function register(adapter: AtsAdapter) {
  adapters.set(adapter.provider.toLowerCase(), adapter);
}

// Register all 11 ATS adapters
register(new GreenhouseAtsAdapter());
register(new LeverAtsAdapter());
register(new AshbyAtsAdapter());
register(new WorkableAtsAdapter());
register(new SmartRecruitersAtsAdapter());
register(new RecruiteeAtsAdapter());
register(new PersonioAtsAdapter());
register(new BreezyAtsAdapter());
register(new TeamtailorAtsAdapter());
register(new RipplingAtsAdapter());
register(new WorkdayAtsAdapter());

export function getAtsAdapter(provider: string): AtsAdapter | undefined {
  if (!provider) return undefined;
  return adapters.get(provider.toLowerCase());
}

export function getAllAtsAdapters(): AtsAdapter[] {
  return Array.from(adapters.values());
}
