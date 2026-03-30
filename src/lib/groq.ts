// ─────────────────────────────────────────────────────────────
// Groq AI client
// Groq is free, fast, and works globally including India.
// Get your key at: https://console.groq.com/keys
// ─────────────────────────────────────────────────────────────

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const TEXT_MODEL  = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"; // actually sees images

export const getGroqKey = (): string => {
  const viteEnvKey = import.meta.env.VITE_GROQ_API_KEY;
  const localStorageKey = typeof window !== 'undefined'
    ? localStorage.getItem('REMINIQ_GROQ_API_KEY')
    : null;

  const cleanKey = (key: any): string | null => {
    if (!key || key === "undefined" || key === "null" || key === "YOUR_GROQ_API_KEY") return null;
    return String(key).trim();
  };

  const apiKey = cleanKey(viteEnvKey) || cleanKey(localStorageKey);

  if (!apiKey) {
    throw new Error(
      "Groq API Key is missing.\n\n" +
      "On Vercel: add VITE_GROQ_API_KEY to your project's Environment Variables.\n" +
      "Locally: add VITE_GROQ_API_KEY=\"your-key\" to a .env file.\n" +
      "Or paste it via the gear icon in the app.\n\n" +
      "Get a free key at: https://console.groq.com/keys"
    );
  }

  return apiKey;
};

