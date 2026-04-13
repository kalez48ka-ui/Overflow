"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback to render instead of the default UI. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React class-based Error Boundary.
 *
 * Catches render errors in its subtree and shows a styled fallback UI that
 * matches the Overflow dark theme. A "Try Again" button resets the boundary
 * so the children can attempt to re-render.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development; could be wired to an external service.
    console.error("[ErrorBoundary] Caught render error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-6 px-6 py-12"
          style={{ backgroundColor: "#0D1117" }}
        >
          {/* Icon */}
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: "#21262D" }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F85149"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Heading */}
          <h2
            className="text-xl font-bold"
            style={{ color: "#E6EDF3" }}
          >
            Something went wrong
          </h2>

          {/* Error message */}
          <p
            className="max-w-md text-center text-sm"
            style={{ color: "#8B949E" }}
          >
            An unexpected error occurred while rendering this section. You can
            try again, or refresh the page if the problem persists.
          </p>

          {/* Error details (dev-friendly) */}
          {this.state.error && (
            <pre
              className="max-w-lg overflow-auto rounded-lg p-3 text-xs"
              style={{
                backgroundColor: "#161B22",
                border: "1px solid #21262D",
                color: "#F85149",
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          {/* Reset button */}
          <button
            onClick={this.handleReset}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: "#238636",
              color: "#FFFFFF",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#2EA043";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#238636";
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
