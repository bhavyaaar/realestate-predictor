import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { User, Mail, Calendar, Home, Edit2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function ProfilePage() {
  const { user, updateProfile, savedInfo, saveInfo, deleteInfo } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age.toString() || "");
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(user?.isFirstTimeBuyer || false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setAge(user?.age?.toString() || "");
    setIsFirstTimeBuyer(user?.isFirstTimeBuyer || false);
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Please log in to view your profile.</p>
      </div>
    );
  }

  const handleSave = async () => {
    const success = await updateProfile({
      name,
      age: parseInt(age),
      isFirstTimeBuyer,
    });
    if (success) {
      setIsEditing(false);
    }
  };

  const getAgeBasedRecommendations = () => {
    const userAge = user.age;
    if (userAge < 25) {
      return {
        title: "Young Professional Recommendations",
        description: "As a young professional, focus on starter homes and investment potential.",
        tips: [
          "Consider condos or townhomes with lower maintenance",
          "Look for areas with strong job growth and nightlife",
          "FHA loans available with as little as 3.5% down",
          "Build equity early for future upgrades",
        ],
        cities: ["Frisco", "McKinney", "Plano"],
        priceRange: "$250k - $400k",
      };
    } else if (userAge < 35) {
      return {
        title: "Growing Family Recommendations",
        description: "Perfect time to invest in a home with room to grow.",
        tips: [
          "Prioritize good school districts",
          "Look for 3-4 bedroom homes with yard space",
          "Consider commute times to major employment centers",
          "Focus on neighborhoods with family amenities",
        ],
        cities: ["Allen", "Prosper", "McKinney"],
        priceRange: "$350k - $550k",
      };
    } else if (userAge < 50) {
      return {
        title: "Established Professional Recommendations",
        description: "Upgrade to your dream home or investment properties.",
        tips: [
          "Consider luxury features and premium locations",
          "Investment properties for rental income",
          "Larger homes for entertaining and comfort",
          "Focus on long-term value and resale potential",
        ],
        cities: ["Frisco", "Plano", "Allen"],
        priceRange: "$500k - $800k+",
      };
    } else {
      return {
        title: "Pre-Retirement & Retiree Recommendations",
        description: "Find the perfect low-maintenance home for your lifestyle.",
        tips: [
          "Single-story homes for accessibility",
          "Active adult communities with amenities",
          "Lower maintenance properties (condos, townhomes)",
          "Proximity to healthcare and shopping",
        ],
        cities: ["Allen", "McKinney", "Frisco"],
        priceRange: "$300k - $600k",
      };
    }
  };

  const recommendations = getAgeBasedRecommendations();

  const handleSaveInfo = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert("Please enter both title and content.");
      return;
    }

    const success = await saveInfo(noteTitle.trim(), noteContent.trim(), "note");
    if (success) {
      setNoteTitle("");
      setNoteContent("");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center gap-2">
                  <User className="h-5 w-5 text-sky-400" />
                  My Profile
                </span>
                {!isEditing ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-slate-700 text-gray-300 hover:bg-slate-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="bg-sky-600 hover:bg-sky-500"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-gray-300">Name</Label>
                    <Input
                      id="edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-slate-900/50 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-age" className="text-gray-300">Age</Label>
                    <Input
                      id="edit-age"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="bg-slate-900/50 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-firsttime"
                      checked={isFirstTimeBuyer}
                      onCheckedChange={(checked) => setIsFirstTimeBuyer(checked as boolean)}
                    />
                    <Label htmlFor="edit-firsttime" className="text-sm font-normal text-gray-300">
                      First-time home buyer
                    </Label>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-300">
                      <User className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-400">Name</div>
                        <div className="font-medium">{user.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-300">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-400">Email</div>
                        <div className="font-medium">{user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-300">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-400">Age</div>
                        <div className="font-medium">{user.age} years old</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-gray-300">
                      <Home className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-400">Buyer Status</div>
                        <Badge className={user.isFirstTimeBuyer ? "bg-emerald-600" : "bg-sky-600"}>
                          {user.isFirstTimeBuyer ? "First-Time Buyer" : "Experienced Buyer"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <div className="text-sm text-gray-400 mb-1">Member Since</div>
                    <div className="font-medium text-gray-300">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Saved Results</span>
                <Badge className="bg-sky-600">{savedInfo.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 space-y-3">
                  <div>
                    <div className="text-white font-medium">Quick Note</div>
                    <div className="text-xs text-gray-400">Optional personal notes sit alongside your saved estimator and opportunity results.</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-title" className="text-gray-300">Title</Label>
                    <Input
                      id="note-title"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="e.g. Estimator assumptions"
                      className="bg-slate-900/50 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-content" className="text-gray-300">Content</Label>
                    <Input
                      id="note-content"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Save key numbers, tradeoffs, and next steps"
                      className="bg-slate-900/50 border-slate-700 text-white"
                    />
                  </div>
                  <Button onClick={handleSaveInfo} className="bg-sky-600 hover:bg-sky-500">
                    Save Info
                  </Button>
                </div>

                {savedInfo.length === 0 ? (
                  <p className="text-gray-400 text-sm">No saved results yet. Save a Cost Estimator or Opportunity Cost result and it will appear here.</p>
                ) : (
                  savedInfo.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-white font-medium">{item.title}</div>
                            <Badge className="bg-slate-700 text-slate-100">{item.category}</Badge>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{new Date(item.createdAt).toLocaleString()}</div>
                          <div className="mt-2 text-sm text-gray-300">{item.content}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-300 hover:text-red-200"
                          onClick={() => deleteInfo(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-sky-900/50 to-emerald-900/30 border-sky-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">{recommendations.title}</CardTitle>
              <p className="text-gray-300 text-sm">{recommendations.description}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Stats */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-400 mb-1">Recommended Cities</div>
                    <div className="font-semibold text-white">
                      {recommendations.cities.join(", ")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-400 mb-1">Price Range</div>
                    <div className="font-semibold text-white">
                      {recommendations.priceRange}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-400 mb-1">Your Age Group</div>
                    <div className="font-semibold text-white">{user.age} years</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tips */}
              <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Personalized Tips for You</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {recommendations.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1 h-5 w-5 rounded-full bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        </div>
                        <span className="text-gray-300">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {user.isFirstTimeBuyer && (
                <Card className="bg-gradient-to-br from-sky-600/20 to-blue-600/10 border-sky-500/50 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-2 text-white">First-Time Buyer Benefits</h3>
                    <p className="text-gray-300 text-sm mb-3">
                      You may qualify for special programs and incentives in Collin County!
                    </p>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Down payment assistance programs</li>
                      <li>• FHA loans with 3.5% down</li>
                      <li>• Texas State Affordable Housing Corporation loans</li>
                      <li>• Potential tax credits and deductions</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
