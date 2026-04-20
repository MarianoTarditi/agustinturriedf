import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listMock,
  getSelfProfileMock,
  updateSelfProfileMock,
  findByEmailMock,
  createMock,
  findByIdMock,
  deleteMock,
  ensureFolderForStudentMock,
  ensureStudentRoutineDirectoryMock,
  removeStudentRoutineDirectoryMock,
} = vi.hoisted(() => ({
  listMock: vi.fn(),
  getSelfProfileMock: vi.fn(),
  updateSelfProfileMock: vi.fn(),
  findByEmailMock: vi.fn(),
  createMock: vi.fn(),
  findByIdMock: vi.fn(),
  deleteMock: vi.fn(),
  ensureFolderForStudentMock: vi.fn(),
  ensureStudentRoutineDirectoryMock: vi.fn(),
  removeStudentRoutineDirectoryMock: vi.fn(),
}));

vi.mock("@/features/users/repository", () => ({
  userRepository: {
    list: listMock,
    getSelfProfile: getSelfProfileMock,
    updateSelfProfile: updateSelfProfileMock,
    findByEmail: findByEmailMock,
    create: createMock,
    findById: findByIdMock,
    delete: deleteMock,
  },
}));

vi.mock("@/features/routines/repository", () => ({
  routinesRepository: {
    ensureFolderForStudent: ensureFolderForStudentMock,
  },
}));

vi.mock("@/features/routines/storage", () => ({
  ensureStudentRoutineDirectory: ensureStudentRoutineDirectoryMock,
  removeStudentRoutineDirectory: removeStudentRoutineDirectoryMock,
}));

import { userService } from "@/features/users/service";

describe("UserService.listUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows TRAINER role and returns mapped users", async () => {
    listMock.mockResolvedValue([
      {
        id: "u-1",
        firstName: "Ana",
        lastName: "Trainer",
        email: "ana@example.com",
        role: "TRAINER",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        studentProfile: null,
      },
    ]);

    const result = await userService.listUsers({ id: "trainer-1", role: "TRAINER" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "u-1",
      email: "ana@example.com",
      role: "TRAINER",
      studentProfile: null,
    });
  });

  it("rejects STUDENT role with FORBIDDEN", async () => {
    await expect(userService.listUsers({ id: "student-1", role: "STUDENT" })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    expect(listMock).not.toHaveBeenCalled();
  });
});

describe("UserService.getOwnProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped self-profile data for the authenticated actor", async () => {
    getSelfProfileMock.mockResolvedValue({
      id: "u-1",
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: "+54 11 5555-5555",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: new Date("1995-07-20T12:30:00.000Z"),
      gender: "FEMALE",
      heightCm: 168,
      weightKg: 62,
      studentProfile: null,
    });

    const result = await userService.getOwnProfile("u-1");

    expect(getSelfProfileMock).toHaveBeenCalledWith("u-1");
    expect(result).toEqual({
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: "+54 11 5555-5555",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: "1995-07-20",
      gender: "FEMALE",
      heightCm: 168,
      weightKg: 62,
    });
  });

  it("throws NOT_FOUND when actor profile does not exist", async () => {
    getSelfProfileMock.mockResolvedValue(null);

    await expect(userService.getOwnProfile("missing-user")).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });
});

describe("UserService.createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureFolderForStudentMock.mockResolvedValue(undefined);
    ensureStudentRoutineDirectoryMock.mockResolvedValue(undefined);
    removeStudentRoutineDirectoryMock.mockResolvedValue(undefined);
  });

  it("allows TRAINER role to create users", async () => {
    findByEmailMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: "u-2",
      firstName: "Laura",
      lastName: "Coach",
      email: "laura@example.com",
      role: "TRAINER",
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      studentProfile: null,
    });

    const result = await userService.createUser(
      { id: "trainer-1", role: "TRAINER" },
      {
        firstName: "Laura",
        lastName: "Coach",
        email: "  LAURA@EXAMPLE.COM ",
        role: "TRAINER",
      }
    );

    expect(findByEmailMock).toHaveBeenCalledWith("laura@example.com");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Laura",
        lastName: "Coach",
        email: "laura@example.com",
        role: "TRAINER",
      })
    );
    expect(result).toMatchObject({
      id: "u-2",
      email: "laura@example.com",
      role: "TRAINER",
      studentProfile: null,
    });
  });

  it("rejects STUDENT role with FORBIDDEN", async () => {
    await expect(
      userService.createUser(
        { id: "student-1", role: "STUDENT" },
        {
          firstName: "Juan",
          lastName: "Alumno",
          email: "juan@example.com",
          role: "TRAINER",
        }
      )
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    expect(findByEmailMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates routines folder + directory when creating STUDENT user", async () => {
    findByEmailMock.mockResolvedValue(null);
    findByIdMock.mockResolvedValue({
      id: "ck7m7x3k50000abcd1234efgh",
      role: "TRAINER",
    });

    createMock.mockResolvedValue({
      id: "student-1",
      firstName: "Juan",
      lastName: "Alumno",
      email: "juan@example.com",
      role: "STUDENT",
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      studentProfile: {
        id: "sp-1",
        trainerId: "trainer-1",
        status: "ACTIVE",
      },
    });

    const result = await userService.createUser(
      { id: "admin-1", role: "ADMIN" },
      {
        firstName: "Juan",
        lastName: "Alumno",
        email: "juan@example.com",
        role: "STUDENT",
        trainerId: "ck7m7x3k50000abcd1234efgh",
      }
    );

    expect(ensureFolderForStudentMock).toHaveBeenCalledWith({
      studentProfileId: "sp-1",
      firstName: "Juan",
      lastName: "Alumno",
      email: "juan@example.com",
    });
    expect(ensureStudentRoutineDirectoryMock).toHaveBeenCalledWith("sp-1");
    expect(result).toMatchObject({
      id: "student-1",
      role: "STUDENT",
      studentProfile: {
        id: "sp-1",
      },
    });
  });
});

