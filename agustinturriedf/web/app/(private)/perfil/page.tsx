"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/(private)/perfil/perfil.module.css";
import { z } from "zod";
import {
  buildPatchPayload,
  emptyProfileForm,
  getOwnProfile,
  mapProfileToFormState,
  updateOwnProfile,
  type OwnProfile,
  type OwnProfileGender,
  type ProfileFormState,
} from "@/app/(private)/perfil/runtime";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

const DEFAULT_STATUS = "Activo";
const DEFAULT_EXPERIENCE = "—";
const DEFAULT_ATHLETES = "—";

type EditableProfileFieldKey = "firstName" | "lastName" | "phone" | "heightCm" | "weightKg" | "birthDate";
type ProfileValidationErrors = Partial<Record<EditableProfileFieldKey, string>>;

const editableProfileFieldKeys: ReadonlyArray<EditableProfileFieldKey> = [
  "firstName",
  "lastName",
  "phone",
  "heightCm",
  "weightKg",
  "birthDate",
];

const isEditableProfileFieldKey = (field: keyof ProfileFormState): field is EditableProfileFieldKey =>
  editableProfileFieldKeys.includes(field as EditableProfileFieldKey);

const editProfileValidationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres."),
  lastName: z
    .string()
    .trim()
    .min(2, "El apellido debe tener al menos 2 caracteres."),
  phone: z
    .string()
    .trim()
    .min(6, "Ingresá un teléfono válido.")
    .regex(/^[\d+()\-\s.]+$/, "Ingresá un teléfono válido.")
    .refine((value) => value.replace(/\D/g, "").length >= 6, "Ingresá un teléfono válido."),
  heightCm: z
    .string()
    .trim()
    .min(1, "La altura es obligatoria.")
    .regex(/^\d+$/, "La altura debe ser un número entero.")
    .refine((value) => {
      const parsed = Number.parseInt(value, 10);
      return parsed >= 100 && parsed <= 250;
    }, "La altura debe estar entre 100 y 250 cm."),
  weightKg: z
    .string()
    .trim()
    .min(1, "El peso es obligatorio.")
    .regex(/^\d+$/, "El peso debe ser un número entero.")
    .refine((value) => {
      const parsed = Number.parseInt(value, 10);
      return parsed >= 30 && parsed <= 350;
    }, "El peso debe estar entre 30 y 350 kg."),
  birthDate: z
    .string()
    .trim()
    .min(1, "La fecha de nacimiento es obligatoria.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime());
    }, "Ingresá una fecha de nacimiento válida.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      const now = new Date();
      const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      return date <= todayUtc;
    }, "La fecha de nacimiento no puede ser futura."),
});

const genderLabelMap: Record<OwnProfileGender, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
  NON_BINARY: "No binario",
  OTHER: "Otro",
};

const toAvatarDataUri = (fullName: string) => {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><rect width='100%' height='100%' fill='#25153a'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='120' font-weight='700' fill='#e4c2ff'>${initials || "P"}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const formatDisplayDate = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR");
};

