/**
 * Shared oEmbed verification for YouTube videos.
 *
 * Uses YouTube's official oEmbed endpoint to check whether a video ID
 * resolves to a real, embeddable video.
 *
 * Returns one of three statuses:
 *   - "working"        → video exists and is embeddable
 *   - "embed_disabled" → video exists but embedding is disabled
 *   - "broken"         → video does not exist, is private, or was removed
 */

type VideoStatus = "working" | "embed_disabled" | "broken";

interface VerificationResult {
  status: VideoStatus;
  title?: string;
}

export async function verifyYoutubeVideo({
  videoId,
}: {
  videoId: string;
}): Promise<VerificationResult> {
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  try {
    const response = await fetch(oembedUrl);

    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      return {
        status: "working",
        title: data["title"] as string | undefined,
      };
    }

    if (response.status === 401) {
      return { status: "embed_disabled" };
    }

    // 404 or any other error → broken
    return { status: "broken" };
  } catch {
    return { status: "broken" };
  }
}
