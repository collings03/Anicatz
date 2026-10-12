// frontend/lib/profile.ts
// Saves the profile through authFetch from lib/auth.ts, so an expired access token
// is renewed automatically and the request is retried once.
import { API, authFetch } from "@/lib/auth";

// Change this path to the real profile endpoint of your Django backend.
const PROFILE_PATH = "/auth/profile/";

export type ProfileUpdate = {
  display_name?: string;
  avatar?: string; // id or URL of the chosen avatar, whatever your backend expects
};

/** Turns any failed response into a readable message. */
async function errorMessage(res: Response): Promise<string> {
  if (res.status === 401) return "Your session has expired. Please log in again.";
  const text = await res.text();
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const msg = Object.values(body).flat().join(" ");
    return msg || `Could not save (HTTP ${res.status}).`;
  } catch {
    return `Server error (HTTP ${res.status}). Check the backend logs.`;
  }
}

export async function saveProfile(update: ProfileUpdate) {
  let res: Response;
  try {
    res = await authFetch(`${API}${PROFILE_PATH}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json();
}

/* How to use it in your profile settings component:

  import { saveProfile } from "@/lib/profile";

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    setError("");
    try {
      await saveProfile({ display_name: name, avatar: selectedAvatar });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }
*/