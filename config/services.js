// config/services.js
// Single source of truth for where each downstream microservice lives.
// In dev these default to separate local ports; in prod set the *_SERVICE_URL
// env vars to each service's internal address (e.g. Kubernetes service DNS,
// ECS service discovery name, etc.) — never point these at a public URL,
// since traffic between the gateway and services should stay on the
// internal network.

export const SERVICE_URLS = {
  mentee: process.env.MENTEE_SERVICE_URL || "http://localhost:4750",
  professional: process.env.PROFESSIONAL_SERVICE_URL || "http://localhost:5002",
  company: process.env.COMPANY_SERVICE_URL || "http://localhost:5003",
  payment: process.env.PAYMENT_SERVICE_URL || "http://localhost:5004",
  video: process.env.VIDEO_SERVICE_URL || "http://localhost:5005",
};
