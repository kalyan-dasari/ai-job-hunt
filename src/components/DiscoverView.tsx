import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  ExternalLink,
  MapPin,
  Briefcase,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Layers,
  ArrowUpDown,
  Building,
} from 'lucide-react';
import { Job, WorkArrangement, EmploymentType } from '../types/job';
import { CandidateProfile } from '../types/candidate';
import { isTodayIst, isWithinHours, isWithinDays } from '../utils/temporalClient';

interface DiscoverViewProps {
  jobs: Job[];
  candidate: CandidateProfile;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onSelectJob: (job: Job) => void;
  onToggleSave: (jobId: string) => void;
  onTailorResume: (job: Job) => void;
}

export type QuickFilter =
  | 'all'
  | 'new_today'
  | '24h'
  | '7d'
  | 'fresher'
  | 'internship'
  | 'remote_india';

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  jobs,
  candidate,
  isLoading,
  onRefresh,
  onSelectJob,
  onToggleSave,
  onTailorResume,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedArrangement, setSelectedArrangement] = useState<string>('all');
  const [selectedExperience, setSelectedExperience] = useState<string>('all');
  const [selectedJobType, setSelectedJobType] = useState<string>('all');
  const [minMatchScore, setMinMatchScore] = useState<number>(0);
  const [disclosedSalaryOnly, setDisclosedSalaryOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'score' | 'newest'>('relevance');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setQuickFilter('all');
    setSelectedLocation('all');
    setSelectedArrangement('all');
    setSelectedExperience('all');
    setSelectedJobType('all');
    setMinMatchScore(0);
    setDisclosedSalaryOnly(false);
    setSortBy('relevance');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    quickFilter !== 'all' ||
    selectedLocation !== 'all' ||
    selectedArrangement !== 'all' ||
    selectedExperience !== 'all' ||
    selectedJobType !== 'all' ||
    minMatchScore > 0 ||
    disclosedSalaryOnly;

  // Filter & Sort calculation
  const filteredJobs = useMemo(() => {
    let result = jobs.filter((j) => !j.isDismissed);

    // Quick filter chips
    if (quickFilter === 'new_today') {
      result = result.filter((j) => isTodayIst(j.firstSeenAt || j.datePosted));
    } else if (quickFilter === '24h') {
      result = result.filter((j) => isWithinHours(j.firstSeenAt || j.datePosted, 24));
    } else if (quickFilter === '7d') {
      result = result.filter((j) => isWithinDays(j.firstSeenAt || j.datePosted, 7));
    } else if (quickFilter === 'fresher') {
      result = result.filter(
        (j) =>
          j.matchResult?.isFresherEligible ||
          j.fresherStatus === 'Fresher' ||
          j.experienceLevel === 'Entry' ||
          j.experienceLevel === 'Intern' ||
          (j.minExpYears !== undefined && j.minExpYears <= 2)
      );
    } else if (quickFilter === 'internship') {
      result = result.filter(
        (j) =>
          j.employmentType === 'Internship' ||
          j.experienceLevel === 'Intern' ||
          j.title.toLowerCase().includes('intern')
      );
    } else if (quickFilter === 'remote_india') {
      result = result.filter(
        (j) =>
          (j.workArrangement === 'Remote' || j.location.toLowerCase().includes('remote')) &&
          (j.location.toLowerCase().includes('india') ||
            j.country === 'India' ||
            (j as any).locationCategory === 'remote_india')
      );
    }

    // Search query: Title, Company, Skills, Keywords
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q)) ||
          j.description.toLowerCase().includes(q)
      );
    }

    // Location
    if (selectedLocation !== 'all') {
      result = result.filter((j) =>
        j.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Arrangement
    if (selectedArrangement !== 'all') {
      result = result.filter(
        (j) => j.workArrangement.toLowerCase() === selectedArrangement.toLowerCase()
      );
    }

    // Experience Level
    if (selectedExperience !== 'all') {
      if (selectedExperience === 'fresher') {
        result = result.filter(
          (j) =>
            j.matchResult?.isFresherEligible ||
            j.fresherStatus === 'Fresher' ||
            j.experienceLevel === 'Entry' ||
            j.experienceLevel === 'Intern' ||
            (j.minExpYears !== undefined && j.minExpYears <= 2)
        );
      } else if (selectedExperience === 'experienced') {
        result = result.filter(
          (j) =>
            j.fresherStatus === 'Experienced' ||
            (j.minExpYears !== undefined && j.minExpYears >= 3) ||
            j.experienceLevel === 'Mid' ||
            j.experienceLevel === 'Senior' ||
            j.experienceLevel === 'Lead'
        );
      }
    }

    // Job Type
    if (selectedJobType !== 'all') {
      result = result.filter(
        (j) => j.employmentType.toLowerCase() === selectedJobType.toLowerCase()
      );
    }

    // Min Match Score
    if (minMatchScore > 0) {
      result = result.filter((j) => (j.matchResult?.overallScore || 0) >= minMatchScore);
    }

    // Disclosed Salary Only
    if (disclosedSalaryOnly) {
      result = result.filter(
        (j) =>
          j.salary &&
          j.salary.displayText &&
          j.salary.displayText.toLowerCase() !== 'undisclosed by company'
      );
    }

    // Sorting
    if (sortBy === 'score') {
      result.sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => {
        const timeA = new Date(a.firstSeenAt || a.datePosted).getTime();
        const timeB = new Date(b.firstSeenAt || b.datePosted).getTime();
        return timeB - timeA;
      });
    } else {
      // Relevance: hybrid score + recency
      result.sort((a, b) => {
        const scoreA = (a.matchResult?.overallScore || 0) + (a.isStartup ? 4 : 0);
        const scoreB = (b.matchResult?.overallScore || 0) + (b.isStartup ? 4 : 0);
        return scoreB - scoreA;
      });
    }

    return result;
  }, [
    jobs,
    quickFilter,
    searchQuery,
    selectedLocation,
    selectedArrangement,
    selectedExperience,
    selectedJobType,
    minMatchScore,
    disclosedSalaryOnly,
    sortBy,
  ]);

  // Pagination calculation
  const totalItems = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + pageSize);

  const getRelativeTimeDisplay = (job: Job) => {
    if (isTodayIst(job.firstSeenAt || job.datePosted)) {
      return { label: 'New Today', isNew: true };
    }
    if (isWithinHours(job.firstSeenAt || job.datePosted, 24)) {
      return { label: 'Last 24h', isNew: true };
    }
    if (isWithinDays(job.firstSeenAt || job.datePosted, 7)) {
      return { label: 'This Week', isNew: false };
    }
    if (job.datePosted && !job.datePosted.includes('1970')) {
      return { label: job.datePosted, isNew: false };
    }
    return { label: 'Posting date unavailable', isNew: false };
  };

  return (
    <div className="space-y-4">
      {/* Top Header Strip: Clean, minimal, focused on discovery */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Discover Jobs
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Verified opportunities from official career portals and public ATS platforms · Updated daily at 07:00 IST
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh job opportunities"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Input & Quick Filter Controls */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Main Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by job title, company, skills (Python, React, AI), or keywords..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle More Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors shrink-0 shadow-2xs ${
              showFilters || hasActiveFilters
                ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            )}
          </button>

          {/* Sort By Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2 pl-2.5 pr-7 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-sky-500 shadow-2xs cursor-pointer appearance-none"
            >
              <option value="relevance">Best Match</option>
              <option value="score">Match Score</option>
              <option value="newest">Newest First</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Quick Filter Chips (One-click toggle pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'All Jobs' },
            { id: 'new_today', label: 'New Today' },
            { id: '24h', label: 'Last 24 Hours' },
            { id: '7d', label: 'Last 7 Days' },
            { id: 'fresher', label: 'Fresher (0–2 yrs)' },
            { id: 'internship', label: 'Internships' },
            { id: 'remote_india', label: 'Remote India' },
          ].map((chip) => {
            const isSelected = quickFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => {
                  setQuickFilter(chip.id as QuickFilter);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium border-transparent shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                {chip.label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="ml-auto text-xs text-sky-600 dark:text-sky-400 hover:underline px-2 whitespace-nowrap"
            >
              Reset all
            </button>
          )}
        </div>

        {/* Expandable Advanced Filter Drawer */}
        {showFilters && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {/* Location */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Locations</option>
                <option value="bengaluru">Bengaluru</option>
                <option value="hyderabad">Hyderabad</option>
                <option value="pune">Pune</option>
                <option value="chennai">Chennai</option>
                <option value="mumbai">Mumbai</option>
                <option value="delhi">Delhi / NCR</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Work Mode
              </label>
              <select
                value={selectedArrangement}
                onChange={(e) => {
                  setSelectedArrangement(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Modes</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Experience
              </label>
              <select
                value={selectedExperience}
                onChange={(e) => {
                  setSelectedExperience(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Levels</option>
                <option value="fresher">Fresher (0–2 yrs)</option>
                <option value="experienced">Experienced (3+ yrs)</option>
              </select>
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Job Type
              </label>
              <select
                value={selectedJobType}
                onChange={(e) => {
                  setSelectedJobType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            {/* Minimum Match Score */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Match Score
              </label>
              <select
                value={minMatchScore}
                onChange={(e) => {
                  setMinMatchScore(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
              >
                <option value={0}>Any Score</option>
                <option value={60}>60%+ Match</option>
                <option value={75}>75%+ Match</option>
                <option value={85}>85%+ Match</option>
              </select>
            </div>

            {/* Salary filter checkbox */}
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={disclosedSalaryOnly}
                  onChange={(e) => {
                    setDisclosedSalaryOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Disclosed Salary Only
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Results Header: Count & Item Range */}
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
        <div>
          Showing <span className="font-semibold text-slate-900 dark:text-white">{totalItems === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{totalItems}</span> jobs
          {candidate.name && (
            <span className="ml-1 text-[11px] text-slate-600 dark:text-slate-400">
              · Scored for {candidate.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px]">Per page:</span>
          {[20, 50].map((size) => (
            <button
              key={size}
              onClick={() => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                pageSize === size
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Main Job List — Compact Rows */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : paginatedJobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No matching jobs found
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, location, or experience filters to discover more openings.
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 overflow-hidden shadow-2xs">
          {paginatedJobs.map((job) => {
            const timeInfo = getRelativeTimeDisplay(job);
            const score = job.matchResult?.overallScore || 0;

            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer gap-2"
              >
                {/* Left zone: Title, Company, Metadata */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(job.id);
                    }}
                    className={`mt-0.5 p-1 rounded-md transition-colors shrink-0 ${
                      job.isSaved
                        ? 'text-sky-600 dark:text-sky-400 hover:text-sky-700'
                        : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                    title={job.isSaved ? 'Remove from Saved' : 'Save job'}
                    aria-label={job.isSaved ? 'Remove from saved' : 'Save job'}
                  >
                    {job.isSaved ? (
                      <BookmarkCheck className="w-4 h-4 fill-current" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                        {job.title}
                      </span>

                      {timeInfo.isNew && (
                        <span className="px-1.5 py-0.2 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-md">
                          {timeInfo.label}
                        </span>
                      )}

                      {job.fresherStatus === 'Fresher' && (
                        <span className="px-1.5 py-0.2 text-[10px] font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 rounded-md">
                          Fresher
                        </span>
                      )}
                    </div>

                    {/* Company, Location, Work Mode */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {job.company}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{job.location}</span>
                      </span>
                      <span>·</span>
                      <span>{job.workArrangement}</span>
                      <span>·</span>
                      <span>{job.employmentType}</span>
                      <span>·</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {job.experienceLevel} ({job.minExpYears || 0}–{job.maxExpYears || 2} yrs)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right zone: Match Score, Timing, Quick Action */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                  {/* Date badge */}
                  <div className="text-right hidden sm:block">
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      {timeInfo.label}
                    </div>
                    {job.salary?.displayText && job.salary.displayText !== 'Undisclosed by company' ? (
                      <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                        {job.salary.displayText}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-600 dark:text-slate-400">
                        Salary undisclosed
                      </div>
                    )}
                  </div>

                  {/* Match Score Badge */}
                  <div
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono tabular-nums ${
                      score >= 80
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : score >= 60
                        ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {score}% Match
                  </div>

                  {/* Tailor Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTailorResume(job);
                    }}
                    className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Tailor your resume for this requisition"
                  >
                    <Sparkles className="w-3 h-3 text-sky-500" />
                    <span>Tailor</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Page {safePage} of {totalPages}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
              // Calculate a clean sliding window of page numbers
              let pNum = safePage <= 3 ? idx + 1 : safePage - 2 + idx;
              if (pNum > totalPages) pNum = totalPages - (4 - idx);
              if (pNum < 1) pNum = idx + 1;

              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`w-7 h-7 text-xs rounded-md font-medium transition-colors ${
                    safePage === pNum
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