describe("UserService.deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    removeStudentRoutineDirectoryMock.mockResolvedValue(undefined);
  });

  it("removes student routine directory after successful delete", async () => {
    findByIdMock.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
      studentProfile: {
        id: "sp-1",
      },
    });

    deleteMock.mockResolvedValue({
      id: "student-1",
      firstName: "Juan",
      lastName: "Alumno",
      email: "juan@example.com",
      phone: null,
      photoUrl: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
      role: "STUDENT",
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      studentProfile: {
        id: "sp-1",
        trainerId: "trainer-1",
        status: "ACTIVE",
      },
    });

    const result = await userService.deleteUser({ id: "admin-1", role: "ADMIN" }, "student-1");

    expect(deleteMock).toHaveBeenCalledWith("student-1");
    expect(removeStudentRoutineDirectoryMock).toHaveBeenCalledWith("sp-1");
    expect(result).toMatchObject({
      id: "student-1",
      role: "STUDENT",
    });
  });
});

describe("UserService.updateOwnProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates actor profile only and ignores immutable/admin payload keys", async () => {
    getSelfProfileMock.mockResolvedValue({
      id: "owner-1",
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: null,
      photoUrl: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
      studentProfile: null,
    });

    updateSelfProfileMock.mockResolvedValue({
      id: "owner-1",
      firstName: "Ana María",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: "+54 11 4444-4444",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: new Date("2000-01-02T00:00:00.000Z"),
      gender: "FEMALE",
      heightCm: 170,
      weightKg: 63,
      studentProfile: null,
    });

    const result = await userService.updateOwnProfile("owner-1", {
      id: "other-user",
      email: "hacker@example.com",
      role: "ADMIN",
      firstName: "  Ana María  ",
      phone: "  +54 11 4444-4444  ",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: "2000-01-02",
      gender: "FEMALE",
      heightCm: 170,
      weightKg: 63,
    });

    expect(getSelfProfileMock).toHaveBeenCalledWith("owner-1");
    expect(updateSelfProfileMock).toHaveBeenCalledWith("owner-1", {
      firstName: "Ana María",
      phone: "+54 11 4444-4444",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: new Date("2000-01-02T00:00:00.000Z"),
      gender: "FEMALE",
      heightCm: 170,
      weightKg: 63,
    });
    expect(result).toMatchObject({
      firstName: "Ana María",
      email: "ana@example.com",
      birthDate: "2000-01-02",
      gender: "FEMALE",
      heightCm: 170,
      weightKg: 63,
    });
  });

  it("clears optional profile fields when payload sends null/empty values", async () => {
    getSelfProfileMock.mockResolvedValue({
      id: "owner-1",
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: "+54 11 5555-5555",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: new Date("1995-07-20T00:00:00.000Z"),
      gender: "FEMALE",
      heightCm: 168,
      weightKg: 62,
      studentProfile: null,
    });

    updateSelfProfileMock.mockResolvedValue({
      id: "owner-1",
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: null,
      photoUrl: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
      studentProfile: null,
    });

    const result = await userService.updateOwnProfile("owner-1", {
      phone: "   ",
      photoUrl: "",
      birthDate: " ",
      gender: null,
      heightCm: null,
      weightKg: null,
    });

    expect(updateSelfProfileMock).toHaveBeenCalledWith("owner-1", {
      phone: null,
      photoUrl: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
    });
    expect(result).toMatchObject({
      phone: null,
      photoUrl: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
    });
  });

  it("throws NOT_FOUND and does not update when actor profile is missing", async () => {
    getSelfProfileMock.mockResolvedValue(null);

    await expect(userService.updateOwnProfile("missing-user", { firstName: "Ana" })).rejects.toMatchObject(
      {
        status: 404,
        code: "NOT_FOUND",
      }
    );

    expect(updateSelfProfileMock).not.toHaveBeenCalled();
  });
});
