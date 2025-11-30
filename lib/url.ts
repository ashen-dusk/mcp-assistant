export function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (appUrl) return appUrl;
  return 'http://localhost:3000';
}
