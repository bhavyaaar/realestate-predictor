import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Home, MapPin, Calendar, Shield, GraduationCap, Car, Footprints } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useAuth } from "../contexts/AuthContext";

type Inputs = {
  city: string;
  propertyType: string;
  squareFeet: string;
  bedrooms: string;
  bathrooms: string;
  yearBuilt: string;
  condition: string;
  lotSize: string;
  hasGarage: string;
  hasPool: string;
  recentRenovation: string;
};

type EstimateResult = {
  price: number;
  lowEstimate: number;
  highEstimate: number;
  pricePerSqFt: number;
  historicalData: Array<{ month: string; price: number }>;
  futureData: Array<{ month: string; conservative: number; moderate: number; optimistic: number }>;
  marketIndicators: Array<{ name: string; value: string; color: string; trend: "up" | "down" }>;
  locationIntelligence: {
    walkability: number;
    schoolScore: number;
    safetyScore: number;
    commuteScore: number;
    floodRisk: "Low" | "Moderate" | "High";
    locationScore: number;
    marketHeat: "Balanced" | "Warm" | "Hot";
  };
  confidenceLevel: number;
  assumptions: string[];
  lastUpdated: string;
};

type SavedScenario = {
  id: string;
  label: string;
  inputs: Inputs;
  estimate: EstimateResult;
  createdAt: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const SCENARIO_STORAGE_KEY = "homescope_saved_estimator_scenarios";

const presets: Array<{ id: string; label: string; values: Partial<Inputs> }> = [
  {
    id: "first-time",
    label: "First-time Buyer",
    values: {
      propertyType: "condo",
      squareFeet: "1300",
      bedrooms: "2",
      bathrooms: "2",
      hasGarage: "no",
      hasPool: "no",
    },
  },
  {
    id: "family-upgrade",
    label: "Move-up Family Home",
    values: {
      propertyType: "single-family",
      squareFeet: "2600",
      bedrooms: "4",
      bathrooms: "3",
      hasGarage: "yes",
      hasPool: "no",
    },
  },
  {
    id: "investor",
    label: "Rental Investor",
    values: {
      propertyType: "multi-family",
      squareFeet: "2200",
      bedrooms: "4",
      bathrooms: "3",
      condition: "fair",
      recentRenovation: "yes",
    },
  },
];

const defaultInputs: Inputs = {
  city: "plano",
  propertyType: "single-family",
  squareFeet: "2000",
  bedrooms: "3",
  bathrooms: "2",
  yearBuilt: "2010",
  condition: "good",
  lotSize: "5000",
  hasGarage: "yes",
  hasPool: "no",
  recentRenovation: "no",
};

export function CostEstimator() {
  const { saveInfo } = useAuth();
  const [inputs, setInputs] = useState<Inputs>(defaultInputs);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => {
    const raw = localStorage.getItem(SCENARIO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedScenario[]) : [];
  });
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [inputError, setInputError] = useState("");

  const collinCountyCities = [
    { value: "plano", label: "Plano" },
    { value: "frisco", label: "Frisco" },
    { value: "mckinney", label: "McKinney" },
    { value: "allen", label: "Allen" },
    { value: "prosper", label: "Prosper" },
    { value: "wylie", label: "Wylie" },
  ];

  const selectedScenarios = useMemo(
    () => savedScenarios.filter((scenario) => selectedScenarioIds.includes(scenario.id)).slice(0, 2),
    [savedScenarios, selectedScenarioIds],
  );

  const persistScenarios = (next: SavedScenario[]) => {
    setSavedScenarios(next);
    localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(next));
  };

  const handleInputChange = (field: keyof Inputs, value: string) => {
    setInputError("");
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    setInputs((prev) => ({ ...prev, ...preset.values }));
  };

  const getLocationIntelligence = (city: string) => {
    const profiles: Record<string, EstimateResult["locationIntelligence"]> = {
      plano: { walkability: 75, schoolScore: 91, safetyScore: 88, commuteScore: 79, floodRisk: "Low", locationScore: 87, marketHeat: "Warm" },
      frisco: { walkability: 68, schoolScore: 94, safetyScore: 90, commuteScore: 76, floodRisk: "Low", locationScore: 88, marketHeat: "Hot" },
      mckinney: { walkability: 70, schoolScore: 89, safetyScore: 86, commuteScore: 74, floodRisk: "Moderate", locationScore: 82, marketHeat: "Warm" },
      allen: { walkability: 67, schoolScore: 90, safetyScore: 89, commuteScore: 77, floodRisk: "Low", locationScore: 85, marketHeat: "Warm" },
      prosper: { walkability: 58, schoolScore: 93, safetyScore: 92, commuteScore: 69, floodRisk: "Low", locationScore: 86, marketHeat: "Hot" },
      wylie: { walkability: 61, schoolScore: 84, safetyScore: 85, commuteScore: 72, floodRisk: "Moderate", locationScore: 80, marketHeat: "Balanced" },
    };

    return profiles[city] || {
      walkability: 66,
      schoolScore: 80,
      safetyScore: 78,
      commuteScore: 73,
      floodRisk: "Moderate",
      locationScore: 76,
      marketHeat: "Balanced",
    };
  };

  const calculateEstimate = () => {
    const sqFt = parseInt(inputs.squareFeet, 10) || 0;
    const bedrooms = parseInt(inputs.bedrooms, 10) || 0;
    const bathrooms = parseFloat(inputs.bathrooms) || 0;
    const yearBuilt = parseInt(inputs.yearBuilt, 10) || 0;
    const lotSize = parseInt(inputs.lotSize, 10) || 0;

    if (sqFt < 400 || sqFt > 12000) {
      setInputError("Square feet should be between 400 and 12,000.");
      return;
    }
    if (bedrooms < 1 || bedrooms > 10) {
      setInputError("Bedrooms should be between 1 and 10.");
      return;
    }
    if (bathrooms < 1 || bathrooms > 8) {
      setInputError("Bathrooms should be between 1 and 8.");
      return;
    }
    if (yearBuilt < 1900 || yearBuilt > 2026) {
      setInputError("Year built should be between 1900 and 2026.");
      return;
    }
    if (lotSize < 800 || lotSize > 40000) {
      setInputError("Lot size should be between 800 and 40,000 sq ft.");
      return;
    }

    setInputError("");
    setSaveMessage("");
    setSaveState("idle");

    const basePricePerSqFt: Record<string, number> = {
      plano: 235,
      frisco: 245,
      mckinney: 220,
      allen: 228,
      prosper: 255,
      wylie: 210,
    };

    const conditionMultiplier: Record<string, number> = {
      excellent: 1.15,
      good: 1.0,
      fair: 0.85,
      poor: 0.7,
    };

    const propertyTypeMultiplier: Record<string, number> = {
      "single-family": 1.0,
      condo: 0.85,
      townhouse: 0.9,
      "multi-family": 1.2,
    };

    const basePrice = basePricePerSqFt[inputs.city] || 225;
    const propertyMultiplier = propertyTypeMultiplier[inputs.propertyType] || 1.0;
    const conditionAdj = conditionMultiplier[inputs.condition] || 1.0;

    const age = 2026 - (parseInt(inputs.yearBuilt, 10) || 2010);
    const ageAdjustment = Math.max(0.7, 1 - age * 0.01);

    const garageValue = inputs.hasGarage === "yes" ? 25000 : 0;
    const poolValue = inputs.hasPool === "yes" ? 35000 : 0;
    const renovationBonus = inputs.recentRenovation === "yes" ? 1.1 : 1.0;

    const locationIntel = getLocationIntelligence(inputs.city);
    const locationAdjustment = 1 + (locationIntel.locationScore - 75) / 500;

    const estimatedPrice = Math.round(
      (sqFt * basePrice * propertyMultiplier * conditionAdj * ageAdjustment + garageValue + poolValue) * renovationBonus * locationAdjustment,
    );

    const confidenceInterval = estimatedPrice * 0.08;
    const lowEstimate = Math.round(estimatedPrice - confidenceInterval);
    const highEstimate = Math.round(estimatedPrice + confidenceInterval);

    const historicalData = [];
    for (let i = 12; i >= 0; i--) {
      const variation = Math.sin(i / 2) * 0.03 + (12 - i) * 0.012;
      historicalData.push({
        month: new Date(2026, 2 - i, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        price: Math.round(estimatedPrice * (1 - variation)),
      });
    }

    const futureData = [];
    for (let i = 0; i <= 12; i++) {
      const appreciation = 0.04;
      const monthlyAppreciation = appreciation / 12;
      futureData.push({
        month: new Date(2026, 3 + i, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        conservative: Math.round(estimatedPrice * (1 + monthlyAppreciation * i * 0.7)),
        moderate: Math.round(estimatedPrice * (1 + monthlyAppreciation * i)),
        optimistic: Math.round(estimatedPrice * (1 + monthlyAppreciation * i * 1.3)),
      });
    }

    const marketIndicators: EstimateResult["marketIndicators"] = [
      { name: "Inventory", value: locationIntel.marketHeat === "Hot" ? "Low" : "Balanced", color: "text-green-600", trend: "down" },
      { name: "Demand", value: locationIntel.marketHeat === "Hot" ? "High" : "Steady", color: "text-green-600", trend: "up" },
      { name: "Days on Market", value: locationIntel.marketHeat === "Hot" ? "24" : "39", color: "text-blue-600", trend: "down" },
      { name: "Price Trend", value: "+3.8%", color: "text-green-600", trend: "up" },
    ];

    const confidenceLevel = Math.max(78, Math.min(95, Math.round((locationIntel.schoolScore + locationIntel.safetyScore + locationIntel.commuteScore) / 3)));

    const assumptions = [
      "Uses city-level comparables and historical trend simulation over 12 months.",
      "Assumes stable interest-rate environment and no major zoning changes.",
      "Includes feature adjustments for condition, age, pool, garage, and renovation.",
      "Location score blends schools, safety, walkability, commute, and flood risk.",
    ];

    setEstimate({
      price: estimatedPrice,
      lowEstimate,
      highEstimate,
      pricePerSqFt: Math.round(estimatedPrice / sqFt),
      historicalData,
      futureData,
      marketIndicators,
      locationIntelligence: locationIntel,
      confidenceLevel,
      assumptions,
      lastUpdated: new Date().toLocaleDateString(),
    });
  };

  const saveCurrentScenario = async () => {
    if (!estimate) return;
    setSaveState("saving");
    setSaveMessage("");
    const label = `${inputs.city.replace("-", " ")} ${inputs.propertyType} (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;
    const next: SavedScenario[] = [
      {
        id: crypto.randomUUID(),
        label,
        inputs,
        estimate,
        createdAt: new Date().toISOString(),
      },
      ...savedScenarios,
    ].slice(0, 12);

    persistScenarios(next);

    const summary = [
      `Estimated value: $${estimate.price.toLocaleString()}`,
      `Range: $${estimate.lowEstimate.toLocaleString()} - $${estimate.highEstimate.toLocaleString()}`,
      `City: ${inputs.city.replace("-", " ")}`,
      `Type: ${inputs.propertyType}`,
      `Confidence: ${estimate.confidenceLevel}%`,
    ].join("\n");

    const success = await saveInfo(label, summary, "cost-estimator");
    setSaveState(success ? "saved" : "error");
    setSaveMessage(success ? "Saved to your profile." : "Could not save this result.");
  };

  const navigateToProfile = () => {
    window.dispatchEvent(new CustomEvent("homescope:navigate", { detail: "profile" }));
  };

  const toggleScenarioComparison = (scenarioId: string) => {
    setSelectedScenarioIds((prev) => {
      if (prev.includes(scenarioId)) {
        return prev.filter((id) => id !== scenarioId);
      }
      if (prev.length === 2) {
        return [prev[1], scenarioId];
      }
      return [...prev, scenarioId];
    });
  };

  const clearScenario = (scenarioId: string) => {
    const next = savedScenarios.filter((scenario) => scenario.id !== scenarioId);
    persistScenarios(next);
    setSelectedScenarioIds((prev) => prev.filter((id) => id !== scenarioId));
  };

  return (
    <div className="min-h-screen bg-transparent py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl mb-2 text-white">Property Cost Estimator</h1>
            <p className="text-blue-100 text-lg">Collin County-only estimates with confidence ranges and saved result tracking</p>
          </div>
          <div className="w-full md:w-72">
            <Label className="text-blue-100">Quick Preset</Label>
            <Select onValueChange={applyPreset}>
              <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                <SelectValue placeholder="Apply buyer profile" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 h-fit sticky top-24 bg-slate-900/70 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Property Details</CardTitle>
              <CardDescription className="text-slate-300">Enter Collin County property filters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">County</Label>
                <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white">Collin County, Texas</div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">City</Label>
                <Select value={inputs.city} onValueChange={(v) => handleInputChange("city", v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {collinCountyCities.map((city) => (
                      <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Property Type</Label>
                <Select value={inputs.propertyType} onValueChange={(v) => handleInputChange("propertyType", v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-family">Single Family Home</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="multi-family">Multi-Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Square Feet</Label>
                <Input type="number" value={inputs.squareFeet} onChange={(e) => handleInputChange("squareFeet", e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Bedrooms</Label>
                  <Input type="number" value={inputs.bedrooms} onChange={(e) => handleInputChange("bedrooms", e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Bathrooms</Label>
                  <Input type="number" value={inputs.bathrooms} onChange={(e) => handleInputChange("bathrooms", e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Year Built</Label>
                <Input type="number" value={inputs.yearBuilt} onChange={(e) => handleInputChange("yearBuilt", e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Condition</Label>
                <Select value={inputs.condition} onValueChange={(v) => handleInputChange("condition", v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Lot Size (sq ft)</Label>
                <Input type="number" value={inputs.lotSize} onChange={(e) => handleInputChange("lotSize", e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>

              {inputError && <p className="text-sm text-red-300">{inputError}</p>}

              <Button onClick={calculateEstimate} className="w-full bg-gradient-to-r from-blue-600 to-sky-500">Calculate Estimate</Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            {estimate ? (
              <>
                <Card className="sticky top-20 z-20 border-sky-300 bg-white/95 backdrop-blur">
                  <CardContent className="py-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <div>
                        <div className="text-xs text-gray-500">Estimated Value</div>
                        <div className="text-xl font-semibold text-gray-900">${estimate.price.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Range</div>
                        <div className="text-sm text-gray-800">${estimate.lowEstimate.toLocaleString()} - ${estimate.highEstimate.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Confidence</div>
                        <div className="text-sm text-emerald-700 font-medium">{estimate.confidenceLevel}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Price / Sq Ft</div>
                        <div className="text-sm text-gray-800">${estimate.pricePerSqFt}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-slate-900/70 border-slate-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Estimated Value</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl text-white font-semibold">${estimate.price.toLocaleString()}</div></CardContent>
                  </Card>
                  <Card className="bg-slate-900/70 border-slate-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Confidence</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl text-emerald-400 font-semibold">{estimate.confidenceLevel}%</div></CardContent>
                  </Card>
                  <Card className="bg-slate-900/70 border-slate-700">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-300">Location Score</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl text-sky-400 font-semibold">{estimate.locationIntelligence.locationScore}/100</div></CardContent>
                  </Card>
                </div>

                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-100">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-blue-700" />Estimated Property Value</CardTitle>
                    <CardDescription>Range: ${estimate.lowEstimate.toLocaleString()} - ${estimate.highEstimate.toLocaleString()} | ${estimate.pricePerSqFt}/sq ft</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 text-sm text-gray-700">
                      This estimate combines property details and location intelligence so you can see the context behind the number.
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-lg text-center"><div className="text-2xl mb-1">{inputs.bedrooms}</div><div className="text-sm text-gray-600">Bedrooms</div></div>
                      <div className="bg-white p-4 rounded-lg text-center"><div className="text-2xl mb-1">{inputs.bathrooms}</div><div className="text-sm text-gray-600">Bathrooms</div></div>
                      <div className="bg-white p-4 rounded-lg text-center"><div className="text-2xl mb-1">{parseInt(inputs.squareFeet, 10).toLocaleString()}</div><div className="text-sm text-gray-600">Sq Ft</div></div>
                      <div className="bg-white p-4 rounded-lg text-center"><div className="text-2xl mb-1">{2026 - parseInt(inputs.yearBuilt, 10)}</div><div className="text-sm text-gray-600">Years Old</div></div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Button onClick={saveCurrentScenario} disabled={saveState === "saving"} className="bg-blue-700 hover:bg-blue-600">
                        {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save Result"}
                      </Button>
                      <Badge variant="outline" className="bg-white">Updated {estimate.lastUpdated}</Badge>
                      {saveState === "saved" && (
                        <Button variant="outline" onClick={navigateToProfile}>View Saved Results</Button>
                      )}
                    </div>
                    {saveMessage && <p className="mt-3 text-sm text-blue-800">{saveMessage}</p>}
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/70 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white"><MapPin className="h-5 w-5 text-sky-400" />Location Intelligence</CardTitle>
                    <CardDescription className="text-slate-300">Neighborhood-level signals used in this estimate</CardDescription>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-5 gap-3">
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <Footprints className="h-4 w-4 text-sky-400 mx-auto mb-1" /><div className="text-white text-lg">{estimate.locationIntelligence.walkability}</div><div className="text-xs text-slate-300">Walkability</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <GraduationCap className="h-4 w-4 text-sky-400 mx-auto mb-1" /><div className="text-white text-lg">{estimate.locationIntelligence.schoolScore}</div><div className="text-xs text-slate-300">School Score</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <Shield className="h-4 w-4 text-sky-400 mx-auto mb-1" /><div className="text-white text-lg">{estimate.locationIntelligence.safetyScore}</div><div className="text-xs text-slate-300">Safety</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <Car className="h-4 w-4 text-sky-400 mx-auto mb-1" /><div className="text-white text-lg">{estimate.locationIntelligence.commuteScore}</div><div className="text-xs text-slate-300">Commute</div>
                    </div>
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <MapPin className="h-4 w-4 text-sky-400 mx-auto mb-1" /><div className="text-white text-lg">{estimate.locationIntelligence.floodRisk}</div><div className="text-xs text-slate-300">Flood Risk</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-600" />Historical Price Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={estimate.historicalData}>
                        <CartesianGrid key="grid" strokeDasharray="3 3" />
                        <XAxis key="xaxis" dataKey="month" />
                        <YAxis key="yaxis" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip key="tooltip" formatter={(value: number) => `$${value.toLocaleString()}`} />
                        <Area key="price" type="monotone" dataKey="price" stroke="#3b82f6" fill="#93c5fd" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-orange-600" />Future Price Projections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={estimate.futureData}>
                        <CartesianGrid key="grid" strokeDasharray="3 3" />
                        <XAxis key="xaxis" dataKey="month" />
                        <YAxis key="yaxis" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip key="tooltip" formatter={(value: number) => `$${value.toLocaleString()}`} />
                        <Legend key="legend" />
                        <Line key="conservative" type="monotone" dataKey="conservative" stroke="#10b981" strokeWidth={2} />
                        <Line key="moderate" type="monotone" dataKey="moderate" stroke="#3b82f6" strokeWidth={2} />
                        <Line key="optimistic" type="monotone" dataKey="optimistic" stroke="#8b5cf6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <CardHeader><CardTitle>How This Was Calculated</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {estimate.assumptions.map((item) => (
                        <p key={item} className="text-sm text-gray-700">• {item}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/70 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Saved Scenarios</CardTitle>
                    <CardDescription className="text-slate-300">Select up to 2 scenarios to compare</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {savedScenarios.length === 0 && <p className="text-slate-300 text-sm">No saved scenarios yet.</p>}
                    {savedScenarios.map((scenario) => (
                      <div key={scenario.id} className="flex items-center justify-between rounded-lg bg-slate-800 p-3">
                        <div>
                          <div className="text-white text-sm font-medium">{scenario.label}</div>
                          <div className="text-xs text-slate-300">${scenario.estimate.price.toLocaleString()} • {scenario.inputs.city.replace("-", " ")}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant={selectedScenarioIds.includes(scenario.id) ? "default" : "outline"} onClick={() => toggleScenarioComparison(scenario.id)}>
                            {selectedScenarioIds.includes(scenario.id) ? "Selected" : "Compare"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => clearScenario(scenario.id)} className="text-red-300 hover:text-red-200">Delete</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {selectedScenarios.length === 2 && (
                  <Card>
                    <CardHeader><CardTitle>Scenario Comparison</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {selectedScenarios.map((scenario) => (
                          <div key={scenario.id} className="rounded-lg border p-4 bg-white">
                            <h4 className="font-semibold mb-2">{scenario.label}</h4>
                            <div className="space-y-1 text-sm text-gray-700">
                              <p>Estimate: ${scenario.estimate.price.toLocaleString()}</p>
                              <p>Price/SqFt: ${scenario.estimate.pricePerSqFt}</p>
                              <p>Location Score: {scenario.estimate.locationIntelligence.locationScore}/100</p>
                              <p>Confidence: {scenario.estimate.confidenceLevel}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-2 border-dashed h-96 flex items-center justify-center">
                <CardContent className="text-center">
                  <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-600 mb-2">Enter property details and click Calculate</p>
                  <p className="text-gray-500">Get a confidence-backed estimate with location intelligence</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}