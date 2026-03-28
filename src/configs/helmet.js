import helmet from 'helmet';

// Helmet config for basic security headers
export const configureHelmet = () => {
  return helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows cross-origin API requests
  });
};
