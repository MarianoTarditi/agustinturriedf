import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/http/api-response";

const { requireSessionMock, getUserByIdMock, listUsersMock, updateUserMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  listUsersMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ requireSession: requireSessionMock }));
vi.mock("@/features/users/service", () => ({
  userService: { getUserById: getUserByIdMock, listUsers: listUsersMock, updateUser: updateUserMock },
}));

import { GET as getUser, PATCH, DELETE } from "@/app/api/users/[userId]/route";
import { GET as listUsers, POST } from "@/app/api/users/route";
import { isActiveAccount, requireUserReadAccess } from "@/features/users/policy";

const userId = "c123456789012345678901234";
const context = { params: Promise.resolve({ userId }) };

describe("admin users read policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows a trainer to read any student, including an unassigned student", () => {
    expect(() =>
      requireUserReadAccess({ id: "trainer-1", role: "TRAINER" }, { id: userId, role: "STUDENT" })
    ).not.toThrow();
  });

  it("allows protected access only for active accounts", () => {
    expect(isActiveAccount("ACTIVE")).toBe(true);
    expect(isActiveAccount("INACTIVE")).toBe(false);
    expect(isActiveAccount("BLOCKED")).toBe(false);
    expect(isActiveAccount("ARCHIVED")).toBe(false);
  });

  it("denies a trainer access to administrator and trainer accounts", () => {
    expect.assertions(2);

    for (const role of ["ADMIN", "TRAINER"] as const) {
      try {
        requireUserReadAccess({ id: "trainer-1", role: "TRAINER" }, { id: userId, role });
      } catch (error) {
        expect(error).toMatchObject({ status: 403, code: "FORBIDDEN" } satisfies Partial<ApiError>);
      }
    }
  });

  it("returns a 200 list to an active administrator", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    listUsersMock.mockResolvedValue([{ id: userId, role: "STUDENT" }]);

    const response = await listUsers();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: [{ id: userId, role: "STUDENT" }] });
  });

  it("returns a 405 for direct user creation and deletion", async () => {
    const post = await POST(new Request("http://localhost/api/users", { method: "POST" }));
    const deleteResponse = await DELETE(new Request(`http://localhost/api/users/${userId}`), context);

    expect(post.status).toBe(405);
    expect(deleteResponse.status).toBe(405);
    expect(getUserByIdMock).not.toHaveBeenCalled();
  });

  it("rejects role injection through PATCH without invoking the service", async () => {
    requireSessionMock.mockResolvedValue({ id: "admin-1", role: "ADMIN" });

    const response = await PATCH(
      new Request(`http://localhost/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "Changed", role: "TRAINER" }),
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("does not disclose a team account when a trainer requests its detail", async () => {
    requireSessionMock.mockResolvedValue({ id: "trainer-1", role: "TRAINER" });
    getUserByIdMock.mockRejectedValue(new ApiError("No tenés permisos para ver este usuario", 403, "FORBIDDEN"));

    const response = await getUser(new Request(`http://localhost/api/users/${userId}`), context);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
  });
});
