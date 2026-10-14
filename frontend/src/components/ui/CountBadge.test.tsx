import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CountBadge from "./CountBadge";

describe("CountBadge", () => {
  it("renders nothing for zero", () => {
    const { container } = render(<CountBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count up to the maximum, then max+", () => {
    const { container, rerender } = render(<CountBadge count={9} />);
    expect(container).toHaveTextContent("9");
    rerender(<CountBadge count={12} />);
    expect(container).toHaveTextContent("9+");
    rerender(<CountBadge count={150} max={99} />);
    expect(container).toHaveTextContent("99+");
  });

  it("is hidden from screen readers (the button label carries the count)", () => {
    const { container } = render(<CountBadge count={3} />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
