import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";

interface FilterSidebarProps {
  filters: {
    priceMin: string;
    priceMax: string;
    bedrooms: string;
    bathrooms: string;
    propertyType: string;
    schoolRating: number[];
    investmentScore: number[];
  };
  onFilterChange: (filters: any) => void;
}

export function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const updateFilter = (key: string, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="w-72 bg-slate-900/50 backdrop-blur-sm border-r border-slate-700/50 h-full overflow-y-auto p-4 space-y-6">
      <div>
        <h3 className="text-lg mb-4 text-white font-semibold">Filters</h3>
      </div>

      <div className="space-y-2">
        <Label className="text-gray-300">Price Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.priceMin}
            onChange={(e) => updateFilter("priceMin", e.target.value)}
            className="text-sm bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-500"
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.priceMax}
            onChange={(e) => updateFilter("priceMax", e.target.value)}
            className="text-sm bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-gray-300">Bedrooms</Label>
        <Select value={filters.bedrooms} onValueChange={(v) => updateFilter("bedrooms", v)}>
          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="1">1+</SelectItem>
            <SelectItem value="2">2+</SelectItem>
            <SelectItem value="3">3+</SelectItem>
            <SelectItem value="4">4+</SelectItem>
            <SelectItem value="5">5+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-gray-300">Bathrooms</Label>
        <Select value={filters.bathrooms} onValueChange={(v) => updateFilter("bathrooms", v)}>
          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="1">1+</SelectItem>
            <SelectItem value="2">2+</SelectItem>
            <SelectItem value="3">3+</SelectItem>
            <SelectItem value="4">4+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-gray-300">Property Type</Label>
        <Select value={filters.propertyType} onValueChange={(v) => updateFilter("propertyType", v)}>
          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="condo">Condo</SelectItem>
            <SelectItem value="townhouse">Townhouse</SelectItem>
            <SelectItem value="multi-family">Multi-Family</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-gray-300">School Rating</Label>
          <Badge variant="outline" className="border-slate-700 text-gray-300">{filters.schoolRating[0]}+</Badge>
        </div>
        <Slider
          value={filters.schoolRating}
          onValueChange={(v) => updateFilter("schoolRating", v)}
          max={10}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-gray-300">Investment Score</Label>
          <Badge variant="outline" className="border-slate-700 text-gray-300">{filters.investmentScore[0]}+</Badge>
        </div>
        <Slider
          value={filters.investmentScore}
          onValueChange={(v) => updateFilter("investmentScore", v)}
          max={10}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      <div className="pt-4 border-t border-slate-700">
        <h4 className="text-sm mb-3 text-gray-300">Climate Risk</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Flood Risk</span>
            <Badge variant="outline" className="bg-emerald-600/20 text-emerald-400 border-emerald-500/50">Low</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Heat Risk</span>
            <Badge variant="outline" className="bg-yellow-600/20 text-yellow-400 border-yellow-500/50">Medium</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Insurance Cost</span>
            <Badge variant="outline" className="bg-blue-600/20 text-blue-400 border-blue-500/50">Moderate</Badge>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-700">
        <h4 className="text-sm mb-3 text-gray-300">Commute Time</h4>
        <Input type="text" placeholder="Enter workplace address" className="text-sm bg-slate-800/50 border-slate-700 text-white placeholder:text-gray-500" />
      </div>
    </div>
  );
}
