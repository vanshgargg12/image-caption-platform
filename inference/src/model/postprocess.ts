/**
 * Post-processes a generated caption:
 * 1. Trim leading and trailing whitespace
 * 2. Collapse multiple whitespace characters into a single space
 * 3. Collapse immediately repeated words or phrases ("dog dog" -> "dog")
 * 4. Ensure no trailing partial word (cut-off fragments, trailing hyphens, orphan consonants, dangling punctuation)
 * 5. Capitalize the first letter of the resulting caption
 *
 * @param text The raw caption string to clean
 * @returns The cleaned, properly formatted caption string
 */
export function cleanCaption(text: string | null | undefined): string {
  if (typeof text !== "string") {
    return "";
  }

  let cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "";
  }

  // Collapse immediately repeated words and multi-word phrases
  const words = cleaned.split(" ").filter(Boolean);
  let changed = true;
  while (changed && words.length > 1) {
    changed = false;
    const n = words.length;
    for (let len = Math.floor(n / 2); len >= 1; len--) {
      for (let i = 0; i <= words.length - 2 * len; i++) {
        const p1 = words.slice(i, i + len);
        const p2 = words.slice(i + len, i + 2 * len);
        const match = p1.every((w, idx) => {
          const w1 = w.toLowerCase().replace(/[.,!?;:]+$/, "");
          const w2 = p2[idx].toLowerCase().replace(/[.,!?;:]+$/, "");
          return w1 === w2 && w1.length > 0;
        });

        if (match) {
          const trailingPunc = p2[len - 1].match(/[.,!?;:]+$/);
          if (trailingPunc) {
            words[i + len - 1] =
              words[i + len - 1].replace(/[.,!?;:]+$/, "") + trailingPunc[0];
          }
          words.splice(i + len, len);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  cleaned = words.join(" ");

  // Ensure no trailing partial word
  let prev: string;
  do {
    prev = cleaned;
    // Remove trailing word ending with a hyphen (cut-off mid-word like "run-" or "gra-")
    cleaned = cleaned.replace(/(^|\s+)\S+-\s*$/, "").trim();

    // Remove trailing isolated punctuation or unfinished connectors (comma, semicolon, colon, hyphen, dash)
    cleaned = cleaned.replace(/[,;:\-\s]+$/, "").trim();

    // Remove trailing word ending with an apostrophe (cut-off contraction like "didn'")
    cleaned = cleaned.replace(/(^|\s+)\S*['`]\s*$/, "").trim();

    // Remove trailing single consonant (cut-off letter like "w", "b", "t")
    // Standalone English words "a" and "i" are preserved
    cleaned = cleaned.replace(/(^|\s+)[b-hj-zB-HJ-Z]\s*$/, "").trim();

    // Remove trailing ellipsis or multiple dots
    cleaned = cleaned.replace(/\.{2,}\s*$/, "").trim();
  } while (cleaned !== prev);

  if (!cleaned) {
    return "";
  }

  // Capitalize the first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
