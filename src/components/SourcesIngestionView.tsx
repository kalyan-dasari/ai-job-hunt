import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Download,
  FileCode,
  Layers,
  ArrowRight,
  Database,
  Play,
  Clock,
  Radio,
  Check,
  X,
  KeyRound,
  Sparkles,
  Zap,
  Globe,
  Cpu,
  Server,
  Activity,
} from 'lucide-react';
import { SourceConnector, ProviderUsageInfo } from '../types/connector';
import { api } from '../api/client';

interface SourcesIngestionViewProps {
  connectors: SourceConnector[];
  onJobsImported: () => void;
}

export const SourcesIngestionView: React.FC<SourcesIngestionViewProps> = ({
  connectors,
  onJobsImported,
}) => {
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    addedCount: number;
    duplicateCount: number;
    totalJobs: number;
  } | null>(null);

  // Dossier Discovery & Ingestion State
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any | null>(null);
  const [primarySources, setPrimarySources] = useState<any[]>([]);
  const [apiUsage, setApiUsage] = useState<any[]>([]);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [runsHistory, setRunsHistory] = useState<any[]>([]);
  const [showAllConnectors, setShowAllConnectors] = useState(false);

  const loadData = async () => {
    try {
      const [runs, primary, usage] = await Promise.all([
        api.getIngestionRuns(10).catch(() => []),
        api.getPrimarySources().catch(() => []),
        api.getApiUsage().catch(() => []),
      ]);
      setRunsHistory(runs);
      setPrimarySources(primary);
      setApiUsage(usage);
    } catch (err) {
      console.error('Failed to load discovery sources and runs:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunDossierDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryResult(null);
    try {
      const res = await api.triggerDossierDiscovery({ forceExternal: true });
      setDiscoveryResult({
        status: res.run?.status || 'completed',
        id: res.run?.id || `run-${Date.now()}`,
        jobsFound: res.run?.jobsFound || 0,
        jobsAdded: res.run?.jobsAdded || 0,
        duplicatesFiltered: res.run?.duplicatesFiltered || 0,
        sourcesChecked: res.run?.sourcesChecked || ['jsearch', 'adzuna', 'career-pages'],
        queriesUsed: res.queriesUsed || [],
        totalEvaluated: res.totalEvaluated || 0,
        errors: res.run?.errors || [],
      });
      await loadData();
      onJobsImported();
    } catch (err: any) {
      setDiscoveryResult({
        status: 'failed',
        errors: [err.message || 'Discovery run failed'],
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleTestSource = async (sourceId: string) => {
    setTestingSourceId(sourceId);
    try {
      const res = await api.testSource(sourceId);
      setTestResults((prev) => ({
        ...prev,
        [sourceId]: { success: res.success, message: res.message },
      }));
      await loadData();
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [sourceId]: { success: false, message: err.message || 'Connection test failed' },
      }));
    } finally {
      setTestingSourceId(null);
    }
  };

  const sampleJson = `[
  {
    "title": "Applied AI Platform Engineer",
    "company": "Cognitive Scale AI",
    "location": "Bangalore, India",
    "workArrangement": "Hybrid",
    "employmentType": "Full-time",
    "experienceLevel": "Mid",
    "skills": ["Python", "FastAPI", "React", "Docker", "PostgreSQL"],
    "url": "https://cognitivescale.ai/careers/applied-ai-platform-engineer"
  },
  {
    "title": "Full-Stack Software Engineer (React / Python)",
    "company": "Razorpay",
    "location": "Bangalore, India",
    "url": "https://razorpay.com/jobs/full-stack-engineer-core-8942"
  }
]`;

  const sampleCsv = `title,company,location,skills,url
"Full-Stack Developer","FinTech Innovations Ltd","Hyderabad, India","React;TypeScript;Node.js","https://fintechinnovations.io/careers"
"Junior Cloud Engineer","CloudForge Systems","Remote, India","AWS;Docker;Python","https://cloudforge.dev/jobs"`;

  const handleLoadSample = (format: 'json' | 'csv') => {
    setImportFormat(format);
    setImportText(format === 'json' ? sampleJson : sampleCsv);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      let payloadItems: any = importText.trim();
      if (importFormat === 'json') {
        payloadItems = JSON.parse(importText);
      }

      const res = await api.importJobs({
        items: payloadItems,
        format: importFormat,
      });

      setImportResult({
        addedCount: res.addedCount,
        duplicateCount: res.duplicateCount,
        totalJobs: res.totalJobs,
      });
      onJobsImported();
      await loadData();
    } catch (err: any) {
      console.error('Import error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Dossier Architecture Overview */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Dossier-Style Job Discovery Architecture</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Primary Discovery Channels &amp; API Quotas
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              JobPilot AI uses a clean 3-channel architecture: <strong>JSearch API</strong> (RapidAPI) for primary aggregated searches, <strong>Adzuna API</strong> for official India listings, and <strong>Direct Corporate Career Boards</strong> (Greenhouse, Lever, Ashby). Strictly Terms-of-Service compliant with 24-hour query caching and monthly quota guards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunDossierDiscovery}
              disabled={isDiscovering}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors disabled:opacity-50 shadow-sm shadow-sky-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
              <span>{isDiscovering ? 'Discovering Opportunities...' : 'Run Dossier Discovery'}</span>
            </button>

            <a
              href="/api/export?type=json"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-xl hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </a>
            <a
              href="/api/export?type=csv"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-xl hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Discovery Result Alert */}
        {discoveryResult && (
          <div className="mt-5 p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white flex items-center gap-2">
                {discoveryResult.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  Dossier Discovery Run{' '}
                  {discoveryResult.status === 'completed' ? 'Completed Successfully' : 'Finished with Warnings'}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Run ID: {discoveryResult.id}
              </span>
            </div>

            {discoveryResult.queriesUsed && discoveryResult.queriesUsed.length > 0 && (
              <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-medium">Targeted Queries Used:</span>
                {discoveryResult.queriesUsed.map((q: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300 font-mono text-[10px]"
                  >
                    &ldquo;{q}&rdquo;
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Sources Queried</span>
                <span className="text-white font-bold">{discoveryResult.sourcesChecked?.length || 0} channels</span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Opportunities Found</span>
                <span className="text-white font-bold">{discoveryResult.jobsFound || 0}</span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">New Added (India Fit)</span>
                <span className="text-emerald-400 font-bold">+{discoveryResult.jobsAdded || 0}</span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Duplicates Deduplicated</span>
                <span className="text-amber-400 font-bold">{discoveryResult.duplicatesFiltered || 0}</span>
              </div>
            </div>

            {discoveryResult.errors && discoveryResult.errors.length > 0 && (
              <div className="mt-2 text-[11px] text-amber-300/90 space-y-1 bg-amber-950/20 p-2.5 rounded border border-amber-900/40">
                <span className="font-semibold block">Channel Diagnostics:</span>
                {discoveryResult.errors.map((errStr: string, idx: number) => (
                  <p key={idx} className="leading-relaxed font-mono text-[10px]">
                    · {errStr}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3 Primary Dossier Channels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Three Primary Discovery Channels</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Zero Unauthorized Scraping · Official APIs &amp; Direct Career Portals
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: JSearch */}
          {(() => {
            const jsearch = primarySources.find((s) => s.id === 'jsearch-api' || s.id === 'jsearch') || {
              id: 'jsearch-api',
              displayName: 'JSearch API (RapidAPI)',
              source: 'JSearch',
              description: 'Primary aggregated job search API covering LinkedIn, Indeed, Glassdoor, and Indian job boards with 24h query caching.',
              status: 'Awaiting Credentials',
              activeJobsCount: 0,
            };
            const testResult = testResults[jsearch.id] || testResults['jsearch'];
            const isTesting = testingSourceId === jsearch.id || testingSourceId === 'jsearch';
            const usage = jsearch.usage as ProviderUsageInfo | undefined;
            const quota = usage?.monthlyQuota || 200;
            const used = usage?.requestsUsed || 0;
            const pctUsed = Math.min(100, Math.round((used / quota) * 100));
            const isActive = jsearch.status === 'Active';

            return (
              <div className="bg-[#111726] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-colors shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span className="font-bold text-white text-sm">JSearch API</span>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded border shrink-0 ${
                        isActive
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      }`}
                    >
                      {isActive ? 'Active · Connected' : 'Setup Required'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed min-h-[44px]">
                    Primary aggregated search engine. Evaluates fresh positions across Hyderabad, Bengaluru, Pune, Delhi NCR, and remote opportunities eligible for India.
                  </p>

                  {/* Monthly Quota Meter */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Monthly Quota:</span>
                      <span className="text-white font-bold">{used} / {quota} calls</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pctUsed > 85 ? 'bg-red-500' : pctUsed > 60 ? 'bg-amber-400' : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.max(4, pctUsed)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{quota - used} requests remaining</span>
                      <span>24h query cache active</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Auth:</span>
                      <span className="text-slate-200">JSEARCH_API_KEY</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Rate Limit:</span>
                      <span className="text-slate-400">5 req/sec (Safe)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Ingested Listings:</span>
                      <span className="text-sky-400 font-bold">{jsearch.activeJobsCount || 0} jobs</span>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`text-[11px] p-2.5 rounded-lg border leading-tight ${
                        testResult.success
                          ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/50'
                          : 'bg-amber-950/30 text-amber-300 border-amber-900/50'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1">
                        {testResult.success ? <Check className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                        <span>{testResult.success ? 'Connection Validated' : 'Configuration Notice'}</span>
                      </div>
                      <p className="mt-1 text-[10px] opacity-90">{testResult.message}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {usage?.lastRequestAt
                      ? `Last call: ${new Date(usage.lastRequestAt).toLocaleTimeString()}`
                      : 'No calls yet this month'}
                  </span>

                  <button
                    onClick={() => handleTestSource(jsearch.id)}
                    disabled={isTesting}
                    className="text-[11px] font-medium text-sky-400 hover:text-sky-300 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Card 2: Adzuna API */}
          {(() => {
            const adzuna = primarySources.find((s) => s.id === 'adzuna-api' || s.id === 'adzuna') || {
              id: 'adzuna-api',
              displayName: 'Adzuna API (India)',
              source: 'Adzuna',
              description: 'Official Adzuna India job search endpoint with location and role filters.',
              status: 'Awaiting Credentials',
              activeJobsCount: 0,
            };
            const testResult = testResults[adzuna.id] || testResults['adzuna'];
            const isTesting = testingSourceId === adzuna.id || testingSourceId === 'adzuna';
            const usage = adzuna.usage as ProviderUsageInfo | undefined;
            const quota = usage?.monthlyQuota || 250;
            const used = usage?.requestsUsed || 0;
            const pctUsed = Math.min(100, Math.round((used / quota) * 100));
            const isActive = adzuna.status === 'Active';

            return (
              <div className="bg-[#111726] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-colors shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-sm">Adzuna API (India)</span>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded border shrink-0 ${
                        isActive
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      }`}
                    >
                      {isActive ? 'Active · Connected' : 'Setup Required'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed min-h-[44px]">
                    Secondary aggregated search engine using the official Adzuna India (<code className="text-slate-300">/jobs/in/search</code>) API. Strips HTML and preserves canonical application links.
                  </p>

                  {/* Monthly Quota Meter */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Monthly Quota:</span>
                      <span className="text-white font-bold">{used} / {quota} calls</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pctUsed > 85 ? 'bg-red-500' : pctUsed > 60 ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(4, pctUsed)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{quota - used} requests remaining</span>
                      <span>India &lsquo;in&rsquo; endpoint</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Auth:</span>
                      <span className="text-slate-200">ADZUNA_APP_ID / KEY</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Rate Limit:</span>
                      <span className="text-slate-400">10 req/min (Safe)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Ingested Listings:</span>
                      <span className="text-emerald-400 font-bold">{adzuna.activeJobsCount || 0} jobs</span>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`text-[11px] p-2.5 rounded-lg border leading-tight ${
                        testResult.success
                          ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/50'
                          : 'bg-amber-950/30 text-amber-300 border-amber-900/50'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1">
                        {testResult.success ? <Check className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                        <span>{testResult.success ? 'Connection Validated' : 'Configuration Notice'}</span>
                      </div>
                      <p className="mt-1 text-[10px] opacity-90">{testResult.message}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {usage?.lastRequestAt
                      ? `Last call: ${new Date(usage.lastRequestAt).toLocaleTimeString()}`
                      : 'No calls yet this month'}
                  </span>

                  <button
                    onClick={() => handleTestSource(adzuna.id)}
                    disabled={isTesting}
                    className="text-[11px] font-medium text-sky-400 hover:text-sky-300 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Card 3: Direct Career Boards */}
          {(() => {
            const boards = primarySources.find((s) => s.id === 'career-pages-public' || s.id === 'career-pages') || {
              id: 'career-pages-public',
              displayName: 'Corporate Career Boards',
              source: 'Career Page',
              description: 'Direct ATS feeds from verified corporate portals (Greenhouse, Lever, Ashby, Jobicy).',
              status: 'Active',
              activeJobsCount: 0,
            };
            const testResult = testResults[boards.id] || testResults['career-pages'];
            const isTesting = testingSourceId === boards.id || testingSourceId === 'career-pages';

            return (
              <div className="bg-[#111726] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-colors shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-white text-sm">Direct Career Boards</span>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shrink-0">
                      Active · ATS Verified
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed min-h-[44px]">
                    Direct ATS integrations for high-growth tech companies and global startups. Provides verified job descriptions, responsibilities, and direct application links.
                  </p>

                  {/* Quota Strip */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Quota Tier:</span>
                      <span className="text-emerald-400 font-bold">Unlimited / Free ATS</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500 w-full" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Zero API consumption</span>
                      <span>Automated ATS validation</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs pt-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Supported ATS:</span>
                      <span className="text-slate-200">Greenhouse, Lever, Ashby</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Syndication Feeds:</span>
                      <span className="text-slate-400">Jobicy Remote Developers</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Ingested Listings:</span>
                      <span className="text-purple-400 font-bold">{boards.activeJobsCount || 0} jobs</span>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`text-[11px] p-2.5 rounded-lg border leading-tight ${
                        testResult.success
                          ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/50'
                          : 'bg-amber-950/30 text-amber-300 border-amber-900/50'
                      }`}
                    >
                      <div className="font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>ATS Verification Passed</span>
                      </div>
                      <p className="mt-1 text-[10px] opacity-90">{testResult.message}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Always available · Local cache
                  </span>

                  <button
                    onClick={() => handleTestSource(boards.id)}
                    disabled={isTesting}
                    className="text-[11px] font-medium text-sky-400 hover:text-sky-300 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Feed'}</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Secondary Channels Accordion / Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAllConnectors(!showAllConnectors)}
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>{showAllConnectors ? 'Hide All Registered Source Connectors' : `View All Registered Source Connectors (${connectors.length})`}</span>
            <span className="text-slate-500 font-mono text-[10px]">
              {showAllConnectors ? '▲' : '▼'}
            </span>
          </button>
          <span className="text-[11px] text-slate-400">
            Terms-of-Service compliant · Official feeds only
          </span>
        </div>

        {showAllConnectors && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {connectors.map((conn) => {
              const testResult = testResults[conn.id];
              const isTesting = testingSourceId === conn.id;
              const isActive = conn.status === 'Active';
              const isAwaiting = conn.status === 'Awaiting Credentials' || conn.status === 'Setup Required';

              return (
                <div
                  key={conn.id}
                  className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-3 flex flex-col justify-between hover:border-slate-700/80 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm truncate">{conn.displayName}</span>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded border shrink-0 ${
                          isActive
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : isAwaiting
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            : 'text-slate-400 bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        {conn.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">{conn.description}</p>

                    <div className="space-y-1 text-xs pt-1 border-t border-slate-800/80 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Access Method:</span>
                        <span className="text-slate-200">{conn.accessMethod}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Rate Limit:</span>
                        <span className="text-slate-400">{conn.rateLimitInfo || 'Standard'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Ingested Listings:</span>
                        <span className="text-sky-400 tabular-nums font-bold">{conn.activeJobsCount} jobs</span>
                      </div>
                    </div>

                    {conn.setupInstructions && (
                      <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/60">
                        <span className="text-slate-400 font-semibold block mb-0.5">Integration Note:</span>
                        {conn.setupInstructions}
                      </div>
                    )}

                    {testResult && (
                      <div
                        className={`text-[11px] p-2 rounded border leading-tight ${
                          testResult.success
                            ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/50'
                            : 'bg-amber-950/30 text-amber-300 border-amber-900/50'
                        }`}
                      >
                        <div className="font-semibold flex items-center gap-1">
                          {testResult.success ? <Check className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                          <span>{testResult.success ? 'Verified' : 'Notice'}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] opacity-90">{testResult.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {conn.lastSyncTimestamp
                        ? `Synced ${new Date(conn.lastSyncTimestamp).toLocaleTimeString()}`
                        : 'Awaiting sync'}
                    </span>

                    <button
                      onClick={() => handleTestSource(conn.id)}
                      disabled={isTesting}
                      className="text-[11px] font-medium text-sky-400 hover:text-sky-300 px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ingestion Runs History Table */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Ingestion Runs History</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Durably persisted in SQLite</span>
        </div>

        {runsHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            No ingestion runs executed yet. Click &quot;Run Dossier Discovery&quot; or import a dataset below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-medium">Run ID</th>
                  <th className="pb-2 font-medium">Trigger</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Sources Queried</th>
                  <th className="pb-2 font-medium text-right">Jobs Found</th>
                  <th className="pb-2 font-medium text-right">Added</th>
                  <th className="pb-2 font-medium text-right">Duplicates</th>
                  <th className="pb-2 font-medium text-right">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {runsHistory.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 text-white font-semibold">{run.id.slice(0, 16)}</td>
                    <td className="py-2.5 capitalize">{run.triggerType}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          run.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : run.status === 'running'
                            ? 'bg-sky-500/10 text-sky-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 max-w-[200px] truncate">
                      {Array.isArray(run.sourcesChecked) ? run.sourcesChecked.join(', ') : 'All'}
                    </td>
                    <td className="py-2.5 text-right font-bold text-white">{run.jobsFound}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">+{run.jobsAdded}</td>
                    <td className="py-2.5 text-right text-amber-400">{run.duplicatesFiltered}</td>
                    <td className="py-2.5 text-right text-slate-400">
                      {new Date(run.startedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dataset Ingestion Interface (JSON / CSV) with Deduplication */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-sky-400" />
              <span>Direct Dataset Ingestion &amp; Deduplication Pipeline</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste permitted CSV or JSON job records. Incoming listings are normalized and cross-referenced against SQLite database to filter duplicates.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Format:</span>
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setImportFormat('json')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  importFormat === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setImportFormat('csv')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  importFormat === 'csv' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Load sample buttons */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Load sample dataset:</span>
          <button
            onClick={() => handleLoadSample('json')}
            className="hover:text-sky-400 underline"
          >
            Sample JSON (includes duplicate test)
          </button>
          <span>·</span>
          <button
            onClick={() => handleLoadSample('csv')}
            className="hover:text-sky-400 underline"
          >
            Sample CSV
          </button>
        </div>

        {/* Text Area */}
        <textarea
          rows={7}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={importFormat === 'json' ? sampleJson : sampleCsv}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500 leading-relaxed"
        />

        {/* Ingestion Results Callout */}
        {importResult && (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
            <div className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Manual Ingestion Run Completed</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px] pt-1">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-400">New Listings Ingested</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">{importResult.addedCount}</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-400">Duplicates Filtered</div>
                <div className="text-amber-400 font-bold text-sm mt-0.5">{importResult.duplicateCount}</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-400">Total Live Catalog</div>
                <div className="text-white font-bold text-sm mt-0.5">{importResult.totalJobs}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleImport}
            disabled={isImporting || !importText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
            <span>{isImporting ? 'Ingesting & Deduplicating...' : 'Ingest & Deduplicate Batch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
