export type OwnProfileGender = "MALE" | "FEMALE" | "NON_BINARY" | "OTHER";

export type OwnProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  birthDate: string | null;
  gender: OwnProfileGender | null;
  heightCm: number | null;
  weightKg: number | null;
};

export type UpdateOwnProfileInput = Partial<{
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
  birthDate: string | null;
  gender: OwnProfileGender | null;
  heightCm: number | null;
  weightKg: number | null;
}>;

export type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string;
  birthDate: string;
  gender: "" | OwnProfileGender;
  heightCm: string;
  weightKg: string;
};

export const emptyProfileForm: ProfileFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  photoUrl: "",
  birthDate: "",
  gender: "",
  heightCm: "",
  weightKg: "",
};

type OwnProfileApiResponse =
  | {
      success: true;
      data: OwnProfile;
    }
  | {
      success: false;
      error: {
        message: string;
      };
    };

const DEFAULT_FETCH_ERROR = "No se pudo procesar la solicitud del perfil.";

const getErrorMessage = (payload: OwnProfileApiResponse, fallbackMessage: string) =>
  payload.success ? fallbackMessage : payload.error.message;

const toNullableText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNullableInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const mapProfileToFormState = (profile: OwnProfile): ProfileFormState => ({
  firstName: profile.firstName,
  lastName: profile.lastName,
  email: profile.email,
  phone: profile.phone ?? "",
  photoUrl: profile.photoUrl ?? "",
  birthDate: profile.birthDate ?? "",
  gender: profile.gender ?? "",
  heightCm: profile.heightCm?.toString() ?? "",
  weightKg: profile.weightKg?.toString() ?? "",
});

export const buildPatchPayload = (
  formState: ProfileFormState,
  currentProfile: OwnProfile
): UpdateOwnProfileInput => {
  const payload: UpdateOwnProfileInput = {};

  const firstName = formState.firstName.trim();
  if (firstName !== currentProfile.firstName) {
    payload.firstName = firstName;
  }

  const lastName = formState.lastName.trim();
  if (lastName !== currentProfile.lastName) {
    payload.lastName = lastName;
  }

  const phone = toNullableText(formState.phone);
  if (phone !== currentProfile.phone) {
    payload.phone = phone;
  }

  const photoUrl = toNullableText(formState.photoUrl);
  if (photoUrl !== currentProfile.photoUrl) {
    payload.photoUrl = photoUrl;
  }

  const birthDate = toNullableText(formState.birthDate);
  if (birthDate !== currentProfile.birthDate) {
    payload.birthDate = birthDate;
  }

  const gender = formState.gender || null;
  if (gender !== currentProfile.gender) {
    payload.gender = gender;
  }

  const heightCm = toNullableInteger(formState.heightCm);
  if (heightCm !== currentProfile.heightCm) {
    payload.heightCm = heightCm;
  }

  const weightKg = toNullableInteger(formState.weightKg);
  if (weightKg !== currentProfile.weightKg) {
    payload.weightKg = weightKg;
  }

  return payload;
};

export const getOwnProfile = async (fetchImpl: typeof fetch): Promise<OwnProfile> => {
  const response = await fetchImpl("/api/me/profile", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as OwnProfileApiResponse;

  if (!response.ok || !payload.success) {
    throw new Error(getErrorMessage(payload, "No se pudo cargar tu perfil."));
  }

  return payload.data;
};

export const updateOwnProfile = async (
  fetchImpl: typeof fetch,
  input: UpdateOwnProfileInput
): Promise<OwnProfile> => {
  const response = await fetchImpl("/api/me/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as OwnProfileApiResponse;

  if (!response.ok || !payload.success) {
    throw new Error(getErrorMessage(payload, DEFAULT_FETCH_ERROR));
  }

  return payload.data;
};
