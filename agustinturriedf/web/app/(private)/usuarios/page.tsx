"use client";

import { type MouseEvent, useEffect, useState } from "react";
import styles from "@/app/(private)/usuarios/usuarios.module.css";
import { DestructiveConfirmationModal } from "@/components/destructive-confirmation-modal";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type UserRow = {
  photo: string;
  name: string;
  fullName: string;
  email: string;
  phone: string;
  role: "student" | "trainer" | "admin";
  status: "Activo" | "Inactivo";
  birthDate: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  initials: string;
  createdAt: string;
};

type ModalType = "create" | "detail" | "edit" | "delete";

const users: UserRow[] = [
  {
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCEOBSa1LORDZ37Pka37xQRV98m3zH_58ZCj86h_-50SpNh20-bRjJlmQxZa618aX6DXGI76ZMHdcE4NlLDFI98GEzqyX2J4lQQEFyg5M-gda7VGr81bTMHokT4eogHANBonmFSkvx-JowKsXT3opftip_P614RGd5ofgks36iIM_xS7vchmCGiK_lHOuBx0FNyhU6RmdJny7nxSUuEB7_dmDZwMOvSkYcpXXUxRKu3Qbhe-d_KAN-kPF6HVAeeeJgkekfCVHI3PPEf",
    name: "Lucas Silva",
    fullName: "Lucas Silva de Oliveira",
    email: "lucas@gmail.com",
    phone: "+55 11 98765-4321",
    role: "student",
    status: "Activo",
    birthDate: "12/05/1998",
    gender: "Masculino",
    heightCm: "182",
    weightKg: "78.5",
    initials: "LS",
    createdAt: "03/04/2026",
  },
  {
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBupNdmlNon-SJmn7ZPAf7H4OKsBwMDsvh0pnMkOXXzrO3OFM8Cty7LZnqgRtPjMplYJpoaHP9svoLpAUDmDhM3ri6V8fAbLPle523QItKO-gHZHCwOZIMvXIVdc8Zqrk1mKmr2eKZKIiOv_b4_lON5G6Sbb3y8aTP4bEOQPUUvTnhBLGKmk6nkkHFSkQazH0h-fzI-H6TNZJCDMVikbrSQ7n5FfazlGPRJ_FsbFUc0E_CDxiztBnHCE6fzl9OAyzHpHMMTwtpoc_ix",
    name: "Elena Torres",
    fullName: "Elena Soledad Torres",
    email: "e.torres@kinetic.com",
    phone: "+54 9 11 5468-2214",
    role: "trainer",
    status: "Inactivo",
    birthDate: "18/11/1994",
    gender: "Femenino",
    heightCm: "171",
    weightKg: "63",
    initials: "ET",
    createdAt: "11/12/2025",
  },
  {
    photo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCBpMjVFR49-yZrezjdr3YlkrbSOOvZdpVPurxIkdm-_s4yuKV8hwi4RdTD4ew_wIVvfRTjsUjFP76-8fN2rfy4ez4dqs7FKkY_NtCfjZOgna5GrTq_gSsP54DmgF-ZRF31K2L8gR9wyVsn3g3j9uhAakSRNsVPebuuQIIO508ToVN7_K8jSfTO65Y6KpI5_bursV6i7djnDhGdxDwBtSem9Hhgk0GrgiCkh8rpKKEu_0Xir-6esgwt27y5GT5xsvzLveP7ltiUaz6X",
    name: "Marco Rossi",
    fullName: "Marco Antonio Rossi",
    email: "mrossi@admin.com",
    phone: "+54 9 11 2222-7777",
    role: "admin",
    status: "Activo",
    birthDate: "28/02/1989",
    gender: "Masculino",
    heightCm: "177",
    weightKg: "84",
    initials: "MR",
    createdAt: "20/08/2024",
  },
];

function DotIcon() {
  return <span className={styles.dot} aria-hidden="true" />;
}

