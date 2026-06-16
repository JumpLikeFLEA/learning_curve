export function formatDuration(totalSeconds: number, style: "compact" | "verbose"): string {
  if (style === "compact") {
    if (totalSeconds === 0) return "0m";
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes % 60}m`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
