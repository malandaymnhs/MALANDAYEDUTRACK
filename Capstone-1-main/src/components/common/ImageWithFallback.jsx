import { useState } from 'react';

// A robust image component that tries the primary src first and, on error,
// falls back to a provided fallback image (default: '/mnhslogo.jpg').
const ImageWithFallback = ({ src, alt, fallback = '/mnhslogo.jpg', ...props }) => {
  const [useFallback, setUseFallback] = useState(false);

  const effectiveSrc = (!src || useFallback) ? fallback : src;

  const handleError = () => {
    // If the primary src fails, switch to fallback
    if (!useFallback) setUseFallback(true);
  };

  // If there is no src, we will immediately use the fallback (logo)
  // If fallback is also missing, render nothing
  if (!effectiveSrc) return null;

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      onError={handleError}
      {...props}
    />
  );
};

export default ImageWithFallback;