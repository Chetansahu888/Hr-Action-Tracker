import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Date or timestamp string into formula-friendly format for Google Sheets:
 * "MM/dd/yyyy HH:mm:ss" (e.g. "09/08/2026 10:49:33")
 * This format is instantly recognized and calculable by any Google Sheets formula (=INT(), =DATEDIF(), =DAYS(), etc.)
 */
export function formatDateTimeFormulaSafe(dateOrString?: Date | string | number | null): string {
  if (!dateOrString) return '';
  const d = dateOrString instanceof Date ? dateOrString : new Date(dateOrString);
  if (isNaN(d.getTime())) return String(dateOrString);

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
}