// ─────────────────────────────────────────────────────────────
// Core text chat wrapper
// ─────────────────────────────────────────────────────────────
async function groqChat(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  jsonMode = true
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = (err as any)?.error?.message || response.statusText;
    const status = response.status;
    if (status === 401) throw new Error("Invalid Groq API key. Please check your key at console.groq.com/keys");
    if (status === 429) throw new Error("Groq rate limit hit. Please wait a moment and try again.");
    throw new Error(`Groq API error (${status}): ${msg}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from Groq.");
  return text;
}

// ─────────────────────────────────────────────────────────────
// Vision wrapper — actually looks at the image URL
// ─────────────────────────────────────────────────────────────
async function groqVision(
  apiKey: string,
  imageUrl: string,
  prompt: string
): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq Vision error (${response.status}): ${(err as any)?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

function parseJsonSafe(text: string): any {
  try { return JSON.parse(text); }
  catch { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Memory {
  id: string;
  type: 'photo' | 'voice' | 'text' | 'music';
  title: string;
  desc: string;
  mood: string;
  location?: string;
  date: string;
  photoUrl?: string;
  audioUrl?: string;
  musicUrl?: string;
  transcript?: string;
  emotion?: string;
  music?: {
    song: string;
    artist: string;
    albumArt?: string;
  };
}

export interface DayReaction {
  date: string;
  emoji: string;
  journal?: string;
  photoUrl?: string;
  music?: {
    song: string;
    artist: string;
  };
}

export interface Album {
  id: string;
  title: string;
  memoryIds: string[];
  journalText?: string;
  linkedMemoryIds?: string[];
  voiceNoteUrl?: string;
}

// ─────────────────────────────────────────────────────────────
// PASS 0 — Vision analysis: actually look at each photo
// ─────────────────────────────────────────────────────────────

interface VisualAnalysis {
  id: string;
  visualTone: string;       // e.g. "warm golden", "cool blue", "dark moody"
  lighting: string;         // e.g. "golden hour", "overcast", "harsh midday", "night"
  setting: string;          // e.g. "mountain trail", "city street", "cozy cafe", "beach"
  colors: string;           // dominant color palette
  mood: string;             // visual emotional mood
  subjects: string;         // what/who is in the photo
  weather: string;          // if outdoors: sunny/rainy/foggy/etc
  timeOfDay: string;        // morning/afternoon/evening/night/unknown
  energyLevel: string;      // high/medium/low/quiet
}

async function analysePhotoWithVision(
  apiKey: string,
  memory: Memory
): Promise<VisualAnalysis | null> {
  if (!memory.photoUrl) return null;

  const prompt = `Analyse this photo for grouping into a personal memory album. Respond ONLY with a JSON object, no markdown.

Return exactly this structure:
{
  "visualTone": "2-3 word tone e.g. warm golden, cool moody, soft pastel, dark dramatic",
  "lighting": "e.g. golden hour, overcast grey, harsh sun, soft indoor, night neon",
  "setting": "e.g. mountain trail, city street, cozy cafe interior, sandy beach, home bedroom",
  "colors": "dominant colors e.g. earthy browns and greens, blues and whites, warm oranges",
  "mood": "single emotional word the photo evokes e.g. peaceful, adventurous, romantic, melancholy, joyful",
  "subjects": "briefly what or who is in the photo e.g. person smiling, empty road, food on table",
  "weather": "if outdoors: sunny / cloudy / rainy / foggy / snowy. If indoors: indoor",
  "timeOfDay": "morning / afternoon / evening / night / unknown",
  "energyLevel": "high / medium / low / quiet"
}`;

  try {
    const text = await groqVision(apiKey, memory.photoUrl, prompt);
    const parsed = parseJsonSafe(text);
    return { id: memory.id, ...parsed };
  } catch (e) {
    console.warn(`Vision analysis failed for memory ${memory.id}:`, e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// sortMemoriesIntoAlbums — 3-pass: see → analyse → group
// ─────────────────────────────────────────────────────────────

export async function sortMemoriesIntoAlbums(memories: Memory[]): Promise<Album[]> {
  if (memories.length === 0) return [];

  const apiKey = getGroqKey();

  // ── PASS 0: Vision — actually look at each photo ─────────────
  const photoMemories = memories.filter(m => m.type === 'photo' && m.photoUrl);

  // Run vision analysis in parallel (max 5 at a time to avoid rate limits)
  const visionResults: VisualAnalysis[] = [];
  const BATCH = 5;
  for (let i = 0; i < photoMemories.length; i += BATCH) {
    const batch = photoMemories.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(m => analysePhotoWithVision(apiKey, m))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) visionResults.push(r.value);
    }
  }

  const visionMap: Record<string, VisualAnalysis> = {};
  for (const v of visionResults) visionMap[v.id] = v;

  // ── PASS 1: Semantic tagging for non-photo memories ──────────
  const nonPhotoMemories = memories.filter(m => !visionMap[m.id]);
  let tagMap: Record<string, any> = {};

  if (nonPhotoMemories.length > 0) {
    const pass1System = `You are a memory analyst. Extract semantic tags from memory metadata.
Always respond with valid JSON only — no markdown, no extra text.`;

    const pass1User = `Tag each memory. Return exactly:
{ "tagged": [ { "id": "...", "visualTone": "...", "settingType": "...", "energyLevel": "...", "timeOfDay": "...", "season": "...", "primaryEmotion": "...", "locationCluster": "...", "suggestedTheme": "..." } ] }

Memories:
${JSON.stringify(nonPhotoMemories.map(m => ({
  id: m.id, title: m.title, desc: m.desc,
  location: m.location || 'Unknown', date: m.date, mood: m.mood, type: m.type
})), null, 2)}`;

    try {
      const t = await groqChat(apiKey, pass1System, pass1User, true);
      const p = parseJsonSafe(t);
      const tagged: any[] = Array.isArray(p) ? p : (p.tagged ?? []);
      for (const t of tagged) tagMap[t.id] = t;
    } catch (e) {
      console.warn("Pass 1 tagging failed:", e);
    }
  }

  // ── Build enriched summary for PASS 2 ────────────────────────
  const enrichedSummary = memories.map(m => {
    const vision = visionMap[m.id];
    const tags = tagMap[m.id] || {};

    if (vision) {
      // Rich visual description from actual image analysis
      return [
        `ID: ${m.id}`,
        `Title: "${m.title}"`,
        `Type: photo (VISUALLY ANALYSED)`,
        `[VISUAL] Tone: ${vision.visualTone} | Lighting: ${vision.lighting} | Colors: ${vision.colors}`,
        `[VISUAL] Setting: ${vision.setting} | Weather: ${vision.weather} | TimeOfDay: ${vision.timeOfDay}`,
        `[VISUAL] Mood: ${vision.mood} | Energy: ${vision.energyLevel} | Subjects: ${vision.subjects}`,
        `[META] Location: ${m.location || 'Unknown'} | Date: ${m.date} | UserMood: ${m.mood}`,
        `[META] Desc: "${m.desc}"`,
      ].join('\n  ');
    } else {
      // Fallback for non-photo or failed vision
      return [
        `ID: ${m.id}`,
        `Title: "${m.title}"`,
        `Type: ${m.type}`,
        `[META] Location: ${m.location || 'Unknown'} | Date: ${m.date} | Mood: ${m.mood}`,
        `[META] Season: ${tags.season || '?'} | TimeOfDay: ${tags.timeOfDay || '?'}`,
        `[META] VisualTone: ${tags.visualTone || '?'} | Emotion: ${tags.primaryEmotion || m.mood}`,
        `[META] Theme: ${tags.suggestedTheme || m.mood} | Desc: "${m.desc}"`,
      ].join('\n  ');
    }
  }).join('\n\n');

  // ── PASS 2: Group into albums using all signals ───────────────
  const pass2System = `You are a thoughtful memory curator creating personal photo albums.
You have actual visual analysis (from computer vision) AND metadata for each memory.
Prioritise the [VISUAL] signals above all else — they represent what the photo actually looks like.
Always respond with valid JSON only — no markdown, no extra text.`;

  const pass2User = `Group these memories into cohesive albums.

GROUPING PRIORITY (strict order):
1. VISUAL COHERENCE (most important) — same visual tone + lighting + color palette = strongest bond.
   A warm golden sunset photo and a cool blue rainy photo NEVER share an album even if same location.
2. SETTING & SUBJECT — outdoor nature photos together, urban/social together, home/intimate together.
3. EMOTIONAL MOOD — photos evoking the same feeling belong together.
4. LOCATION CLUSTER — same place strengthens a group only if visual tone also matches.
5. TIME/DATE — weakest signal, only used to break ties.

RULES:
- Every memory in EXACTLY ONE album — no memory left out, no duplicates.
- 2–5 albums total. Never a 1-memory album unless ≤2 memories total.
- Album titles: 3–5 words, poetic and specific. NO generic titles like "Happy Memories" or "Photos".
- Group by VISUAL VIBE, not by date. Two golden-hour beach photos from different months > a beach photo and a rainy city photo from the same day.

Memories with full analysis:
${enrichedSummary}

Return JSON:
{
  "albums": [
    {
      "title": "Poetic Album Title",
      "rationale": "one sentence explaining the visual/emotional thread linking these memories",
      "memoryIds": ["id1", "id2"]
    }
  ]
}`;

  const pass2Text = await groqChat(apiKey, pass2System, pass2User, true);
  const pass2 = parseJsonSafe(pass2Text);
  const albumsData: any[] = Array.isArray(pass2) ? pass2 : (pass2.albums ?? []);

  if (!albumsData.length) {
    throw new Error("Could not group memories into albums. Try adding more descriptive titles or moods.");
  }

  // Safety net: assign any missed memories to the largest album
  const assignedIds = new Set(albumsData.flatMap((a: any) => a.memoryIds || []));
  const unassigned = memories.filter(m => !assignedIds.has(m.id));
  if (unassigned.length > 0) {
    const largest = albumsData.reduce((a: any, b: any) =>
      (a.memoryIds?.length || 0) >= (b.memoryIds?.length || 0) ? a : b
    );
    largest.memoryIds.push(...unassigned.map((m: Memory) => m.id));
  }

  return albumsData.map((a: any) => ({
    id: Math.random().toString(36).substr(2, 9),
    title: a.title || "Untitled Album",
    memoryIds: a.memoryIds || [],
    journalText: a.rationale || undefined,
  }));
}

// ─────────────────────────────────────────────────────────────
// searchMemories
// ─────────────────────────────────────────────────────────────

export async function searchMemories(query: string, memories: Memory[]) {
  if (memories.length === 0) return null;

  const apiKey = getGroqKey();

  const memoryContext = memories.map(m => ({
    id: m.id, title: m.title, desc: m.desc,
    type: m.type, mood: m.mood, location: m.location,
  }));

  const systemPrompt = `You are the librarian of "Reminiq", a personal memory journal app.
Always respond with valid JSON only — no markdown, no extra text.`;

  const userPrompt = `A user is searching for a memory with the query: "${query}".

Memories:
${JSON.stringify(memoryContext, null, 2)}

Return:
{
  "intro": "A poetic, nostalgic one-sentence introduction to the memory you found.",
  "memoryId": "the-matching-id"
}

If nothing matches:
{
  "intro": "I couldn't find that specific moment, but your vault is still full of stories.",
  "memoryId": null
}`;

  try {
    const text = await groqChat(apiKey, systemPrompt, userPrompt, true);
    return parseJsonSafe(text);
  } catch (error: any) {
    console.error("Groq search error:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// chatWithMemories  (used by SmartChat)
// ─────────────────────────────────────────────────────────────

export async function chatWithMemories(
  userMessage: string,
  memories: Memory[]
): Promise<{ action: 'chat' | 'create_album'; message: string; album?: Omit<Album, 'id'> }> {
  const apiKey = getGroqKey();

  const memorySummary = memories.map(m => ({
    id: m.id, title: m.title, desc: m.desc, mood: m.mood, date: m.date,
  }));

  const systemPrompt = `You are a helpful AI assistant for a personal memory journal app called Reminiq.
Always respond with valid JSON only — no markdown, no extra text.`;

  const userPrompt = `Current Memories: ${JSON.stringify(memorySummary)}

User Request: "${userMessage}"

If the user wants to sort, group, or create an album, return:
{
  "action": "create_album",
  "album": {
    "title": "Album Title",
    "memoryIds": ["id1", "id2"],
    "journalText": "A short poetic summary of these memories."
  },
  "message": "A friendly message explaining what you did."
}

If just chatting, return:
{
  "action": "chat",
  "message": "Your response message here."
}`;

  const text = await groqChat(apiKey, systemPrompt, userPrompt, true);
  return parseJsonSafe(text);
}
