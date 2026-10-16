import React, { useState } from 'react';
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
} from 'lucide-react';
import { SourceConnector } from '../types/connector';
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
    } catch (err: any) {
      console.error('Import error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Card */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>Modular Source Connector Architecture</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Job Portals & Ingestion Feeds
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              JobPilot AI integrates verified corporate career portals, authorized feeds, and custom datasets with strict deduplication and terms compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/export?type=json"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-xl hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All Data (JSON)</span>
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
      </div>

      {/* Connectors Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Configured Source Connectors ({connectors.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectors.map((conn) => (
            <div
              key={conn.id}
              className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{conn.displayName}</span>
                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {conn.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{conn.description}</p>

                <div className="space-y-1 text-xs pt-1 border-t border-slate-800/80 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Protocol:</span>
                    <span className="text-slate-200">{conn.accessMethod}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Rate Limit:</span>
                    <span className="text-slate-400">{conn.rateLimitInfo}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Active Listings:</span>
                    <span className="text-sky-400 tabular-nums">{conn.activeJobsCount} jobs</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
                Last checked: {conn.lastSyncTimestamp ? new Date(conn.lastSyncTimestamp).toLocaleTimeString() : 'Active'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset Ingestion Interface (JSON / CSV) with Deduplication */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-sky-400" />
              <span>Direct Dataset Ingestion & Deduplication Pipeline</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste permitted CSV or JSON job records. Incoming listings are normalized and cross-referenced to filter duplicates.
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
              <span>Ingestion Run Completed</span>
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
