import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const { usePathnameMock } = vi.hoisted(() => ({ usePathnameMock: vi.fn(() => "/usuarios/equipo") }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
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
  it("shows role-scoped administration routes and preserves the most specific active navigation", () => {
    const { rerender } = render(<PrivateNavbar currentUser={{ name: "Admin", role: "ADMIN" } as any} />);

    expect(screen.getByRole("link", { name: "Equipo" })).toHaveAttribute("href", "/usuarios/equipo");
    expect(screen.getByRole("link", { name: "Equipo" }).className).toContain("linkActive");
    expect(screen.getByRole("link", { name: "Usuarios" }).className).not.toContain("linkActive");
    expect(screen.queryByRole("link", { name: "Invitaciones" })).not.toBeInTheDocument();

    rerender(<PrivateNavbar currentUser={{ name: "Trainer", role: "TRAINER" } as any} />);

    expect(screen.queryByRole("link", { name: "Equipo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Invitaciones" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Usuarios" })).toHaveAttribute("href", "/usuarios");
  });
});
