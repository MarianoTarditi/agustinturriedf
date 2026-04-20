import { describe, expect, it, vi } from "vitest";

import {
  buildPatchPayload,
  getOwnProfile,
  mapProfileToFormState,
  updateOwnProfile,
} from "@/app/(private)/perfil/runtime";

describe("perfil runtime", () => {
  it("supports fetch → hydrate → submit flow, including optional field clearing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            firstName: "Ana",
            lastName: "Pérez",
            email: "ana@example.com",
            phone: "+54 11 5555-5555",
            photoUrl: "https://cdn.example.com/ana.jpg",
            birthDate: "1995-07-20",
            gender: "FEMALE",
            heightCm: 168,
            weightKg: 62,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            firstName: "Ana",
            lastName: "Pérez",
            email: "ana@example.com",
            phone: null,
            photoUrl: null,
            birthDate: null,
            gender: null,
            heightCm: null,
            weightKg: null,
          },
        }),
      });

    const profile = await getOwnProfile(fetchMock as unknown as typeof fetch);
    const hydratedForm = mapProfileToFormState(profile);

    expect(hydratedForm).toMatchObject({
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@example.com",
      phone: "+54 11 5555-5555",
      photoUrl: "https://cdn.example.com/ana.jpg",
      birthDate: "1995-07-20",
      gender: "FEMALE",
      heightCm: "168",
      weightKg: "62",
    });

    const payload = buildPatchPayload(
      {
        ...hydratedForm,
        phone: "   ",
        photoUrl: "",
        birthDate: " ",
        gender: "",
        heightCm: "",
        weightKg: "",
      },
      profile
    );

    expect(payload).toEqual({
      phone: null,
      photoUrl: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
    });

    const updatedProfile = await updateOwnProfile(fetchMock as unknown as typeof fetch, payload);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/me/profile",
      expect.objectContaining({ method: "GET", cache: "no-store" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/me/profile",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(payload),
      })
    );
    expect(updatedProfile).toMatchObject({
      phone: null,
      photoUrl: null,
      birthDate: null,
      gender: null,
      heightCm: null,
      weightKg: null,
    });
  });
});