export default function PerfilPage() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formState, setFormState] = useState<ProfileFormState>(emptyProfileForm);
  const [formErrors, setFormErrors] = useState<ProfileValidationErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fullName = useMemo(() => {
    if (!profile) return "Perfil";
    return `${profile.firstName} ${profile.lastName}`.trim();
  }, [profile]);

  const avatarSrc = useMemo(() => {
    if (!profile) return toAvatarDataUri("Perfil");
    return profile.photoUrl ?? toAvatarDataUri(fullName);
  }, [profile, fullName]);

  const technicalInfo = useMemo(
    () => [
      { label: "Email", value: profile?.email ?? "—" },
      { label: "Teléfono", value: profile?.phone ?? "—" },
      { label: "Roles", value: "—" },
      { label: "Nacimiento", value: formatDisplayDate(profile?.birthDate ?? null) },
      { label: "Género", value: profile?.gender ? genderLabelMap[profile.gender] : "—" },
      { label: "Altura", value: profile?.heightCm ? `${profile.heightCm} cm` : "—" },
      { label: "Peso", value: profile?.weightKg ? `${profile.weightKg} kg` : "—" },
      { label: "Creación", value: "—" },
    ],
    [profile]
  );

  const closeModal = () => {
    if (isSaving) return;
    setSaveError(null);
    setFormErrors({});
    setIsEditModalOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        setProfileError(null);
        const ownProfile = await getOwnProfile(fetch);

        if (cancelled) return;

        setProfile(ownProfile);
        setFormState(mapProfileToFormState(ownProfile));
      } catch (error) {
        if (cancelled) return;
        setProfile(null);
        setProfileError(error instanceof Error ? error.message : "No se pudo cargar tu perfil.");
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEditModalOpen) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isEditModalOpen, isSaving]);

  const openEditModal = () => {
    if (!profile) return;
    setSaveError(null);
    setFormErrors({});
    setFormState(mapProfileToFormState(profile));
    setIsEditModalOpen(true);
  };

  const handleFieldChange = (field: keyof ProfileFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));

    if (!isEditableProfileFieldKey(field)) return;

    setFormErrors((current) => {
      if (!current[field]) return current;

      const { [field]: _removedError, ...rest } = current;
      return rest;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) return;

    const validation = editProfileValidationSchema.safeParse({
      firstName: formState.firstName,
      lastName: formState.lastName,
      phone: formState.phone,
      heightCm: formState.heightCm,
      weightKg: formState.weightKg,
      birthDate: formState.birthDate,
    });

    if (!validation.success) {
      const nextErrors: ProfileValidationErrors = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (typeof field !== "string") continue;
        if (!(field in nextErrors)) {
          nextErrors[field as EditableProfileFieldKey] = issue.message;
        }
      }

      setFormErrors(nextErrors);
      setSaveError(null);
      return;
    }

    setFormErrors({});

    const payload = buildPatchPayload(formState, profile);

    if (Object.keys(payload).length === 0) {
      setSaveError("No hay cambios para guardar.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const updatedProfile = await updateOwnProfile(fetch, payload);
      setProfile(updatedProfile);
      setFormState(mapProfileToFormState(updatedProfile));
      setIsEditModalOpen(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar tu perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Perfil" />
      <PrivateTopbar
        title="Perfil Profesional"
        subtitle="Gestiona tu identidad, datos de salud y disponibilidad para mantener una presencia premium y consistente en toda la plataforma."
      />

      <div className={styles.content}>
        {profileError ? <p className={styles.pageError}>{profileError}</p> : null}

        <section className={styles.heroGrid}>
          <article className={styles.heroCard}>
            <div className={styles.avatarShell}>
              <img src={avatarSrc} alt={fullName} className={styles.heroPhoto} />
              <div className={styles.statusChip}>
                <span className={styles.statusDot} aria-hidden="true" />
                <span>{DEFAULT_STATUS}</span>
              </div>
            </div>

            <div className={styles.identity}>
              <header className={styles.identityHeader}>
                <h2>{loadingProfile ? "Cargando perfil..." : fullName}</h2>
                <p>{profile?.email ?? "—"}</p>
              </header>

              <div className={styles.stats}>
                <article className={styles.statCard}>
                  <p>Experiencia</p>
                  <strong>{DEFAULT_EXPERIENCE}</strong>
                </article>
                <article className={styles.statCard}>
                  <p>Atletas</p>
                  <strong>{DEFAULT_ATHLETES}</strong>
                </article>
              </div>
            </div>
          </article>

          <article className={styles.presenceCard}>
            <span className={styles.presenceIconWrap}>
              <MaterialSymbol name="verified" className={styles.presenceIcon} fill={1} weight={450} opticalSize={24} />
            </span>
            <h3>Presencia Premium</h3>
            <p>Tu perfil está optimizado para la red de entrenamiento NOIR.</p>

            <button type="button" className={styles.secondaryButton}>
              Ver vista pública
            </button>
          </article>
        </section>

        <section className={styles.infoSection}>
          <header className={styles.infoHeader}>
            <h3>Especificaciones Técnicas</h3>
          </header>

          <div className={styles.infoGrid}>
            {technicalInfo.map((item) => (
              <article key={item.label} className={styles.infoItem}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <footer className={styles.footerActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={openEditModal}
            disabled={loadingProfile || !profile}
          >
            <MaterialSymbol name="edit" className={styles.buttonIcon} fill={1} weight={500} opticalSize={20} />
            Editar perfil
          </button>
        </footer>
      </div>

      {isEditModalOpen && profile ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeModal}>
          <div
            className={styles.editModal}
            role="dialog"
            aria-modal="true"
            aria-label="Editar perfil"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.editHeader}>
              <div>
                <div className={styles.editTitleRow}>
                  <MaterialSymbol name="edit_note" className={styles.editTitleIcon} weight={500} opticalSize={20} />
                  <h2>Editar Perfil</h2>
                </div>
                <p>Actualizá tu información personal.</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                aria-label="Cerrar modal"
                onClick={closeModal}
                disabled={isSaving}
              >
                <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
              </button>
            </header>

            <div className={styles.editBody}>
              <section className={styles.editProfileRow}>
                <div className={styles.editAvatarWrap}>
                  <img src={formState.photoUrl || avatarSrc} alt={fullName} />
                </div>

                <div className={styles.editUploadWrap}>
                  <label>Foto de Perfil</label>
                  <p>URL manual (sin subida de archivos).</p>
                  <small>Ingresá una URL http/https en el formulario.</small>
                </div>
              </section>

              <form id="perfil-edit-form" className={styles.editForm} onSubmit={handleSubmit}>
                <label className={styles.fieldWrap}>
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={formState.firstName}
                    className={formErrors.firstName ? styles.fieldInputError : undefined}
                    onChange={(event) => handleFieldChange("firstName", event.target.value)}
                    disabled={isSaving}
                  />
                  {formErrors.firstName ? <small className={styles.fieldError}>{formErrors.firstName}</small> : null}
                </label>

                <label className={styles.fieldWrap}>
                  <span>Apellido</span>
                  <input
                    type="text"
                    value={formState.lastName}
                    className={formErrors.lastName ? styles.fieldInputError : undefined}
                    onChange={(event) => handleFieldChange("lastName", event.target.value)}
                    disabled={isSaving}
                  />
                  {formErrors.lastName ? <small className={styles.fieldError}>{formErrors.lastName}</small> : null}
                </label>

                <label className={styles.fieldWrap}>
                  <span>Email</span>
                  <div className={styles.leadingIconInput}>
                    <MaterialSymbol name="mail" className={styles.leadingInputIcon} weight={500} opticalSize={18} />
                    <input type="email" value={formState.email} readOnly className={styles.readOnlyInput} aria-readonly="true" />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Foto (URL)</span>
                  <div className={styles.leadingIconInput}>
                    <MaterialSymbol name="link" className={styles.leadingInputIcon} weight={500} opticalSize={18} />
                    <input
                      type="url"
                      value={formState.photoUrl}
                      onChange={(event) => handleFieldChange("photoUrl", event.target.value)}
                      placeholder="https://..."
                      disabled={isSaving}
                    />
                  </div>
                </label>

                <label className={`${styles.fieldWrap} ${styles.editFullRow}`}>
                  <span>Teléfono</span>
                  <div className={`${styles.leadingIconInput} ${formErrors.phone ? styles.fieldInputError : ""}`}>
                    <input
                      type="text"
                      value={formState.phone}
                      onChange={(event) => handleFieldChange("phone", event.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                  {formErrors.phone ? <small className={styles.fieldError}>{formErrors.phone}</small> : null}
                </label>

                <label className={styles.fieldWrap}>
                  <span>Género</span>
                  <div className={styles.selectWrap}>
                    <select
                      value={formState.gender}
                      onChange={(event) => handleFieldChange("gender", event.target.value as ProfileFormState["gender"])}
                      disabled={isSaving}
                    >
                      <option value="">Sin especificar</option>
                      <option value="MALE">Masculino</option>
                      <option value="FEMALE">Femenino</option>
                      <option value="NON_BINARY">No binario</option>
                      <option value="OTHER">Otro</option>
                    </select>
                    <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Nacimiento</span>
                  <div className={`${styles.leadingIconInput} ${formErrors.birthDate ? styles.fieldInputError : ""}`}>
                    <MaterialSymbol name="calendar_today" className={styles.leadingInputIcon} weight={500} opticalSize={16} />
                    <input
                      type="date"
                      value={formState.birthDate}
                      onChange={(event) => handleFieldChange("birthDate", event.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                  {formErrors.birthDate ? <small className={styles.fieldError}>{formErrors.birthDate}</small> : null}
                </label>

                <label className={styles.fieldWrap}>
                  <span>Altura</span>
                  <div className={`${styles.trailingUnitInput} ${formErrors.heightCm ? styles.fieldInputError : ""}`}>
                    <input
                      type="number"
                      value={formState.heightCm}
                      onChange={(event) => handleFieldChange("heightCm", event.target.value)}
                      disabled={isSaving}
                    />
                    <i>cm</i>
                  </div>
                  {formErrors.heightCm ? <small className={styles.fieldError}>{formErrors.heightCm}</small> : null}
                </label>

                <label className={styles.fieldWrap}>
                  <span>Peso</span>
                  <div className={`${styles.trailingUnitInput} ${formErrors.weightKg ? styles.fieldInputError : ""}`}>
                    <input
                      type="number"
                      value={formState.weightKg}
                      onChange={(event) => handleFieldChange("weightKg", event.target.value)}
                      disabled={isSaving}
                    />
                    <i>kg</i>
                  </div>
                  {formErrors.weightKg ? <small className={styles.fieldError}>{formErrors.weightKg}</small> : null}
                </label>
              </form>

              {saveError ? <p className={styles.modalError}>{saveError}</p> : null}
            </div>

            <footer className={styles.editFooter}>
              <button type="button" className={styles.modalCancelGhostButton} onClick={closeModal} disabled={isSaving}>
                Cancelar
              </button>
              <button type="submit" form="perfil-edit-form" className={styles.modalConfirmButton} disabled={isSaving}>
                <MaterialSymbol name="save" className={styles.confirmIcon} fill={1} weight={500} opticalSize={18} />
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
