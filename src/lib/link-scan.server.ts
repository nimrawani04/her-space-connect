/**
 * Heuristic safe-link analysis for URLs shared in circle chat.
 * Server-only: resolves redirects and inspects the final destination.
 */

export type LinkVerdict = "safe" | "unknown" | "unsafe";

export type LinkScanResult = {
  verdict: LinkVerdict;
  finalUrl: string;
  host: string;
  reasons: string[];
  redirected: boolean;
};

const TRUSTED_HOSTS = [
  "wikipedia.org", "who.int", "nih.gov", "cdc.gov", "nhs.uk", "mayoclinic.org",
  "github.com", "google.com", "youtube.com", "linkedin.com", "instagram.com",
  "bbc.com", "nytimes.com", "theguardian.com", "unwomen.org", "coursera.org",
  "edx.org", "khanacademy.org", "docs.google.com", "drive.google.com", "notion.so",
];

const SHORTENERS = [
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly", "is.gd",
  "cutt.ly", "rebrand.ly", "shorturl.at", "rb.gy", "t.ly",
];

const RISKY_TLDS = [
  "zip", "mov", "top", "xyz", "gq", "tk", "ml", "cf", "ga", "work", "click",
  "country", "kim", "loan", "download", "racing", "review", "stream",
];

const DANGEROUS_PATH_EXT = [
  ".exe", ".dll", ".scr", ".bat", ".cmd", ".msi", ".ps1", ".vbs", ".jar",
  ".apk", ".dmg", ".hta", ".scf", ".lnk", ".sh",
];

const PHISH_WORDS = [
  "verify-account", "account-verify", "login-secure", "secure-login", "reset-password",
  "wallet-connect", "airdrop", "free-gift", "claim-now", "bank-update", "otp-verify",
];

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

function baseDomain(host: string) {
  const parts = host.split(".");
  return parts.slice(-2).join(".");
}

function staticChecks(u: URL) {
  const reasons: string[] = [];
  let unsafe = false;
  let suspicious = false;
  const host = u.hostname.toLowerCase();

  if (u.protocol !== "https:") {
    suspicious = true;
    reasons.push("Not served over a secure (https) connection.");
  }
  if (u.username || u.password) {
    unsafe = true;
    reasons.push("The link hides login credentials in the address — a common phishing trick.");
  }
  if (IPV4.test(host) || host.includes(":")) {
    unsafe = true;
    reasons.push("Points at a raw IP address instead of a named website.");
  }
  if (host.startsWith("xn--") || host.includes(".xn--")) {
    unsafe = true;
    reasons.push("Uses look-alike (punycode) characters in the domain name.");
  }
  const tld = host.split(".").pop() ?? "";
  if (RISKY_TLDS.includes(tld)) {
    suspicious = true;
    reasons.push(`The ".${tld}" domain ending is frequently abused for scams.`);
  }
  if (SHORTENERS.includes(baseDomain(host))) {
    suspicious = true;
    reasons.push("Shortened link — the real destination is hidden.");
  }
  if (host.split(".").length > 4) {
    suspicious = true;
    reasons.push("Unusually long chain of subdomains.");
  }
  const lowerPath = (u.pathname + u.search).toLowerCase();
  if (DANGEROUS_PATH_EXT.some((e) => u.pathname.toLowerCase().endsWith(e))) {
    unsafe = true;
    reasons.push("Links directly to a program or installer file.");
  }
  const phish = PHISH_WORDS.find((w) => lowerPath.includes(w) || host.includes(w));
  if (phish) {
    unsafe = true;
    reasons.push(`Contains a known phishing pattern ("${phish}").`);
  }
  if (/https?%3a|https?:\/\/[^/]+\/.*https?:\/\//i.test(u.href.slice(u.origin.length))) {
    suspicious = true;
    reasons.push("Wraps another web address inside it (open redirect).");
  }
  return { reasons, unsafe, suspicious, host };
}

export async function scanUrl(raw: string): Promise<LinkScanResult> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { verdict: "unsafe", finalUrl: raw, host: "", reasons: ["This is not a valid web address."], redirected: false };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { verdict: "unsafe", finalUrl: raw, host: u.hostname, reasons: ["Only http and https links can be opened."], redirected: false };
  }

  let finalUrl = u.href;
  let redirected = false;
  const reasons: string[] = [];
  let reachable = false;

  try {
    const res = await fetch(u.href, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "HerSpace-LinkScanner/1.0", accept: "text/html,*/*;q=0.8" },
      signal: AbortSignal.timeout(6000),
    });
    reachable = true;
    finalUrl = res.url || u.href;
    redirected = new URL(finalUrl).host !== u.host;
    if (redirected) reasons.push(`Redirects to a different site: ${new URL(finalUrl).host}`);
    if (res.status >= 400) reasons.push(`The site responded with an error (${res.status}).`);
    const disp = res.headers.get("content-disposition") ?? "";
    const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
    if (/attachment/i.test(disp) || /application\/(x-msdownload|octet-stream|vnd\.microsoft\.portable-executable)/.test(ctype)) {
      reasons.push("Starts a file download instead of opening a page.");
      return { verdict: "unsafe", finalUrl, host: new URL(finalUrl).hostname, reasons, redirected };
    }
  } catch {
    reasons.push("We could not reach this site to check it.");
  }

  const first = staticChecks(u);
  const last = staticChecks(new URL(finalUrl));
  const all = [...new Set([...reasons, ...first.reasons, ...last.reasons])];
  const host = new URL(finalUrl).hostname.toLowerCase();

  if (first.unsafe || last.unsafe) {
    return { verdict: "unsafe", finalUrl, host, reasons: all, redirected };
  }

  const trusted = TRUSTED_HOSTS.some((t) => host === t || host.endsWith(`.${t}`));
  if (trusted && !first.suspicious && !last.suspicious && !redirected) {
    return { verdict: "safe", finalUrl, host, reasons: ["Well-known, widely trusted website."], redirected };
  }
  if (reachable && !first.suspicious && !last.suspicious && !redirected && new URL(finalUrl).protocol === "https:") {
    return {
      verdict: "safe",
      finalUrl,
      host,
      reasons: all.length ? all : ["Secure connection, no risk signals found."],
      redirected,
    };
  }
  return {
    verdict: "unknown",
    finalUrl,
    host,
    reasons: all.length ? all : ["We couldn't confirm this site is safe."],
    redirected,
  };
}
