import type { Job } from "@/lib/types";

export function formatSalary(job: Job) {
  if (job.salary_min && job.salary_max) {
    return `$${Math.round(job.salary_min / 1000)}K–$${Math.round(job.salary_max / 1000)}K`;
  }
  if (job.salary_max) return `up to $${Math.round(job.salary_max / 1000)}K`;
  return "—";
}
