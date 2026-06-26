export type ApplicationStatus =
  | "to_review"
  | "applied"
  | "interview_pending"
  | "offer_received"
  | "rejected";

export interface Application {
  id: string;
  user_id: string;
  job_posting_id: string;
  cv_version_id: string | null;
  status: ApplicationStatus;
  status_updated_at: string;
  notes: string | null;
  created_at: string;
}

export interface JobPosting {
  id: string;
  user_id?: string;
  raw_text?: string;
  source_url?: string | null;
  company_name: string | null;
  position_title: string | null;
  parsed_requirements?: Record<string, unknown>;
  created_at?: string;
}

export interface CvBase {
  id: string;
  user_id: string;
  original_filename: string;
  storage_path: string;
  parsed_content: Record<string, unknown>;
  created_at: string;
}

export interface CvDiffLine {
  field: string;
  line?: string;
  old_line?: string;
  new_line?: string;
  reason?: string | null;
}

export interface CvDiff {
  added: CvDiffLine[];
  removed: CvDiffLine[];
  changed: CvDiffLine[];
  unchanged: CvDiffLine[];
  stats: { added: number; removed: number; changed: number; unchanged: number };
}

export interface CompareResponse {
  left: { label: string; content: Record<string, unknown> };
  right: { label: string; content: Record<string, unknown> };
  diff: CvDiff;
}

export interface CvVersion {
  id: string;
  user_id: string;
  cv_base_id: string;
  job_application_id: string | null;
  version_label: string;
  content_diff: CvDiff;
  full_content: Record<string, unknown>;
  ats_score: number | null;
  created_at: string;
}

export interface ColdMessage {
  id: string;
  user_id: string;
  application_id: string;
  target_role: string;
  generated_template: string;
  user_edited_before_sending: boolean;
  created_at: string;
}

export interface ColdMessageResponse {
  cold_message: ColdMessage;
  warning: string;
}

export interface InterviewQuestion {
  question: string;
  focus_area?: string;
}

export interface InterviewSimulation {
  id: string;
  user_id: string;
  application_id: string;
  weak_points_identified: string[];
  simulated_questions: InterviewQuestion[];
  user_responses: { question: string; answer: string }[];
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  kvkk_consent_at: string | null;
  kvkk_consent_version: string | null;
  last_active_at: string | null;
  created_at: string | null;
}

export interface AtsSubScore {
  key: string;
  label: string;
  score: number;
  weight: number;
  weighted_contribution: number;
  detail: Record<string, unknown>;
}

export interface AtsSuggestion {
  category: string;
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  estimated_points: number;
  action: string;
}

export interface AtsScore {
  id: string;
  user_id: string;
  job_posting_id: string;
  cv_base_id: string | null;
  cv_version_id: string | null;
  algorithm_version: string;
  fingerprint: string;
  overall_score: number;
  band: { label: string; key: string };
  sub_scores: AtsSubScore[];
  matched_keywords: string[];
  missing_keywords: string[];
  format_issues: string[];
  ai_explanations: Record<string, string> | null;
  suggestions: AtsSuggestion[] | null;
  created_at: string;
}

export const SCORE_BAND_META: Record<
  string,
  { label: string; color: string; ring: string; icon: string }
> = {
  strong: {
    label: "Güçlü",
    color: "text-emerald-600 dark:text-emerald-400",
    ring: "#16a34a",
    icon: "✓",
  },
  good: {
    label: "İyi",
    color: "text-lime-600 dark:text-lime-400",
    ring: "#65a30d",
    icon: "↗",
  },
  fair: {
    label: "Orta",
    color: "text-amber-600 dark:text-amber-400",
    ring: "#f59e0b",
    icon: "!",
  },
  needs_work: {
    label: "Geliştirilmeli",
    color: "text-red-600 dark:text-red-400",
    ring: "#dc2626",
    icon: "▲",
  },
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  to_review: "İncelenecek",
  applied: "Başvuruldu",
  interview_pending: "Mülakat Bekliyor",
  offer_received: "Teklif Alındı",
  rejected: "Reddedildi",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "to_review",
  "applied",
  "interview_pending",
  "offer_received",
  "rejected",
];
