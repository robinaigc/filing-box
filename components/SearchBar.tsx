"use client";

import type { FormEvent } from "react";

type SearchBarProps = {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function SearchBar({ value, isLoading, onChange, onSubmit }: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="search-panel" onSubmit={handleSubmit}>
      <div className="search-shell">
        <input
          className="search-input"
          value={value}
          placeholder="搜索公司名或股票代码，例如 AAPL、苹果、600519、贵州茅台"
          aria-label="搜索公司名或股票代码"
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="search-button" type="submit" disabled={isLoading}>
          {isLoading ? "搜索中" : "搜索"}
        </button>
      </div>
    </form>
  );
}
