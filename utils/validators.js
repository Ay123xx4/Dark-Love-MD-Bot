export function isValidURL(url) {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

export function isDataURL(str, maxKB = 512) {
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(str)) return false;
  const b64 = str.split(",")[1] || "";
  // size check (rough estimate)
  const bytes = (b64.length * 3) / 4;
  return bytes <= maxKB * 1024;
}
