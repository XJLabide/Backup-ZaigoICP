"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { X, Plus, Sparkles } from "lucide-react";

interface IcpClientProps {
  icpConfig: {
    jobTitles: string[];
    industries: string[];
    companySizes: string[];
    locations: string[];
    keywords: string[];
  } | null;
}

const INDUSTRY_OPTIONS = [
  "Insurance",
  "Financial Services",
  "Real Estate",
  "Healthcare",
  "Legal",
  "Accounting",
  "Small Business",
  "Consulting",
  "Technology",
  "Manufacturing",
  "Retail",
  "Education",
  "Non-Profit",
  "Government",
];

const COMPANY_SIZE_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

const JOB_TITLE_SUGGESTIONS = [
  "CEO",
  "CFO",
  "Business Owner",
  "Managing Partner",
  "VP of Operations",
  "Director of Finance",
  "Practice Manager",
  "Agency Owner",
  "Founder",
  "President",
];

export function IcpClient({ icpConfig }: IcpClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // Job Titles
  const [jobTitles, setJobTitles] = useState<string[]>(
    icpConfig?.jobTitles ?? []
  );
  const [jobTitleInput, setJobTitleInput] = useState("");

  // Industries
  const [industries, setIndustries] = useState<string[]>(
    icpConfig?.industries ?? []
  );

  // Company Sizes
  const [companySizes, setCompanySizes] = useState<string[]>(
    icpConfig?.companySizes ?? []
  );

  // Locations
  const [locations, setLocations] = useState<string[]>(
    icpConfig?.locations ?? []
  );
  const [locationInput, setLocationInput] = useState("");

  // Keywords
  const [keywords, setKeywords] = useState<string[]>(
    icpConfig?.keywords ?? []
  );
  const [keywordInput, setKeywordInput] = useState("");

  // Job Titles handlers
  const addJobTitle = (title: string) => {
    const trimmed = title.trim();
    if (trimmed && !jobTitles.includes(trimmed)) {
      setJobTitles([...jobTitles, trimmed]);
      setJobTitleInput("");
    }
  };

  const removeJobTitle = (title: string) => {
    setJobTitles(jobTitles.filter((t) => t !== title));
  };

  // Industry handlers
  const toggleIndustry = (industry: string) => {
    if (industries.includes(industry)) {
      setIndustries(industries.filter((i) => i !== industry));
    } else {
      setIndustries([...industries, industry]);
    }
  };

  // Company Size handlers
  const toggleCompanySize = (size: string) => {
    if (companySizes.includes(size)) {
      setCompanySizes(companySizes.filter((s) => s !== size));
    } else {
      setCompanySizes([...companySizes, size]);
    }
  };

  // Location handlers
  const addLocation = (location: string) => {
    const trimmed = location.trim();
    if (trimmed && !locations.includes(trimmed)) {
      setLocations([...locations, trimmed]);
      setLocationInput("");
    }
  };

  const removeLocation = (location: string) => {
    setLocations(locations.filter((l) => l !== location));
  };

  // Keyword handlers
  const addKeyword = (keyword: string) => {
    const trimmed = keyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          icpConfig: {
            jobTitles,
            industries,
            companySizes,
            locations,
            keywords,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save ICP configuration");
      }

      toast.success("ICP configuration saved successfully");
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save ICP configuration. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Titles Section */}
      <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[#d4a84b]" />
          <h2 className="font-semibold text-white">Target Job Titles</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Specify the job titles of your ideal customer profile
        </p>

        {/* Job Title Tags */}
        {jobTitles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {jobTitles.map((title) => (
              <div
                key={title}
                className="inline-flex items-center gap-1.5 bg-[#1a1d29] border border-white/20 rounded-full px-3 py-1.5 text-sm text-white"
              >
                <span>{title}</span>
                <button
                  type="button"
                  onClick={() => removeJobTitle(title)}
                  className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Job Title Input */}
        <div className="flex gap-2 mb-3">
          <Input
            type="text"
            placeholder="Add job title (e.g., CEO, CFO)"
            value={jobTitleInput}
            onChange={(e) => setJobTitleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addJobTitle(jobTitleInput);
              }
            }}
            disabled={isSaving}
          />
          <button
            type="button"
            onClick={() => addJobTitle(jobTitleInput)}
            disabled={!jobTitleInput.trim() || isSaving}
            className="flex items-center gap-1.5 bg-[#d4a84b] text-[#1a1d29] rounded-md px-4 py-2 text-sm font-semibold hover:bg-[#e5b95c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Common suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {JOB_TITLE_SUGGESTIONS.filter((s) => !jobTitles.includes(s)).map(
              (suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addJobTitle(suggestion)}
                  disabled={isSaving}
                  className="text-xs bg-[#1a1d29]/50 border border-white/10 text-gray-400 rounded-full px-3 py-1 hover:bg-[#1a1d29] hover:text-white hover:border-[#d4a84b]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + {suggestion}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Industries Section */}
      <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
        <h2 className="font-semibold text-white mb-1">Target Industries</h2>
        <p className="text-sm text-gray-400 mb-4">
          Select the industries where your ideal customers operate
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {INDUSTRY_OPTIONS.map((industry) => {
            const isSelected = industries.includes(industry);
            return (
              <label
                key={industry}
                className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#d4a84b]/10 border-[#d4a84b]/50 text-white"
                    : "bg-[#1a1d29] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleIndustry(industry)}
                  disabled={isSaving}
                  className="w-4 h-4 rounded border-white/20 bg-[#1a1d29] text-[#d4a84b] focus:ring-[#d4a84b] focus:ring-offset-0 disabled:opacity-50"
                />
                <span className="text-sm font-medium">{industry}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Company Size Section */}
      <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
        <h2 className="font-semibold text-white mb-1">Company Size</h2>
        <p className="text-sm text-gray-400 mb-4">
          Select the size ranges of companies you want to target
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COMPANY_SIZE_OPTIONS.map((size) => {
            const isSelected = companySizes.includes(size);
            return (
              <label
                key={size}
                className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#d4a84b]/10 border-[#d4a84b]/50 text-white"
                    : "bg-[#1a1d29] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCompanySize(size)}
                  disabled={isSaving}
                  className="w-4 h-4 rounded border-white/20 bg-[#1a1d29] text-[#d4a84b] focus:ring-[#d4a84b] focus:ring-offset-0 disabled:opacity-50"
                />
                <span className="text-sm font-medium">
                  {size} employees
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Locations Section */}
      <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
        <h2 className="font-semibold text-white mb-1">Target Locations</h2>
        <p className="text-sm text-gray-400 mb-4">
          Add cities, states, or regions where your ideal customers are located
        </p>

        {/* Location Tags */}
        {locations.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {locations.map((location) => (
              <div
                key={location}
                className="inline-flex items-center gap-1.5 bg-[#1a1d29] border border-white/20 rounded-full px-3 py-1.5 text-sm text-white"
              >
                <span>{location}</span>
                <button
                  type="button"
                  onClick={() => removeLocation(location)}
                  className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Location Input */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Add location (e.g., San Francisco, California, USA)"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLocation(locationInput);
              }
            }}
            disabled={isSaving}
          />
          <button
            type="button"
            onClick={() => addLocation(locationInput)}
            disabled={!locationInput.trim() || isSaving}
            className="flex items-center gap-1.5 bg-[#d4a84b] text-[#1a1d29] rounded-md px-4 py-2 text-sm font-semibold hover:bg-[#e5b95c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Keywords Section */}
      <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
        <h2 className="font-semibold text-white mb-1">Profile Keywords</h2>
        <p className="text-sm text-gray-400 mb-4">
          Add keywords that might appear in your ideal customer's profile,
          headline, or about section
        </p>

        {/* Keyword Tags */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {keywords.map((keyword) => (
              <div
                key={keyword}
                className="inline-flex items-center gap-1.5 bg-[#1a1d29] border border-white/20 rounded-full px-3 py-1.5 text-sm text-white"
              >
                <span>{keyword}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Keyword Input */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Add keyword (e.g., insurance agent, financial advisor)"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword(keywordInput);
              }
            }}
            disabled={isSaving}
          />
          <button
            type="button"
            onClick={() => addKeyword(keywordInput)}
            disabled={!keywordInput.trim() || isSaving}
            className="flex items-center gap-1.5 bg-[#d4a84b] text-[#1a1d29] rounded-md px-4 py-2 text-sm font-semibold hover:bg-[#e5b95c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#d4a84b] text-[#1a1d29] rounded-md px-6 py-3 text-base font-semibold hover:bg-[#e5b95c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save ICP Configuration"}
        </button>
        <p className="text-xs text-gray-500 text-center mt-3">
          This configuration will be used to qualify and prioritize leads
        </p>
      </div>
    </div>
  );
}