export default function UsuariosPage() {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [activeUser, setActiveUser] = useState<UserRow>(users[0]);
  const [openActionsForUser, setOpenActionsForUser] = useState<string | null>(null);

  const closeModal = () => setActiveModal(null);

  const openUserModal = (modal: Exclude<ModalType, "create">, user: UserRow) => {
    setActiveUser(user);
    setOpenActionsForUser(null);
    setActiveModal(modal);
  };

  const closeActionsIfClickedOutside = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (!target.closest(`.${styles.rowActionsWrap}`)) {
      setOpenActionsForUser(null);
    }
  };

  useEffect(() => {
    if (!activeModal) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [activeModal]);

  return (
    <section className={styles.page} onClick={closeActionsIfClickedOutside}>
      <PrivateBreadcrumb current="Usuarios" />
      <PrivateTopbar
        title="Gestión de Alumnos"
        subtitle="Controla perfiles, roles y estado operativo de la base para mantener seguimiento preciso y comunicación efectiva."
      />

      <div className={styles.content}>
        <section className={styles.metrics}>
          <article className={styles.metricCard}>
            <div className={styles.metricGlow} aria-hidden="true" />
            <div className={styles.metricTop}>
              <span className={styles.metricIcon}>
                <MaterialSymbol name="person_check" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
              <span className={styles.metricBadge}>Tiempo real</span>
            </div>
            <h3 className={styles.metricLabel}>Alumnos activos</h3>
            <p className={styles.metricValue}>
              4 <span>1 inactivo</span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricTop}>
              <span className={styles.metricIconSecondary}>
                <MaterialSymbol name="admin_panel_settings" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Equipo de gestión</h3>
            <p className={styles.metricValue}>
              2 <span>Admins y trainers</span>
            </p>
          </article>

          <article className={styles.metricCard}>
            <div className={styles.metricTop}>
              <span className={styles.metricIconTertiary}>
                <MaterialSymbol name="database" className={styles.metricSymbol} weight={500} opticalSize={20} />
              </span>
            </div>
            <h3 className={styles.metricLabel}>Base total</h3>
            <p className={styles.metricValue}>
              5 <span>Usuarios registrados</span>
            </p>
          </article>
        </section>

        <section className={styles.tableSection}>
          <div className={styles.tableToolbar}>
            <div className={styles.tableTitleRow}>
              <h3>5 usuarios totales</h3>
              <DotIcon />
              <span>Lista actualizada</span>
            </div>

            <div className={styles.tableActions}>
              <button type="button" className={styles.sortButton}>
                <MaterialSymbol name="sort" className={styles.actionIcon} weight={450} opticalSize={20} />
                Ordenar vista
              </button>
              <button
                type="button"
                className={styles.createButton}
                onClick={() => {
                  setOpenActionsForUser(null);
                  setActiveModal("create");
                }}
              >
                <MaterialSymbol name="person_add" className={styles.actionIcon} fill={1} weight={500} opticalSize={20} />
                Crear alumno
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Estado</th>
                  <th className={styles.alignRight}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.email}>
                    <td>
                      <div className={`${styles.avatarWrap} ${user.status === "Inactivo" ? styles.avatarInactive : ""}`}>
                        <img src={user.photo} alt={user.name} className={styles.userImage} />
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.userName} ${user.status === "Inactivo" ? styles.userNameInactive : ""}`}>{user.name}</span>
                    </td>
                    <td>
                      <span className={`${styles.userEmail} ${user.status === "Inactivo" ? styles.userEmailInactive : ""}`}>{user.email}</span>
                    </td>
                    <td>
                      <span className={`${styles.roleChip} ${styles[`role_${user.role}`]}`}>{user.role}</span>
                    </td>
                    <td>
                      <span className={styles.statusWrap}>
                        <span className={`${styles.statusDot} ${user.status === "Activo" ? styles.active : styles.inactive}`} />
                        <span className={user.status === "Activo" ? styles.statusActive : styles.statusInactive}>{user.status}</span>
                      </span>
                    </td>
                    <td className={styles.alignRight}>
                      <div className={styles.rowActionsWrap}>
                        <button
                          className={styles.moreButton}
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={openActionsForUser === user.email}
                          aria-label={`Acciones para ${user.name}`}
                          onClick={() => setOpenActionsForUser((current) => (current === user.email ? null : user.email))}
                        >
                          <MaterialSymbol name="more_vert" className={styles.rowActionIcon} weight={500} opticalSize={20} />
                        </button>

                        {openActionsForUser === user.email ? (
                          <div className={styles.rowMenu} role="menu" aria-label={`Opciones para ${user.name}`}>
                            <button type="button" role="menuitem" onClick={() => openUserModal("detail", user)}>
                              <MaterialSymbol name="visibility" className={styles.rowMenuIcon} weight={500} opticalSize={18} />
                              Ver detalle
                            </button>
                            <button type="button" role="menuitem" onClick={() => openUserModal("edit", user)}>
                              <MaterialSymbol name="edit_note" className={styles.rowMenuIcon} weight={500} opticalSize={18} />
                              Editar usuario
                            </button>
                            <button type="button" role="menuitem" onClick={() => openUserModal("delete", user)}>
                              <MaterialSymbol
                                name="delete"
                                className={`${styles.rowMenuIcon} ${styles.rowMenuIconDanger}`}
                                weight={500}
                                opticalSize={18}
                              />
                              Eliminar alumno
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer className={styles.pagination}>
              <p>Página 1 de 1</p>
              <div>
                <button type="button" disabled>
                  <MaterialSymbol name="chevron_left" className={styles.paginationIcon} weight={500} opticalSize={20} />
                </button>
                <button type="button">
                  <MaterialSymbol name="chevron_right" className={styles.paginationIcon} weight={500} opticalSize={20} />
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>

      {activeModal && activeModal !== "delete" ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeModal}>
          {activeModal === "create" ? (
            <div className={styles.createModal} role="dialog" aria-modal="true" aria-label="Crear alumno" onClick={(event) => event.stopPropagation()}>
              <div className={styles.createModalBody}>
                <header className={styles.modalHeaderRow}>
                  <div>
                    <h2 className={styles.modalTitle}>Crear alumno</h2>
                    <p className={styles.modalDescription}>
                      Los usuarios Admin y trainer pueden dar de alta alumnos desde esta seccion. El usuario accedera al sistema con su
                      <span className={styles.modalCodeLabel}> &quot;Email&quot; </span>y contraseña
                      <span className={styles.modalCodeLabel}> &quot;123456789&quot;</span>.
                    </p>
                  </div>
                  <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={closeModal}>
                    <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
                  </button>
                </header>

                <form className={styles.createForm} onSubmit={(event) => event.preventDefault()}>
                  <div className={styles.formGroupGrid2}>
                    <label className={styles.fieldWrap}>
                      <span>Nombre *</span>
                      <input type="text" placeholder="Ej. Juan" />
                    </label>
                    <label className={styles.fieldWrap}>
                      <span>Apellido *</span>
                      <input type="text" placeholder="Ej. Pérez" />
                    </label>
                  </div>

                  <div className={styles.formGroupGrid2}>
                    <label className={styles.fieldWrap}>
                      <span>Email *</span>
                      <input type="email" placeholder="email@ejemplo.com" />
                    </label>
                    <label className={styles.fieldWrap}>
                      <span>Celular *</span>
                      <input type="tel" placeholder="+54 9 11 7152 8033" />
                    </label>
                  </div>

                  <div className={styles.formGroupGrid3}>
                    <label className={styles.fieldWrap}>
                      <span>F. Nacimiento</span>
                      <input type="text" placeholder="DD/MM/AAAA" />
                    </label>
                    <label className={styles.fieldWrap}>
                      <span>Género</span>
                      <div className={styles.selectWrap}>
                        <select defaultValue="" aria-label="Género">
                          <option value="" disabled>
                            Seleccionar
                          </option>
                          <option value="m">Masculino</option>
                          <option value="f">Femenino</option>
                          <option value="o">Otro</option>
                        </select>
                        <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                      </div>
                    </label>
                    <div className={styles.subGrid2}>
                      <label className={styles.fieldWrap}>
                        <span>Altura</span>
                        <input type="number" placeholder="cm" />
                      </label>
                      <label className={styles.fieldWrap}>
                        <span>Peso</span>
                        <input type="number" placeholder="kg" />
                      </label>
                    </div>
                  </div>

                  <div className={styles.paymentSection}>
                    <div className={styles.paymentTitleRow}>
                      <MaterialSymbol name="payments" className={styles.paymentTitleIcon} fill={1} weight={500} opticalSize={18} />
                      <h4>Primer pago</h4>
                    </div>
                    <div className={`${styles.formGroupGrid2} ${styles.paymentFieldsGrid}`}>
                      <label className={`${styles.fieldWrap} ${styles.moneyField}`}>
                        <span>Monto inicial *</span>
                        <div className={styles.moneyInputWrap}>
                          <i>$</i>
                          <input type="number" placeholder="0.00" />
                        </div>
                      </label>
                      <label className={styles.fieldWrap}>
                        <span>Ciclo de cobro (dias) *</span>
                        <input type="number" defaultValue="30" />
                      </label>
                    </div>
                  </div>

                  <div className={styles.modalActionsCreate}>
                    <button type="button" className={styles.modalCancelButton} onClick={closeModal}>
                      Cancelar
                    </button>
                    <button type="submit" className={styles.modalConfirmButton}>
                      Crear alumno
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {activeModal === "detail" ? (
            <div className={styles.detailModal} role="dialog" aria-modal="true" aria-label="Perfil de Usuario" onClick={(event) => event.stopPropagation()}>
              <header className={styles.detailHeader}>
                <div>
                  <h2>Perfil de Usuario</h2>
                  <p>Detalles completos e información personal.</p>
                </div>
                <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={closeModal}>
                  <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
                </button>
              </header>

              <div className={styles.detailBody}>
                <section className={styles.profileHero}>
                  <div className={styles.heroAvatarWrap}>
                    <div className={styles.heroAvatar}>{activeUser.initials}</div>
                    <div className={styles.heroStatusPill}>
                      <span aria-hidden="true" />
                      Activo
                    </div>
                  </div>
                  <div>
                    <h3>{activeUser.name}</h3>
                    <div className={styles.profileBadges}>
                      <span>Estudiante</span>
                    </div>
                  </div>
                </section>

                <section className={styles.detailGrid}>
                  <article className={styles.detailSection}>
                    <header>
                      <MaterialSymbol name="badge" className={styles.detailSectionIcon} weight={500} opticalSize={18} />
                      <h4>Información Personal</h4>
                    </header>
                    <div className={styles.personalCard}>
                      <div>
                        <label>Nombre Completo</label>
                        <p>{activeUser.fullName}</p>
                      </div>
                      <div>
                        <label>Email</label>
                        <p>{activeUser.email}</p>
                      </div>
                      <div>
                        <label>Teléfono</label>
                        <p>{activeUser.phone}</p>
                      </div>
                    </div>
                  </article>

                  <article className={styles.detailSection}>
                    <header>
                      <MaterialSymbol name="fitness_center" className={styles.detailSectionIcon} weight={500} opticalSize={18} />
                      <h4>Físico &amp; Biometría</h4>
                    </header>
                    <div className={styles.metricsGrid}>
                      <div>
                        <label>Género</label>
                        <p>{activeUser.gender}</p>
                      </div>
                      <div>
                        <label>Fecha Nac.</label>
                        <p>{activeUser.birthDate}</p>
                      </div>
                      <div>
                        <label>Altura</label>
                        <p>{activeUser.heightCm} cm</p>
                      </div>
                      <div>
                        <label>Peso</label>
                        <p>{activeUser.weightKg} kg</p>
                      </div>
                    </div>
                  </article>
                </section>
              </div>

              <footer className={styles.detailFooter}>
                <div>
                  <MaterialSymbol name="schedule" className={styles.detailFooterIcon} weight={500} opticalSize={16} />
                  <span>Creado: {activeUser.createdAt}</span>
                </div>
                <div className={styles.detailFooterActions}>
                  <button type="button" className={styles.modalCancelGhostButton} onClick={closeModal}>
                    Cerrar
                  </button>
                  <button type="button" className={styles.modalConfirmButton} onClick={() => setActiveModal("edit")}>
                    Editar Perfil
                  </button>
                </div>
              </footer>
            </div>
          ) : null}

          {activeModal === "edit" ? (
            <div className={styles.editModal} role="dialog" aria-modal="true" aria-label="Editar usuario" onClick={(event) => event.stopPropagation()}>
              <header className={styles.editHeader}>
                <div>
                  <div className={styles.editTitleRow}>
                    <MaterialSymbol name="edit_note" className={styles.detailSectionIcon} weight={500} opticalSize={20} />
                    <h2>Editar Usuario</h2>
                  </div>
                  <p>Modifica la información personal del usuario.</p>
                </div>
                <button type="button" className={styles.modalCloseButton} aria-label="Cerrar modal" onClick={closeModal}>
                  <MaterialSymbol name="close" className={styles.modalCloseIcon} weight={500} opticalSize={22} />
                </button>
              </header>

              <div className={styles.editBody}>
                <section className={styles.editProfileRow}>
                  <div className={styles.editAvatarWrap}>
                    <img src={activeUser.photo} alt={activeUser.name} />
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
                    <small>Imagen actual conservada</small>
                  </div>
                </section>

                <form className={styles.editForm} onSubmit={(event) => event.preventDefault()}>
                  <label className={styles.fieldWrap}>
                    <span>Nombre</span>
                    <input type="text" defaultValue={activeUser.name.split(" ")[0]} />
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Apellido</span>
                    <input type="text" defaultValue={activeUser.name.split(" ")[1] ?? ""} />
                  </label>
                  <label className={`${styles.fieldWrap} ${styles.editFullRow}`}>
                    <span>Celular</span>
                    <div className={styles.leadingIconInput}>
                      <MaterialSymbol name="phone_android" className={styles.leadingInputIcon} weight={500} opticalSize={18} />
                      <input type="text" defaultValue={activeUser.phone} />
                    </div>
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Género</span>
                    <div className={styles.selectWrap}>
                      <select defaultValue={activeUser.gender}>
                        <option>Masculino</option>
                        <option>Femenino</option>
                        <option>No binario</option>
                        <option>Otro</option>
                      </select>
                      <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
                    </div>
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Fecha de nacimiento</span>
                    <div className={styles.leadingIconInput}>
                      <MaterialSymbol name="calendar_today" className={styles.leadingInputIcon} weight={500} opticalSize={16} />
                      <input type="text" defaultValue={activeUser.birthDate} />
                    </div>
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Altura (cm)</span>
                    <div className={styles.trailingUnitInput}>
                      <input type="number" defaultValue={activeUser.heightCm} />
                      <i>cm</i>
                    </div>
                  </label>
                  <label className={styles.fieldWrap}>
                    <span>Peso (kg)</span>
                    <div className={styles.trailingUnitInput}>
                      <input type="number" defaultValue={activeUser.weightKg} />
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
          ) : null}

        </div>
      ) : null}

      {activeModal === "delete" ? (
        <DestructiveConfirmationModal
          ariaLabel={`Eliminar alumno ${activeUser.name}`}
          title="¿Eliminar alumno?"
          description="Esta acción es permanente y no se puede deshacer. Se eliminarán todos los datos, rutinas y registros de pagos asociados a este usuario."
          headerAlignment="center"
          density="compact"
          confirmLabel="Eliminar alumno"
          onConfirm={closeModal}
          onCancel={closeModal}
          targetCard={
            <>
              <div className={styles.deleteAvatarWrap}>
                <img src={activeUser.photo} alt={activeUser.name} />
              </div>

              <div>
                <small>Gestión de alumnos</small>
                <strong>{activeUser.name}</strong>
              </div>

              <em>
                {activeUser.email} · {activeUser.status}
              </em>
            </>
          }
        />
      ) : null}
    </section>
  );
}
