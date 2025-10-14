/**
 * Get the correct asset path based on environment
 * In development: assets are served from root /assets/...
 * In production: assets are served from /site/assets/...
 */
export const getAssetPath = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // In development, remove 'site/' prefix if present
  if (import.meta.env.DEV) {
    return cleanPath.startsWith('site/') 
      ? `/${cleanPath.slice(5)}` // Remove 'site/' and add leading slash
      : `/${cleanPath}`;
  }
  
  // In production, ensure 'site/' prefix exists
  return cleanPath.startsWith('site/') 
    ? `/${cleanPath}` 
    : `/site/${cleanPath}`;
};

