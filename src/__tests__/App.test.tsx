import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import App from "../App";

describe("App", () => {
  it("renders home hero title", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    const title = screen.getByText(/Your Digital Reading Partner/i);
    expect(title).toBeInTheDocument();
  });
});
