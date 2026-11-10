// Public configuration for the production treasure hunt page.
// Firebase web config is public (not a secret); the answer key must NEVER go here.
export const HUNT_CONFIG = {
  apiUrl: "", // Your deployed Cloudflare Worker base URL, without /check.
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: "",
  },
};
