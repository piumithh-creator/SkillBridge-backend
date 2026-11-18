export const ROLES = ["ADMIN", "STUDENT", "COMPANY"] as const;
export type Role = (typeof ROLES)[number];

export const REGISTRABLE_ROLES = ["STUDENT", "COMPANY"] as const;

export const APPLICATION_STATUSES = [
  "PENDING",
  "REVIEWING",
  "SHORTLISTED",
  "ACCEPTED",
  "REJECTED"
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const WORK_MODES = ["ONSITE", "REMOTE", "HYBRID"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const INTERNSHIP_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED", "REMOVED"] as const;
export type InternshipStatus = (typeof INTERNSHIP_STATUSES)[number];

export const INTERNSHIP_CATEGORIES = [
  "Software Engineering",
  "Data Science & AI",
  "Cyber Security",
  "UI/UX Design",
  "Quality Assurance",
  "DevOps & Cloud",
  "Business Analysis",
  "Marketing",
  "Finance",
  "Other"
] as const;

export const NOTIFICATION_TYPES = [
  "APPLICATION_SUBMITTED",
  "APPLICATION_STATUS_CHANGED",
  "APPLICATION_WITHDRAWN",
  "INTERNSHIP_PUBLISHED",
  "INTERNSHIP_REMOVED",
  "SYSTEM"
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const REFRESH_COOKIE = "sb_refresh";
export const MAX_SESSIONS_PER_USER = 5;
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
