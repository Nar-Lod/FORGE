"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function PrivacyPage() {
  const { isSignedIn, getToken } = useAuth();
  const [status, setStatus] = useState("");

  async function exportData() {
    setStatus("Preparing your export…");
    const token = await getToken();
    const response = await fetch("/api/forge/privacy/export", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!response.ok) {
      setStatus(response.status === 401 ? "Sign in to export account data." : "Export failed. Please try again.");
      return;
    }
    const blob = new Blob([await response.text()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "forge-data-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Export downloaded.");
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your FORGE account and stored training data? This cannot be undone.")) return;
    setStatus("Deleting your account…");
    const token = await getToken();
    const response = await fetch("/api/forge/privacy/delete", {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      setStatus(response.status === 401 ? "Sign in to delete an account." : "Deletion failed. Please try again.");
      return;
    }
    setStatus("Account deletion completed. You can leave this page.");
  }

  return (
    <main className="privacy-page">
      <Link href="/" className="privacy-back">← FORGE</Link>
      <section className="privacy-card">
        <span className="eyebrow">DATA & PRIVACY</span>
        <h1>Your data stays under your control.</h1>
        <p className="privacy-lead">
          FORGE records gameplay events so it can measure performance, maintain your training profile,
          and adapt future challenges. The product separates account identity from gameplay records and
          supports account export and deletion.
        </p>

        <div className="privacy-grid">
          <article>
            <h2>What is stored</h2>
            <p>Training sessions, attempts, skill scores, difficulty decisions, progress, breaks, healthy-use signals and the event ledger.</p>
          </article>
          <article>
            <h2>What is not inferred</h2>
            <p>FORGE does not infer sensitive demographic attributes from gameplay for benchmarking. Cohort benchmarks are intended to use coarse, aggregated data only.</p>
          </article>
          <article>
            <h2>Local-first operation</h2>
            <p>Anonymous play can operate with a local profile. Account-connected play synchronizes the relevant training state through the authenticated server boundary.</p>
          </article>
          <article>
            <h2>Benchmarking</h2>
            <p>Population percentiles are not shown until a sufficiently large, validated and privacy-reviewed population dataset exists.</p>
          </article>
        </div>

        <div className="privacy-actions">
          <button className="btn btn-primary" onClick={exportData} disabled={!isSignedIn}>EXPORT MY DATA</button>
          <button className="btn btn-danger" onClick={deleteAccount} disabled={!isSignedIn}>DELETE ACCOUNT DATA</button>
        </div>
        <p className="privacy-status" aria-live="polite">{status}</p>
        <p className="privacy-note">Account deletion is irreversible. Anonymous local data can also be cleared from the browser by clearing FORGE site storage.</p>
      </section>
    </main>
  );
}
