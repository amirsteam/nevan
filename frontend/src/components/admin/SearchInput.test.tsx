import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import SearchInput from "./SearchInput";

// The parent passes a new callback on every render, as admin pages do
const Harness = ({ onSearch }: { onSearch: (value: string) => void }) => {
  const [value, setValue] = useState("");
  return (
    <SearchInput
      value={value}
      placeholder="Search orders..."
      onChange={(v) => {
        setValue(v);
        onSearch(v);
      }}
    />
  );
};

describe("admin SearchInput", () => {
  it("searches once after typing stops, not once per keystroke", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    const input = screen.getByRole("searchbox", { name: "Search orders" });

    for (const value of ["a", "as", "ash", "asha"]) {
      fireEvent.change(input, { target: { value } });
      act(() => vi.advanceTimersByTime(100));
    }
    expect(onSearch).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("asha");
    vi.useRealTimers();
  });
});
