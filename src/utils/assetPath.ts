/**
 * Get the correct asset path based on environment
 * In development: assets are served from root /assets/...
 * In production: assets are served from /assets/...
 */
export const getAssetPath = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Always use root path for assets
  return `/${cleanPath}`;
};

