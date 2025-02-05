import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Get browser information
export function getBrowserInfo() {
  const userAgent = window.navigator.userAgent;
  let browser = "Unknown";
  let version = "Unknown";

  if (userAgent.indexOf("Firefox") > -1) {
    browser = "Firefox";
    version = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || "Unknown";
  } else if (userAgent.indexOf("Chrome") > -1) {
    browser = "Chrome";
    version = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || "Unknown";
  } else if (userAgent.indexOf("Safari") > -1) {
    browser = "Safari";
    version = userAgent.match(/Version\/([0-9.]+)/)?.[1] || "Unknown";
  } else if (userAgent.indexOf("Edge") > -1) {
    browser = "Edge";
    version = userAgent.match(/Edge\/([0-9.]+)/)?.[1] || "Unknown";
  }

  return `${browser} ${version}`;
}

// Get operating system information
export function getOSInfo() {
  const userAgent = window.navigator.userAgent;
  let os = "Unknown";
  let version = "";

  if (userAgent.indexOf("Win") > -1) {
    os = "Windows";
    version = userAgent.match(/Windows NT ([0-9.]+)/)?.[1] || "";
  } else if (userAgent.indexOf("Mac") > -1) {
    os = "macOS";
    version = userAgent.match(/Mac OS X ([0-9._]+)/)?.[1]?.replace(/_/g, '.') || "";
  } else if (userAgent.indexOf("Linux") > -1) {
    os = "Linux";
  }

  return version ? `${os} ${version}` : os;
}

// Format bug report URL with all necessary information
export function formatBugReportUrl(userId: string, projectId: string, code: string) {
  const template = "bug_report.md";
  const baseUrl = "https://github.com/tolgayayci/wizard/issues/new";
  
  const params = new URLSearchParams({
    template,
    labels: "bug",
    title: "[BUG] ",
    body: [
      "## 🐛 Bug Description",
      "<!-- Please describe the bug -->",
      "",
      "## 🔍 Debug Information",
      "```yaml",
      `userId: ${userId}`,
      `projectId: ${projectId}`,
      `code: |`,
      code.split('\n').map(line => `  ${line}`).join('\n'),
      `browser: ${getBrowserInfo()}`,
      `os: ${getOSInfo()}`,
      `timestamp: ${new Date().toISOString()}`,
      "```",
    ].join('\n')
  });

  return `${baseUrl}?${params.toString()}`;
}