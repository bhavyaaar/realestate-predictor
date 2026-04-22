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
  const visibleSavedInfo = savedInfo.filter((item) => item.category !== "price-predictor");
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
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

  useEffect(() => {
    if (isEditing) {
      setProfileMessage("");
    }
  }, [isEditing]);

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-400">Please log in to view your profile.</p>
      </div>
    );
  }

  const handleSave = async () => {
    const cleanedName = name.trim();
    const parsedAge = parseInt(age, 10);

    if (!cleanedName) {
      alert("Please enter your name.");
      return;
    }

    if (Number.isNaN(parsedAge) || parsedAge < 18 || parsedAge > 120) {
      alert("Please enter a valid age between 18 and 120.");
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage("");

    const success = await updateProfile({
      name: cleanedName,
      age: parsedAge,
      isFirstTimeBuyer,
    });

    setIsSavingProfile(false);

    if (success) {
      setIsEditing(false);
      setProfileMessage("Profile saved.");
    } else {
      setProfileMessage("Could not save profile.");
    }
  };

  const handleSaveInfo = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert("Please enter both title and content.");
      return;
    }

    setNoteMessage("");
    const success = await saveInfo(noteTitle.trim(), noteContent.trim(), "note");
    if (success) {
      setNoteTitle("");
      setNoteContent("");
      setNoteMessage("Quick note saved.");
    } else {
      setNoteMessage("Could not save quick note.");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="bg-white border border-stone-300 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-stone-800">
                <span className="flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-700" />
                  My Profile
                </span>
                {!isEditing ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-stone-300 text-stone-600 hover:bg-stone-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleSave} disabled={isSavingProfile} className="bg-stone-800 hover:bg-stone-700 disabled:opacity-70">
                    <Save className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-stone-600">
                      Name
                    </Label>
                    <Input
                      id="edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-stone-50 border-stone-300 text-stone-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-age" className="text-stone-600">
                      Age
                    </Label>
                    <Input
                      id="edit-age"
                      type="number"
                      min="18"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="bg-stone-50 border-stone-300 text-stone-800"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-firsttime"
                      checked={isFirstTimeBuyer}
                      onCheckedChange={(checked) => setIsFirstTimeBuyer(checked as boolean)}
                    />
                    <Label htmlFor="edit-firsttime" className="text-sm font-normal text-stone-600">
                      First-time home buyer
                    </Label>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-stone-700">
                      <User className="h-5 w-5 text-stone-400" />
                      <div>
                        <div className="text-sm text-stone-500">Name</div>
                        <div className="font-medium">{user.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-stone-700">
                      <Mail className="h-5 w-5 text-stone-400" />
                      <div>
                        <div className="text-sm text-stone-500">Email</div>
                        <div className="font-medium">{user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-stone-700">
                      <Calendar className="h-5 w-5 text-stone-400" />
                      <div>
                        <div className="text-sm text-stone-500">Age</div>
                        <div className="font-medium">{user.age} years old</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-stone-700">
                      <Home className="h-5 w-5 text-stone-400" />
                      <div>
                        <div className="text-sm text-stone-500">Buyer Status</div>
                        <Badge className={user.isFirstTimeBuyer ? "bg-emerald-600" : "bg-stone-700"}>
                          {user.isFirstTimeBuyer ? "First-Time Buyer" : "Experienced Buyer"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-200">
                    <div className="text-sm text-stone-500 mb-1">Member Since</div>
                    <div className="font-medium text-stone-700">{new Date(user.createdAt).toLocaleDateString()}</div>
                  </div>
                </>
              )}
              {profileMessage && <p className="text-sm text-green-700">{profileMessage}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border border-stone-300 shadow-md">
            <CardHeader>
              <CardTitle className="text-stone-800 flex items-center justify-between">
                <span>Saved Results</span>
                <Badge className="bg-stone-700">{visibleSavedInfo.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-3">
                  <div>
                    <div className="text-stone-800 font-medium">Quick Note</div>
                    <div className="text-xs text-stone-500">
                      Optional personal notes sit alongside your saved predictor and opportunity results.
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-title" className="text-stone-600">
                      Title
                    </Label>
                    <Input
                      id="note-title"
                      value={noteTitle}
                      onChange={(e) => {
                        setNoteTitle(e.target.value);
                        setNoteMessage("");
                      }}
                      placeholder="e.g. Prediction assumptions"
                      className="bg-stone-50 border-stone-300 text-stone-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-content" className="text-stone-600">
                      Content
                    </Label>
                    <Input
                      id="note-content"
                      value={noteContent}
                      onChange={(e) => {
                        setNoteContent(e.target.value);
                        setNoteMessage("");
                      }}
                      placeholder="Save key numbers, tradeoffs, and next steps"
                      className="bg-stone-50 border-stone-300 text-stone-800"
                    />
                  </div>
                  <Button type="button" onClick={handleSaveInfo} className="bg-stone-800 hover:bg-stone-700">
                    Save Info
                  </Button>
                  {noteMessage && <p className="text-sm text-stone-600">{noteMessage}</p>}
                </div>

                {visibleSavedInfo.length === 0 ? (
                  <p className="text-stone-500 text-sm">
                    No saved results yet. Save an opportunity result or personal note and it will appear here.
                  </p>
                ) : (
                  visibleSavedInfo.map((item) => (
                    <div key={item.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-stone-800 font-medium">{item.title}</div>
                            <Badge className="bg-stone-200 text-stone-700">{item.category}</Badge>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">{new Date(item.createdAt).toLocaleString()}</div>
                          <div className="mt-2 text-sm text-stone-600 whitespace-pre-wrap">{item.content}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-400"
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
        </div>
      </div>
    </div>
  );
}
