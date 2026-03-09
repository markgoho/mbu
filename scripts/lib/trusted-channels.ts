/**
 * Curated list of trusted YouTube channels organized by topic domain.
 *
 * Used by the video search script to score candidate videos.
 * Channels from trusted sources receive a higher trust score.
 *
 * Matching is by channel name (case-insensitive string comparison)
 * against youtube-sr search results.
 */

interface TrustedChannel {
  name: string;
  domains: string[];
}

export const TRUSTED_CHANNELS: ReadonlyArray<TrustedChannel> = [
  // Scouting
  { name: "Scouting America", domains: ["scouting"] },
  { name: "ScoutsBSA", domains: ["scouting"] },
  { name: "Boy Scouts of America", domains: ["scouting"] },
  { name: "Scoutmaster Bucky", domains: ["scouting"] },

  // Outdoor / Wilderness
  { name: "REI", domains: ["outdoor", "wilderness", "camping", "hiking"] },
  {
    name: "REI Co-op",
    domains: ["outdoor", "wilderness", "camping", "hiking"],
  },
  { name: "NOLS", domains: ["outdoor", "wilderness", "leadership"] },
  {
    name: "Leave No Trace",
    domains: ["outdoor", "wilderness", "environmental-science"],
  },
  {
    name: "National Park Service",
    domains: ["outdoor", "wilderness", "nature", "conservation"],
  },
  {
    name: "U.S. Forest Service",
    domains: ["outdoor", "wilderness", "forestry", "conservation"],
  },

  // First Aid / Safety
  {
    name: "American Red Cross",
    domains: ["first-aid", "safety", "swimming", "lifesaving"],
  },
  {
    name: "American Heart Association",
    domains: ["first-aid", "safety", "emergency-preparedness"],
  },
  { name: "Mayo Clinic", domains: ["first-aid", "safety", "medicine"] },
  { name: "St John Ambulance", domains: ["first-aid", "safety"] },
  {
    name: "Pool Safely",
    domains: ["swimming", "safety", "lifesaving", "water-sports"],
  },

  // Shooting Sports
  {
    name: "USA Archery",
    domains: ["archery", "shooting-sports"],
  },
  {
    name: "National Rifle Association",
    domains: ["rifle-shooting", "shotgun-shooting", "shooting-sports"],
  },
  {
    name: "NRA",
    domains: ["rifle-shooting", "shotgun-shooting", "shooting-sports"],
  },
  {
    name: "National Shooting Sports Foundation",
    domains: ["rifle-shooting", "shotgun-shooting", "shooting-sports"],
  },

  // Science / STEM
  { name: "CrashCourse", domains: ["science", "stem", "education"] },
  { name: "Crash Course", domains: ["science", "stem", "education"] },
  {
    name: "SmarterEveryDay",
    domains: ["science", "stem", "engineering"],
  },
  { name: "Smarter Every Day", domains: ["science", "stem", "engineering"] },
  { name: "Veritasium", domains: ["science", "stem", "physics"] },
  { name: "Mark Rober", domains: ["science", "stem", "engineering"] },
  { name: "Kurzgesagt", domains: ["science", "stem", "education"] },
  {
    name: "Kurzgesagt – In a Nutshell",
    domains: ["science", "stem", "education"],
  },

  // Nature / Environment
  {
    name: "National Wildlife Federation",
    domains: ["nature", "wildlife", "environmental-science", "conservation"],
  },
  {
    name: "National Audubon Society",
    domains: ["nature", "bird-study", "environmental-science"],
  },
  { name: "NOAA", domains: ["weather", "oceanography", "environmental-science"] },
  {
    name: "USGS",
    domains: ["geology", "earth-science", "environmental-science"],
  },

  // Government / Educational
  {
    name: "NASA",
    domains: ["astronomy", "space-exploration", "science", "stem"],
  },
  {
    name: "Smithsonian",
    domains: ["science", "nature", "history", "education"],
  },
  {
    name: "Smithsonian National Museum of Natural History",
    domains: ["science", "nature", "history"],
  },
  { name: "CDC", domains: ["first-aid", "safety", "public-health"] },
  {
    name: "Centers for Disease Control and Prevention (CDC)",
    domains: ["first-aid", "safety", "public-health"],
  },

  // Crafts / Trades / Skills
  {
    name: "This Old House",
    domains: ["woodwork", "home-repairs", "plumbing", "electrical"],
  },
  {
    name: "Wranglerstar",
    domains: ["outdoor", "woodwork", "pioneering", "wilderness"],
  },
  {
    name: "Primitive Technology",
    domains: ["wilderness", "pioneering", "camping"],
  },

  // Cooking
  {
    name: "America's Test Kitchen",
    domains: ["cooking"],
  },
  {
    name: "Bon Appétit",
    domains: ["cooking"],
  },

  // Music / Art
  {
    name: "Berklee Online",
    domains: ["music"],
  },

  // Personal Management / Finance
  {
    name: "Khan Academy",
    domains: ["personal-management", "finance", "education", "stem"],
  },
] as const;

/**
 * Check whether a channel name matches any trusted channel.
 * Returns the matching trusted channel or undefined.
 */
export function findTrustedChannel({
  channelName,
}: {
  channelName: string;
}): TrustedChannel | undefined {
  const normalizedInput = channelName.toLowerCase().trim();
  return TRUSTED_CHANNELS.find(
    (channel) => channel.name.toLowerCase() === normalizedInput,
  );
}
