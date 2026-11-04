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
  Building,
  Plus,
  Trash2,
  PlayCircle,
  PauseCircle,
  SearchCheck,
  Compass,
} from 'lucide-react';
import { SourceConnector, ProviderUsageInfo, CompanySource } from '../types/connector';
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

  // Company Sources State
  const [companies, setCompanies] = useState<CompanySource[]>([]);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyWebsite, setNewCompanyWebsite] = useState('');
  const [newCompanyCareers, setNewCompanyCareers] = useState('');
  const [newCompanyAts, setNewCompanyAts] = useState('generic');
  const [newCompanySlug, setNewCompanySlug] = useState('');
  const [isDetectingAts, setIsDetectingAts] = useState(false);
  const [detectFeedback, setDetectFeedback] = useState<string | null>(null);
  const [testingCompanyId, setTestingCompanyId] = useState<string | null>(null);
  const [companyTestResults, setCompanyTestResults] = useState<Record<string, { success: boolean; jobsFound: number; error?: string }>>({});

  const loadData = async () => {
    try {
      const [runs, usage, comps] = await Promise.all([
        api.getIngestionRuns(10).catch(() => []),
        api.getApiUsage().catch(() => []),
        api.getCompanies().catch(() => []),
      ]);
      setRunsHistory(runs);
      setApiUsage(usage);
      setCompanies(comps);
    } catch (err) {
      console.error('Failed to load discovery sources and runs:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunPublicDiscovery = async () => {
    setIsDiscovering(true);
    setDiscoveryResult(null);
    try {
      const res = await api.runDiscovery({ limitCompanies: 20 });
      setDiscoveryResult({
        status: res.run?.status || 'completed',
        id: res.run?.id || `run-${Date.now()}`,
        jobsFound: res.run?.jobsFound || 0,
        jobsAdded: res.run?.jobsAdded || 0,
        duplicatesFiltered: res.run?.duplicatesFiltered || 0,
        sourcesChecked: res.run?.sourcesChecked || [],
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

  // Auto-detect ATS from careers / website URL
  const handleDetectAts = async () => {
    const targetUrl = newCompanyCareers.trim() || newCompanyWebsite.trim();
    if (!targetUrl) {
      setDetectFeedback('Please enter a website or careers URL first.');
      return;
    }
    setIsDetectingAts(true);
    setDetectFeedback(null);
    try {
      const res = await api.detectAts(targetUrl);
      if (res.detectedAts) {
        setNewCompanyAts(res.detectedAts.provider);
        setNewCompanySlug(res.detectedAts.slug);
        setDetectFeedback(`Auto-detected: ${res.detectedAts.provider.toUpperCase()} (${res.detectedAts.slug})`);
      } else if (res.careersUrl) {
        setNewCompanyCareers(res.careersUrl);
        setDetectFeedback(`Discovered careers link: ${res.careersUrl}`);
      } else {
        setDetectFeedback('No ATS pattern found. Standard schema/JSON-LD crawl will be used.');
      }
    } catch (err: any) {
      setDetectFeedback(`Inspection error: ${err.message || 'Failed to inspect URL'}`);
    } finally {
      setIsDetectingAts(false);
    }
  };

  // Add new company source
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newCompanyWebsite.trim()) return;

    try {
      await api.addCompany({
        name: newCompanyName.trim(),
        websiteUrl: newCompanyWebsite.trim(),
        careersUrl: newCompanyCareers.trim() || undefined,
        atsProvider: newCompanyAts,
        atsSlug: newCompanySlug.trim() || undefined,
      });

      setNewCompanyName('');
      setNewCompanyWebsite('');
      setNewCompanyCareers('');
      setNewCompanyAts('generic');
      setNewCompanySlug('');
      setDetectFeedback(null);
      setIsAddingCompany(false);

      await loadData();
    } catch (err: any) {
      setDetectFeedback(`Error adding company: ${err.message}`);
    }
  };

  // Test crawl specific company
  const handleTestCompany = async (companyId: string) => {
    setTestingCompanyId(companyId);
    try {
      const res = await api.testCompany(companyId);
      setCompanyTestResults((prev) => ({
        ...prev,
        [companyId]: {
          success: res.success,
          jobsFound: res.jobsFound ?? (res.jobs ? res.jobs.length : 0),
          error: res.error,
        },
      }));
      await loadData();
    } catch (err: any) {
      setCompanyTestResults((prev) => ({
        ...prev,
        [companyId]: {
          success: false,
          jobsFound: 0,
          error: err.message || 'Crawl failed',
        },
      }));
    } finally {
      setTestingCompanyId(null);
    }
  };

  // Toggle company active/paused
  const handleToggleCompany = async (company: CompanySource) => {
    const nextStatus = company.status === 'active' ? 'paused' : 'active';
    try {
      await api.updateCompany(company.id, { status: nextStatus });
      await loadData();
    } catch (err: any) {
      console.error('Failed to update company status:', err);
    }
  };

  // Delete company
  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure you want to remove this company source?')) return;
    try {
      await api.deleteCompany(id);
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete company:', err);
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

  const activeCompaniesCount = companies.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Top Banner / Dossier Architecture Overview */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Web-First Job Discovery Engine (Dossier-Inspired)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Public Sources, Indian Startups &amp; ATS Discovery
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Finds real job postings across official company career boards, 11 public ATS platforms (Greenhouse, Lever, Ashby, Workable, etc.), and schema.org JobPosting feeds. <strong>₹0 operating cost and zero paid API requirement.</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunPublicDiscovery}
              disabled={isDiscovering}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors disabled:opacity-50 shadow-sm shadow-sky-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
              <span>{isDiscovering ? 'Crawling Public Sources...' : 'Run Public Discovery (₹0 Cost)'}</span>
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
                  Discovery Run{' '}
                  {discoveryResult.status === 'completed' ? 'Completed Successfully' : 'Finished with Warnings'}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Run ID: {discoveryResult.id}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Sources Crawled</span>
                <span className="text-white font-bold">{discoveryResult.sourcesChecked?.length || 0} targets</span>
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
                <span className="font-semibold block">Diagnostics:</span>
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

      {/* ---------------- SECTION 1: COMPANY CAREER SOURCES ---------------- */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">
                Company Career Sources ({companies.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Indian tech startups &amp; product leaders actively monitored ({activeCompaniesCount} active). Crawls direct ATS APIs and JSON-LD schemas with zero API fees.
            </p>
          </div>

          <button
            onClick={() => setIsAddingCompany(!isAddingCompany)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors shrink-0"
          >
            {isAddingCompany ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isAddingCompany ? 'Cancel' : 'Add Company'}</span>
          </button>
        </div>

        {/* Inline Add Company Form */}
        {isAddingCompany && (
          <form onSubmit={handleAddCompany} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Company Source</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy, Zerodha, CRED"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Website URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://company.com"
                  value={newCompanyWebsite}
                  onChange={(e) => setNewCompanyWebsite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Careers Page URL</label>
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    placeholder="https://company.com/careers"
                    value={newCompanyCareers}
                    onChange={(e) => setNewCompanyCareers(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleDetectAts}
                    disabled={isDetectingAts}
                    className="px-2.5 py-1.5 text-xs font-medium text-sky-400 bg-sky-950/40 border border-sky-800/60 rounded-lg hover:bg-sky-900/40 transition-colors disabled:opacity-50 shrink-0"
                    title="Auto-detect ATS and slug"
                  >
                    {isDetectingAts ? 'Scanning...' : 'Detect ATS'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">ATS Provider</label>
                <select
                  value={newCompanyAts}
                  onChange={(e) => setNewCompanyAts(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="generic">Generic / JSON-LD / HTML</option>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                  <option value="ashby">Ashby</option>
                  <option value="workable">Workable</option>
                  <option value="smartrecruiters">SmartRecruiters</option>
                  <option value="recruitee">Recruitee</option>
                  <option value="personio">Personio</option>
                  <option value="breezy">Breezy HR</option>
                  <option value="teamtailor">Teamtailor</option>
                  <option value="rippling">Rippling</option>
                  <option value="workday">Workday</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">ATS Slug / Account ID</label>
                <input
                  type="text"
                  placeholder="e.g. razorpay, cred, postman"
                  value={newCompanySlug}
                  onChange={(e) => setNewCompanySlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
                >
                  Save Company Source
                </button>
              </div>
            </div>

            {detectFeedback && (
              <p className="text-[11px] font-mono text-sky-400 pt-1">
                {detectFeedback}
              </p>
            )}
          </form>
        )}

        {/* Company Sources Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="pb-2.5 font-medium">Company</th>
                <th className="pb-2.5 font-medium">ATS Integration</th>
                <th className="pb-2.5 font-medium">Status</th>
                <th className="pb-2.5 font-medium">Last Crawl</th>
                <th className="pb-2.5 font-medium text-right">Jobs Found</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {companies.map((comp) => {
                const isTesting = testingCompanyId === comp.id;
                const testResult = companyTestResults[comp.id];

                return (
                  <tr key={comp.id} className="hover:bg-slate-900/40">
                    <td className="py-3">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{comp.name}</span>
                        <a
                          href={comp.careersUrl || comp.websiteUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-slate-500 hover:text-sky-400"
                          title="Open careers portal"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                        {comp.websiteUrl}
                      </div>
                    </td>

                    <td className="py-3 font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        <Server className="w-3 h-3 text-sky-400" />
                        <span>{comp.atsProvider ? comp.atsProvider.toUpperCase() : 'GENERIC'}</span>
                        {comp.atsSlug && <span className="text-slate-500">({comp.atsSlug})</span>}
                      </span>
                    </td>

                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border ${
                          comp.status === 'active'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-slate-400 bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        {comp.status === 'active' ? 'Active' : 'Paused'}
                      </span>
                    </td>

                    <td className="py-3 font-mono text-[11px] text-slate-400">
                      {comp.lastCrawledAt
                        ? new Date(comp.lastCrawledAt).toLocaleTimeString()
                        : 'Never'}
                    </td>

                    <td className="py-3 font-mono text-[11px] text-right text-emerald-400 font-bold">
                      {comp.jobsCount}
                    </td>

                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {testResult && (
                          <span
                            className={`text-[10px] font-mono mr-1.5 ${
                              testResult.success ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {testResult.success ? `${testResult.jobsFound} jobs` : 'Failed'}
                          </span>
                        )}

                        <button
                          onClick={() => handleTestCompany(comp.id)}
                          disabled={isTesting}
                          className="px-2 py-1 text-[11px] font-medium text-sky-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                          title="Test crawl now"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                        </button>

                        <button
                          onClick={() => handleToggleCompany(comp)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
                          title={comp.status === 'active' ? 'Pause crawl' : 'Resume crawl'}
                        >
                          {comp.status === 'active' ? <PauseCircle className="w-3 h-3 text-amber-400" /> : <PlayCircle className="w-3 h-3 text-emerald-400" />}
                        </button>

                        <button
                          onClick={() => handleDeleteCompany(comp.id)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-red-400 bg-slate-900 border border-slate-800 hover:border-red-900/40 rounded-lg transition-colors"
                          title="Delete company"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------- SECTION 2: 11 PUBLIC ATS ADAPTERS ---------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">11 Supported Public ATS Adapters</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Zero API Fees · Direct Public Endpoints · No Scraper Infrastructure Needed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {[
            { name: 'Greenhouse', slugPattern: 'boards-api.greenhouse.io/v1/boards/{slug}/jobs', color: 'emerald' },
            { name: 'Lever', slugPattern: 'api.lever.co/v0/postings/{slug}?mode=json', color: 'teal' },
            { name: 'Ashby', slugPattern: 'api.ashbyhq.com/posting-api/job-board/{slug}', color: 'indigo' },
            { name: 'Workable', slugPattern: 'apply.workable.com/api/v1/widget/accounts/{slug}', color: 'cyan' },
            { name: 'SmartRecruiters', slugPattern: 'api.smartrecruiters.com/v1/companies/{slug}/postings', color: 'violet' },
            { name: 'Recruitee', slugPattern: '{slug}.recruitee.com/api/offers/', color: 'pink' },
            { name: 'Personio', slugPattern: '{slug}.jobs.personio.de/xml', color: 'amber' },
            { name: 'Breezy HR', slugPattern: '{slug}.breezy.hr/json', color: 'blue' },
            { name: 'Teamtailor', slugPattern: '{slug}.teamtailor.com/jobs.rss', color: 'rose' },
            { name: 'Rippling', slugPattern: 'api.rippling.com/platform/api/ats/v1/board/{slug}/jobs', color: 'amber' },
            { name: 'Workday', slugPattern: '{tenant}.wd1.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs', color: 'blue' },
            { name: 'JSON-LD / RSS', slugPattern: 'schema.org/JobPosting & RSS 2.0 / Atom feeds', color: 'yellow' },
          ].map((ats, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#111726] border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{ats.name}</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ₹0 Cost / Public
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono break-all leading-tight">
                {ats.slugPattern}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- SECTION 3: INGESTION RUNS HISTORY ---------------- */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-white">Discovery &amp; Ingestion Runs History</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Persisted in SQLite</span>
        </div>

        {runsHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            No discovery runs executed yet. Click &quot;Run Public Discovery&quot; or import a dataset below.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-medium">Run ID</th>
                  <th className="pb-2 font-medium">Trigger</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Sources Crawled</th>
                  <th className="pb-2 font-medium text-right">Jobs Found</th>
                  <th className="pb-2 font-medium text-right">Added</th>
                  <th className="pb-2 font-medium text-right">Duplicates</th>
                  <th className="pb-2 font-medium text-right">Time</th>
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

      {/* ---------------- SECTION 4: DIRECT DATASET INGESTION (JSON / CSV) ---------------- */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-sky-400" />
              <span>Direct Dataset Ingestion &amp; Deduplication Pipeline</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste custom CSV or JSON job records. Incoming listings are normalized and cross-referenced against SQLite database to filter duplicates.
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
