import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Building,
  MapPin,
  Check,
  X,
  FileCheck,
  GraduationCap,
  Globe,
  Compass,
  Cpu,
  Server,
  Layers,
  CheckCircle2,
  Rocket,
  Radio,
} from 'lucide-react';
import { Job, WorkArrangement, EmploymentType, ExperienceLevel, VerificationStatus } from '../types/job';
import { ApplicationRecord } from '../types/application';

export type DiscoveryViewMode =
  | 'recommended'
  | 'latest'
  | 'startups'
  | 'freshers'
  | 'remote'
  | 'saved'
  | 'applied';

interface JobDiscoveryViewProps {
  jobs: Job[];
  applications?: ApplicationRecord[];
  onSelectJob: (job: Job) => void;
  onPrepareApplication: (job: Job) => void;
  onToggleSave: (jobId: string) => void;
  onToggleDismiss: (jobId: string) => void;
}

export const JobDiscoveryView: React.FC<JobDiscoveryViewProps> = ({
  jobs,
  applications = [],
  onSelectJob,
  onPrepareApplication,
  onToggleSave,
  onToggleDismiss,
}) => {
  const [viewMode, setViewMode] = useState<DiscoveryViewMode>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedArrangement, setSelectedArrangement] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedFreshness, setSelectedFreshness] = useState<string>('all');
  const [fresherOnly, setFresherOnly] = useState(false);
  const [startupOnly, setStartupOnly] = useState(false);
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'relevance' | 'score' | 'newest'>('relevance');

  // Specific Phase 5 Quick Filters
  const [selectedCityFilter, setSelectedCityFilter] = useState<'all' | 'hyderabad' | 'bengaluru' | 'remote-india'>('all');
  const [selectedExpFilter, setSelectedExpFilter] = useState<'all' | 'fresher' | '0-1' | '0-2' | 'internship' | 'graduate-trainee'>('all');
  const [selectedTechFilter, setSelectedTechFilter] = useState<'all' | 'python' | 'fullstack' | 'backend' | 'aiml' | 'react'>('all');

  // Applied job IDs set for quick lookup
  const appliedJobIds = new Set(applications.map((a) => a.jobId));

  // Base list excludes dismissed unless searching specifically
  let filtered = jobs.filter((j) => !j.isDismissed);

  // Apply View Mode Pills
  if (viewMode === 'recommended') {
    filtered = filtered.filter((j) => (j.matchResult?.overallScore || 0) >= 50);
  } else if (viewMode === 'startups') {
    filtered = filtered.filter((j) => j.isStartup);
  } else if (viewMode === 'freshers') {
    filtered = filtered.filter(
      (j) =>
        j.matchResult?.isFresherEligible ||
        j.experienceLevel === 'Intern' ||
        j.experienceLevel === 'Entry' ||
        (j.minExpYears !== undefined && j.minExpYears <= 1)
    );
  } else if (viewMode === 'remote') {
    filtered = filtered.filter(
      (j) => j.workArrangement === 'Remote' || j.location.toLowerCase().includes('remote')
    );
  } else if (viewMode === 'saved') {
    filtered = filtered.filter((j) => j.isSaved);
  } else if (viewMode === 'applied') {
    filtered = filtered.filter((j) => appliedJobIds.has(j.id));
  }

  // Fresher filter toggle
  if (fresherOnly && viewMode !== 'freshers') {
    filtered = filtered.filter(
      (j) =>
        j.matchResult?.isFresherEligible ||
        j.experienceLevel === 'Intern' ||
        j.experienceLevel === 'Entry' ||
        (j.minExpYears !== undefined && j.minExpYears <= 1)
    );
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  }

  if (selectedLocation !== 'all') {
    filtered = filtered.filter((j) => j.location.toLowerCase().includes(selectedLocation.toLowerCase()));
  }

  if (selectedArrangement !== 'all') {
    filtered = filtered.filter((j) => j.workArrangement.toLowerCase() === selectedArrangement.toLowerCase());
  }

  if (selectedType !== 'all') {
    filtered = filtered.filter((j) => j.employmentType.toLowerCase() === selectedType.toLowerCase());
  }

  if (selectedLevel !== 'all') {
    filtered = filtered.filter((j) => j.experienceLevel.toLowerCase() === selectedLevel.toLowerCase());
  }

  if (selectedSource !== 'all') {
    filtered = filtered.filter((j) => j.source.toLowerCase() === selectedSource.toLowerCase());
  }

  if (selectedFreshness !== 'all') {
    filtered = filtered.filter(
      (j) => (j.freshnessStatus || 'Active').toLowerCase() === selectedFreshness.toLowerCase()
    );
  }

  if (startupOnly) {
    filtered = filtered.filter((j) => j.isStartup);
  }

  if (minScore > 0) {
    filtered = filtered.filter((j) => (j.matchResult?.overallScore || 0) >= minScore);
  }

  // Phase 5 City Hub Filter
  if (selectedCityFilter !== 'all') {
    if (selectedCityFilter === 'hyderabad') {
      filtered = filtered.filter((j) => j.location.toLowerCase().includes('hyderabad'));
    } else if (selectedCityFilter === 'bengaluru') {
      filtered = filtered.filter(
        (j) => j.location.toLowerCase().includes('bengaluru') || j.location.toLowerCase().includes('bangalore')
      );
    } else if (selectedCityFilter === 'chennai') {
      filtered = filtered.filter((j) => j.location.toLowerCase().includes('chennai'));
    } else if (selectedCityFilter === 'pune') {
      filtered = filtered.filter((j) => j.location.toLowerCase().includes('pune'));
    } else if (selectedCityFilter === 'mumbai') {
      filtered = filtered.filter((j) => j.location.toLowerCase().includes('mumbai'));
    } else if (selectedCityFilter === 'delhi-ncr') {
      filtered = filtered.filter(
        (j) =>
          j.location.toLowerCase().includes('delhi') ||
          j.location.toLowerCase().includes('noida') ||
          j.location.toLowerCase().includes('gurgaon') ||
          j.location.toLowerCase().includes('gurugram')
      );
    } else if (selectedCityFilter === 'remote-india') {
      filtered = filtered.filter(
        (j) =>
          j.locationCategory === 'India remote' ||
          j.workArrangement === 'Remote' ||
          j.location.toLowerCase().includes('remote')
      );
    } else if (selectedCityFilter === 'other') {
      const mainHubs = ['hyderabad', 'bengaluru', 'bangalore', 'chennai', 'pune', 'mumbai', 'delhi', 'noida', 'gurgaon', 'gurugram'];
      filtered = filtered.filter((j) => !mainHubs.some((h) => j.location.toLowerCase().includes(h)));
    }
  }

  // Phase 5 Experience Breakdown Filter
  if (selectedExpFilter !== 'all') {
    if (selectedExpFilter === 'fresher') {
      filtered = filtered.filter(
        (j) =>
          j.fresherStatus === 'Fresher' ||
          j.experienceLevel === 'Intern' ||
          j.experienceLevel === 'Entry' ||
          (j.minExpYears !== undefined && j.minExpYears <= 1) ||
          j.matchResult?.isFresherEligible
      );
    } else if (selectedExpFilter === '0-1') {
      filtered = filtered.filter(
        (j) =>
          (j.minExpYears !== undefined && j.minExpYears <= 1) ||
          j.experienceLevel === 'Intern' ||
          j.fresherStatus === 'Fresher'
      );
    } else if (selectedExpFilter === '0-2') {
      filtered = filtered.filter(
        (j) =>
          (j.minExpYears !== undefined && j.minExpYears <= 2) ||
          j.experienceLevel === 'Intern' ||
          j.experienceLevel === 'Entry' ||
          j.fresherStatus === 'Fresher'
      );
    } else if (selectedExpFilter === 'internship') {
      filtered = filtered.filter(
        (j) =>
          j.employmentType === 'Internship' ||
          j.experienceLevel === 'Intern' ||
          j.title.toLowerCase().includes('intern')
      );
    } else if (selectedExpFilter === 'graduate-trainee') {
      filtered = filtered.filter(
        (j) =>
          j.title.toLowerCase().includes('trainee') ||
          j.title.toLowerCase().includes('graduate') ||
          j.title.toLowerCase().includes('get') ||
          j.description.toLowerCase().includes('graduate trainee')
      );
    }
  }

  // Phase 5 Technical Skill / Role Quick Filter
  if (selectedTechFilter !== 'all') {
    const t = selectedTechFilter.toLowerCase();
    if (t === 'aiml') {
      filtered = filtered.filter((j) => {
        const comb = `${j.title} ${j.description} ${(j.requiredSkills || []).join(' ')}`.toLowerCase();
        return (
          comb.includes('ai') ||
          comb.includes('machine learning') ||
          comb.includes('ml') ||
          comb.includes('deep learning') ||
          comb.includes('llm')
        );
      });
    } else if (t === 'fullstack') {
      filtered = filtered.filter((j) => {
        const comb = `${j.title} ${j.description}`.toLowerCase();
        return comb.includes('full stack') || comb.includes('fullstack') || comb.includes('full-stack');
      });
    } else {
      filtered = filtered.filter((j) => {
        const comb = `${j.title} ${j.description} ${(j.requiredSkills || []).join(' ')}`.toLowerCase();
        return comb.includes(t);
      });
    }
  }

  // Sorting based on viewMode or explicit sort
  if (viewMode === 'latest' || sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());
  } else if (sortBy === 'score') {
    filtered.sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0));
  } else {
    // Default recommended sort
    filtered.sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0));
  }

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedLocation('all');
    setSelectedArrangement('all');
    setSelectedType('all');
    setSelectedLevel('all');
    setSelectedSource('all');
    setSelectedFreshness('all');
    setFresherOnly(false);
    setStartupOnly(false);
    setMinScore(0);
    setSortBy('relevance');
    setSelectedCityFilter('all');
    setSelectedExpFilter('all');
    setSelectedTechFilter('all');
  };

  // Source attribution badge helper
  const renderSourceBadge = (source: string) => {
    const sLower = source.toLowerCase();
    if (sLower.includes('greenhouse')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
          <Server className="w-3 h-3 text-emerald-400" />
          <span>Greenhouse</span>
        </span>
      );
    }
    if (sLower.includes('lever')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 font-medium">
          <Server className="w-3 h-3 text-teal-400" />
          <span>Lever</span>
        </span>
      );
    }
    if (sLower.includes('ashby')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-medium">
          <Server className="w-3 h-3 text-indigo-400" />
          <span>Ashby</span>
        </span>
      );
    }
    if (sLower.includes('workable')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-medium">
          <Server className="w-3 h-3 text-cyan-400" />
          <span>Workable</span>
        </span>
      );
    }
    if (sLower.includes('smartrecruiters')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30 font-medium">
          <Server className="w-3 h-3 text-violet-400" />
          <span>SmartRecruiters</span>
        </span>
      );
    }
    if (sLower.includes('recruitee')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/30 font-medium">
          <Server className="w-3 h-3 text-pink-400" />
          <span>Recruitee</span>
        </span>
      );
    }
    if (sLower.includes('personio')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
          <Server className="w-3 h-3 text-amber-400" />
          <span>Personio</span>
        </span>
      );
    }
    if (sLower.includes('breezy')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-medium">
          <Server className="w-3 h-3 text-blue-400" />
          <span>Breezy HR</span>
        </span>
      );
    }
    if (sLower.includes('teamtailor')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 font-medium">
          <Server className="w-3 h-3 text-rose-400" />
          <span>Teamtailor</span>
        </span>
      );
    }
    if (sLower.includes('rippling')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
          <Server className="w-3 h-3 text-amber-400" />
          <span>Rippling</span>
        </span>
      );
    }
    if (sLower.includes('workday')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-medium">
          <Server className="w-3 h-3 text-blue-400" />
          <span>Workday</span>
        </span>
      );
    }
    if (sLower.includes('json-ld')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 font-medium">
          <FileCheck className="w-3 h-3 text-yellow-400" />
          <span>JSON-LD</span>
        </span>
      );
    }
    if (sLower.includes('rss')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/30 font-medium">
          <Radio className="w-3 h-3 text-orange-400" />
          <span>RSS Feed</span>
        </span>
      );
    }
    if (sLower.includes('jsearch')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
          <Globe className="w-3 h-3" />
          <span>JSearch</span>
        </span>
      );
    }
    if (sLower.includes('adzuna')) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          <Cpu className="w-3 h-3" />
          <span>Adzuna</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
        <Server className="w-3 h-3 text-purple-400" />
        <span>{source}</span>
      </span>
    );
  };

  const savedCount = jobs.filter((j) => j.isSaved).length;
  const appliedCount = applications.length;
  const startupCount = jobs.filter((j) => j.isStartup && !j.isDismissed).length;
  const fresherCount = jobs.filter(
    (j) =>
      !j.isDismissed &&
      (j.matchResult?.isFresherEligible ||
        j.experienceLevel === 'Intern' ||
        j.experienceLevel === 'Entry' ||
        (j.minExpYears !== undefined && j.minExpYears <= 1))
  ).length;
  const remoteCount = jobs.filter(
    (j) => !j.isDismissed && (j.workArrangement === 'Remote' || j.location.toLowerCase().includes('remote'))
  ).length;

  return (
    <div className="space-y-6">
      {/* Search Header & View Mode Switcher */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* Dossier View Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('recommended')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'recommended'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended</span>
            </button>

            <button
              onClick={() => setViewMode('latest')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'latest'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Latest</span>
            </button>

            <button
              onClick={() => setViewMode('startups')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'startups'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Startup Jobs ({startupCount})</span>
            </button>

            <button
              onClick={() => setViewMode('freshers')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'freshers'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Fresher Jobs ({fresherCount})</span>
            </button>

            <button
              onClick={() => setViewMode('remote')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'remote'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Remote Jobs ({remoteCount})</span>
            </button>

            <button
              onClick={() => setViewMode('saved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'saved'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({savedCount})</span>
            </button>

            <button
              onClick={() => setViewMode('applied')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                viewMode === 'applied'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Applied ({appliedCount})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-emerald-400 font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <input
                type="checkbox"
                checked={fresherOnly}
                onChange={(e) => setFresherOnly(e.target.checked)}
                className="rounded border-emerald-500/30 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Fresher Filter (0 yrs)</span>
            </label>
          </div>
        </div>

        {/* Search Bar & Sorter */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, skill (e.g. React, Python, Node.js), or company..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="relevance">Highest Dossier Fit</option>
              <option value="score">Match Score (Desc)</option>
              <option value="newest">Recently Posted</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills (Hubs, Experience, Roles) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>Target Filters:</span>
          </span>

          {/* Hubs */}
          <div className="inline-flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
            <button
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'hyderabad' ? 'all' : 'hyderabad')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCityFilter === 'hyderabad'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Hyderabad
            </button>
            <button
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'bengaluru' ? 'all' : 'bengaluru')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCityFilter === 'bengaluru'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Bengaluru
            </button>
            <button
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'chennai' ? 'all' : 'chennai')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCityFilter === 'chennai'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Chennai
            </button>
            <button
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'pune' ? 'all' : 'pune')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCityFilter === 'pune'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Pune
            </button>
            <button
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'mumbai' ? 'all' : 'mumbai')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCityFilter === 'mumbai'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Mumbai
            </button>
            <button
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'delhi-ncr' ? 'all' : 'delhi-ncr')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCityFilter === 'delhi-ncr'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Delhi NCR
            </button>
            <button
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'remote-india' ? 'all' : 'remote-india')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCityFilter === 'remote-india'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Remote India
            </button>
            <button
              onClick={() => setSelectedCityFilter(selectedCityFilter === 'other' ? 'all' : 'other')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCityFilter === 'other'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Other Cities
            </button>
          </div>

          {/* Experience */}
          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
            <button
              onClick={() => setSelectedExpFilter(selectedExpFilter === 'fresher' ? 'all' : 'fresher')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedExpFilter === 'fresher'
                  ? 'bg-emerald-500 text-white'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              Fresher (0 yrs)
            </button>
            <button
              onClick={() => setSelectedExpFilter(selectedExpFilter === '0-1' ? 'all' : '0-1')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedExpFilter === '0-1'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              0–1 yrs
            </button>
            <button
              onClick={() => setSelectedExpFilter(selectedExpFilter === '0-2' ? 'all' : '0-2')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedExpFilter === '0-2'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              0–2 yrs
            </button>
            <button
              onClick={() => setSelectedExpFilter(selectedExpFilter === 'internship' ? 'all' : 'internship')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedExpFilter === 'internship'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Internship
            </button>
            <button
              onClick={() => setSelectedExpFilter(selectedExpFilter === 'graduate-trainee' ? 'all' : 'graduate-trainee')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedExpFilter === 'graduate-trainee'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Graduate Trainee
            </button>
          </div>

          {/* Roles / Tech */}
          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800">
            <button
              onClick={() => setSelectedTechFilter(selectedTechFilter === 'python' ? 'all' : 'python')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedTechFilter === 'python'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => setSelectedTechFilter(selectedTechFilter === 'fullstack' ? 'all' : 'fullstack')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedTechFilter === 'fullstack'
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Full Stack
            </button>
            <button
              onClick={() => setSelectedTechFilter(selectedTechFilter === 'backend' ? 'all' : 'backend')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedTechFilter === 'backend'
                  ? 'bg-purple-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Backend
            </button>
            <button
              onClick={() => setSelectedTechFilter(selectedTechFilter === 'aiml' ? 'all' : 'aiml')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedTechFilter === 'aiml'
                  ? 'bg-pink-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              AI/ML
            </button>
            <button
              onClick={() => setSelectedTechFilter(selectedTechFilter === 'react' ? 'all' : 'react')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedTechFilter === 'react'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              React
            </button>
          </div>
        </div>

        {/* Filter Toolbar Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Arrangement</label>
            <select
              value={selectedArrangement}
              onChange={(e) => setSelectedArrangement(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Arrangements</option>
              <option value="remote">Remote (India)</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-site</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Employment</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="full-time">Full-time</option>
              <option value="internship">Internship</option>
              <option value="part-time">Part-time</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Experience</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Experience Levels</option>
              <option value="intern">Intern</option>
              <option value="entry">Entry (0-2 yrs)</option>
              <option value="mid">Mid (2-5 yrs)</option>
              <option value="senior">Senior (5+ yrs)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Channel Source</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="jsearch">JSearch (Primary)</option>
              <option value="adzuna">Adzuna (India)</option>
              <option value="career page">Career Pages (ATS)</option>
              <option value="startup feed">Startup Feeds</option>
              <option value="manual import">Manual Import</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Freshness</label>
            <select
              value={selectedFreshness}
              onChange={(e) => setSelectedFreshness(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Freshness</option>
              <option value="newly discovered">Newly Discovered</option>
              <option value="active">Active</option>
              <option value="potentially stale">Potentially Stale</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Min Match Fit</label>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value={0}>Any Score</option>
              <option value={70}>70%+ Match</option>
              <option value={80}>80%+ Match</option>
              <option value={90}>90%+ Match</option>
            </select>
          </div>
        </div>

        {/* Count row & reset */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={startupOnly}
                onChange={(e) => setStartupOnly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
              />
              <span>Startup &amp; High-Growth Only</span>
            </label>

            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              Showing <strong className="text-white font-mono">{filtered.length}</strong> opportunities
            </span>
          </div>

          {(searchQuery ||
            selectedArrangement !== 'all' ||
            selectedType !== 'all' ||
            selectedLevel !== 'all' ||
            selectedSource !== 'all' ||
            selectedFreshness !== 'all' ||
            fresherOnly ||
            startupOnly ||
            minScore > 0) && (
            <button
              onClick={resetFilters}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Jobs Grid / List */}
      {filtered.length === 0 ? (
        <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">
            {jobs.length === 0
              ? 'No job opportunities discovered yet'
              : 'No job opportunities matched your criteria'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {jobs.length === 0
              ? 'Click "Run Dossier Discovery" in the Ingestion tab or configure your JSearch / Adzuna API credentials to ingest authentic India opportunities.'
              : 'Try clearing your active filters, relaxing the minimum match score, or toggling off fresher-only filters.'}
          </p>
          {jobs.length > 0 && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((job) => {
            const match = job.matchResult;
            const score = match?.overallScore || 0;
            const isVerified = job.verificationReport.status === 'Verified';
            const isHighRisk = job.verificationReport.status === 'High Risk';
            const isFresherEligible = match?.isFresherEligible;
            const isApplied = appliedJobIds.has(job.id);

            return (
              <div
                key={job.id}
                className={`bg-[#111726] border rounded-2xl p-5 transition-all group ${
                  isHighRisk
                    ? 'border-red-900/60 bg-red-950/10'
                    : 'border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left Column: Job Summary & Dossier Fit Highlights */}
                  <div className="space-y-3 flex-1">
                    {/* Source & Location Metadata Line */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-bold text-white text-sm">{job.company}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-300">{job.location}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>{job.workArrangement}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>{job.employmentType}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>

                      {/* Source attribution badge */}
                      {renderSourceBadge(job.source)}

                      {/* Fresher Eligible Badge */}
                      {isFresherEligible && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 font-semibold">
                          <GraduationCap className="w-3 h-3" />
                          <span>Fresher Eligible (0 yrs)</span>
                        </span>
                      )}

                      {isApplied && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Applied</span>
                        </span>
                      )}

                      {job.freshnessStatus && (
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                            job.freshnessStatus === 'Newly Discovered'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                              : job.freshnessStatus === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {job.freshnessStatus}
                        </span>
                      )}
                    </div>

                    {/* Job Title & Link */}
                    <div className="flex items-baseline gap-2">
                      <h2
                        onClick={() => onSelectJob(job)}
                        className={`text-base font-bold cursor-pointer transition-colors ${
                          isHighRisk ? 'text-red-300 hover:text-red-200' : 'text-white hover:text-sky-400'
                        }`}
                      >
                        {job.title}
                      </h2>
                      <a
                        href={job.originalUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Open original job posting"
                        className="text-slate-500 hover:text-sky-400 inline-flex items-center transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Compensation & Experience disclosures */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {job.salary?.displayText ? (
                        <span className="text-emerald-400 font-mono font-medium">{job.salary.displayText}</span>
                      ) : (
                        <span className="text-slate-500">Compensation undisclosed by source</span>
                      )}
                      <span aria-hidden="true" className="text-slate-700">·</span>
                      <span className="text-slate-300">
                        Experience: {job.experienceLevel} ({job.minExpYears || 0}-{job.maxExpYears || 0} yrs)
                      </span>
                      {match?.experienceExplanation && (
                        <>
                          <span aria-hidden="true" className="text-slate-700">·</span>
                          <span className="text-slate-400 text-[11px] italic">
                            {match.experienceExplanation}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Dossier Match Fit Analysis Block */}
                    {match && (
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <div className="space-y-1 flex-1">
                            <span className="font-semibold text-slate-200 block text-[11px]">
                              Why this matches your profile:
                            </span>
                            <p className="text-slate-300 leading-relaxed text-[11px]">
                              {match.reasoningSummary || match.explanation}
                            </p>
                          </div>
                        </div>

                        {/* Location Compatibility Note if present */}
                        {match.locationCompatibilityNote && (
                          <div className="text-[10px] text-slate-400 pl-5 flex items-center gap-1 font-mono">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span>{match.locationCompatibilityNote}</span>
                          </div>
                        )}

                        {/* Skills Breakdown Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                          {match.strongMatches && match.strongMatches.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-emerald-400 font-medium">Matched:</span>
                              {match.strongMatches.slice(0, 5).map((sm, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]"
                                >
                                  {sm}
                                </span>
                              ))}
                            </div>
                          )}

                          {match.missingSkills && match.missingSkills.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 ml-2">
                              <span className="text-[10px] text-amber-400 font-medium">Missing:</span>
                              {match.missingSkills.slice(0, 3).map((ms, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]"
                                >
                                  {ms}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Risk Callout if High Risk */}
                    {isHighRisk && (
                      <div className="mt-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Security Warning:</strong> {job.verificationReport.summary}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Match Score, Verification Badge & Actions */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {/* Match Score Display */}
                    <div className="text-left lg:text-right">
                      <div className="flex items-center gap-2 justify-start lg:justify-end">
                        <span className="text-xs text-slate-400">Dossier Fit:</span>
                        <span
                          className={`text-lg font-bold font-mono tabular-nums ${
                            score >= 85 ? 'text-emerald-400' : score >= 70 ? 'text-sky-400' : 'text-slate-400'
                          }`}
                        >
                          {score}%
                        </span>
                      </div>

                      {/* Verification Status */}
                      <div className="mt-1 flex items-center gap-1.5 justify-start lg:justify-end text-xs">
                        {isVerified ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : isHighRisk ? (
                          <span className="text-red-400 flex items-center gap-1 font-medium text-[11px]">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>High Risk</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-medium text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Needs Review</span>
                          </span>
                        )}
                        <span className="text-slate-500 text-[10px] font-mono">
                          ({job.verificationReport.confidence}%)
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Posted {job.datePosted}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleSave(job.id)}
                        className={`p-2 rounded-xl border transition-colors ${
                          job.isSaved
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={job.isSaved ? 'Remove from saved' : 'Save opportunity'}
                      >
                        {job.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => onSelectJob(job)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors whitespace-nowrap"
                      >
                        Inspect
                      </button>

                      {!isHighRisk ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onPrepareApplication(job)}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors whitespace-nowrap"
                            title="Generate tailored resume / cover letter & track application"
                          >
                            Prepare
                          </button>
                          <a
                            href={job.applicationUrl || job.originalUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors whitespace-nowrap inline-flex items-center gap-1 shadow-sm shadow-sky-600/20"
                            title="Open official company job posting / application portal"
                          >
                            <span>Apply</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <button
                          onClick={() => onToggleDismiss(job.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-300 bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 rounded-xl transition-colors whitespace-nowrap"
                        >
                          Dismiss Risk
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
