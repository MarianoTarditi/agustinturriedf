"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "@/app/(private)/perfil/perfil.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

const profileData = {
  name: "Agustín Turri",
  email: "trainer@gmail.com",
  phone: "+54 2474 403379",
  role: "trainer",
  birthday: "07/05/2004",
  gender: "male",
  height: "182 cm",
  weight: "92 kg",
  createdAt: "12/02/2026",
  experience: "8+ Años",
  athletes: "120+",
  status: "Activo",
  photo:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBqgtqgjlAxP52Jn22d-ZH2B0dwpo6xRvYMvUlmlWtCIVAtpKErLGmQvI-mtWq9X8a6APByhlYYL69d8IOeN9aCyRGzF9uUf5c6wsLsLhVaHry1kabbScxvTYI3doNaa1IAjh-SE1bYzR680OgxECA_P08LFxJ_mio3HtKeBJLFm9hds2xCqG-EtTYedYWB4yOYcI5bXjtkwX0CCHzjFWm_1mgYq8XgizqToQASCWWD0qffFjxZQuPGfoKt34vVlbyiy4QChgUIuURu",
};

const technicalInfo = [
  { label: "Email", value: profileData.email },
  { label: "Teléfono", value: profileData.phone },
  { label: "Roles", value: profileData.role },
  { label: "Nacimiento", value: profileData.birthday },
  { label: "Género", value: profileData.gender },
  { label: "Altura", value: profileData.height },
  { label: "Peso", value: profileData.weight },
  { label: "Creación", value: profileData.createdAt },
];

export default function PerfilPage() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const profileEditDefaults = useMemo(
    () => ({
      name: profileData.name,
      email: profileData.email,
      phone: profileData.phone,
      gender: profileData.gender === "male" ? "Masculino" : profileData.gender,
      birthday: profileData.birthday,
      heightCm: profileData.height.replace(" cm", ""),
      weightKg: profileData.weight.replace(" kg", ""),
      photo: profileData.photo,
    }),
    [],
  );

  const closeModal = () => setIsEditModalOpen(false);

  useEffect(() => {
    if (!isEditModalOpen) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isEditModalOpen]);

  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Perfil" />
      <PrivateTopbar
        title="Perfil Profesional"
        subtitle="Gestiona tu identidad, datos de salud y disponibilidad para mantener una presencia premium y consistente en toda la plataforma."
      />

      <div className={styles.content}>
        <section className={styles.heroGrid}>
          <article className={styles.heroCard}>
            <div className={styles.avatarShell}>
              <img src={profileData.photo} alt={profileData.name} className={styles.heroPhoto} />
              <div className={styles.statusChip}>
                <span className={styles.statusDot} aria-hidden="true" />
                <span>{profileData.status}</span>
              </div>
            </div>

            <div className={styles.identity}>
              <header className={styles.identityHeader}>
                <h2>{profileData.name}</h2>
                <p>{profileData.email}</p>
              </header>

              <div className={styles.stats}>
                <article className={styles.statCard}>
                  <p>Experiencia</p>
                  <strong>{profileData.experience}</strong>
                </article>
                <article className={styles.statCard}>
                  <p>Atletas</p>
                  <strong>{profileData.athletes}</strong>
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
          <button type="button" className={styles.primaryButton} onClick={() => setIsEditModalOpen(true)}>
            <MaterialSymbol name="edit" className={styles.buttonIcon} fill={1} weight={500} opticalSize={20} />
            Editar perfil
          </button>
        </footer>
      </div>

      {isEditModalOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeModal}>
          <div className={styles.editModal} role="dialog" aria-modal="true" aria-label="Editar perfil" onClick={(event) => event.stopPropagation()}>
            <header className={styles.editHeader}>
              <div>
                <div className={styles.editTitleRow}>
                  <MaterialSymbol name="edit_note" className={styles.editTitleIcon} weight={500} opticalSize={20} />
                  <h2>Editar Perfil</h2>
                </div>
                <p>Actualizá tu información personal.</p>
              </div>
              <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={closeModal}>
                <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
              </button>
            </header>

            <div className={styles.editBody}>
              <section className={styles.editProfileRow}>
                <div className={styles.editAvatarWrap}>
                  <img src={profileEditDefaults.photo} alt={profileEditDefaults.name} />
                  <button type="button" aria-label="Cambiar foto">
                    <MaterialSymbol name="photo_camera" className={styles.editCameraIcon} weight={500} opticalSize={18} />
                  </button>
                </div>

                <div className={styles.editUploadWrap}>
                  <label>Foto de Perfil</label>
                  <button type="button">
                    <MaterialSymbol name="upload" className={styles.editUploadIcon} weight={500} opticalSize={16} />
                    Click para subir imagen
                  </button>
                  <small>Solo visual en esta versión</small>
                </div>
              </section>

              <form className={styles.editForm} onSubmit={(event) => event.preventDefault()}>
                <label className={styles.fieldWrap}>
                  <span>Nombre</span>
                  <input type="text" defaultValue={profileEditDefaults.name} />
                </label>

                <label className={styles.fieldWrap}>
                  <span>Email</span>
                  <div className={styles.leadingIconInput}>
                    <MaterialSymbol name="mail" className={styles.leadingInputIcon} weight={500} opticalSize={18} />
                    <input type="email" defaultValue={profileEditDefaults.email} />
                  </div>
                </label>

                <label className={`${styles.fieldWrap} ${styles.editFullRow}`}>
                  <span>Teléfono</span>
                  <div className={styles.leadingIconInput}>
                    <MaterialSymbol name="phone_android" className={styles.leadingInputIcon} weight={500} opticalSize={18} />
                    <input type="text" defaultValue={profileEditDefaults.phone} />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Género</span>
                  <div className={styles.selectWrap}>
                    <select defaultValue={profileEditDefaults.gender}>
                      <option>Masculino</option>
                      <option>Femenino</option>
                      <option>No binario</option>
                      <option>Otro</option>
                    </select>
                    <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Nacimiento</span>
                  <div className={styles.leadingIconInput}>
                    <MaterialSymbol name="calendar_today" className={styles.leadingInputIcon} weight={500} opticalSize={16} />
                    <input type="text" defaultValue={profileEditDefaults.birthday} />
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Altura</span>
                  <div className={styles.trailingUnitInput}>
                    <input type="number" defaultValue={profileEditDefaults.heightCm} />
                    <i>cm</i>
                  </div>
                </label>

                <label className={styles.fieldWrap}>
                  <span>Peso</span>
                  <div className={styles.trailingUnitInput}>
                    <input type="number" defaultValue={profileEditDefaults.weightKg} />
                    <i>kg</i>
                  </div>
                </label>
              </form>
            </div>

            <footer className={styles.editFooter}>
              <button type="button" className={styles.modalCancelGhostButton} onClick={closeModal}>
                Cancelar
              </button>
              <button type="button" className={styles.modalConfirmButton}>
                <MaterialSymbol name="save" className={styles.confirmIcon} fill={1} weight={500} opticalSize={18} />
                Guardar Cambios
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
