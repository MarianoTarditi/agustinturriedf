import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/usuarios/equipo",
}));
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));
vi.mock("@/components/material-symbol", () => ({
  MaterialSymbol: () => <span />,
}));
vi.mock("@/components/use-loading", () => ({
  useLoading: () => ({ hideLoader: vi.fn(), showLoader: vi.fn() }),
}));

import { PrivateNavbar } from "./private-navbar";

describe("PrivateNavbar", () => {
  it("shows the team route only to administrators and preserves its active navigation", () => {
    const { rerender } = render(<PrivateNavbar currentUser={{ name: "Admin", role: "ADMIN" } as any} />);

    expect(screen.getByRole("link", { name: "Equipo" })).toHaveAttribute("href", "/usuarios/equipo");
    expect(screen.getByRole("link", { name: "Equipo" }).className).toContain("linkActive");
    expect(screen.getByRole("link", { name: "Usuarios" }).className).not.toContain("linkActive");

    rerender(<PrivateNavbar currentUser={{ name: "Trainer", role: "TRAINER" } as any} />);

    expect(screen.queryByRole("link", { name: "Equipo" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usuarios" })).toHaveAttribute("href", "/usuarios");
  });
});
