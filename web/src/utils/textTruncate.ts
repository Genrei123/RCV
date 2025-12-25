/**
 * Truncate text to a maximum character limit with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum characters (default: 30)
 * @returns Truncated text with ellipsis if it exceeds maxLength
 */
export const truncateText = (
  text: string | undefined | null,
  maxLength: number = 30
): string => {
  if (!text) return "";
  const str = String(text).trim();
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
};
