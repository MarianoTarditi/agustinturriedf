import styles from "@/app/(private)/videoteca/videoteca.module.css";
import { MaterialSymbol } from "@/components/material-symbol";
import { PrivateBreadcrumb } from "@/components/private-breadcrumb";
import { PrivateTopbar } from "@/components/private-topbar";

type FolderCard = {
  name: string;
  updatedAt: string;
  fileCount: number;
  tags: string[];
};

const folders: FolderCard[] = [
  {
    name: "RODILLA",
    updatedAt: "12 Oct 2023",
    fileCount: 14,
    tags: ["rodilla", "movilidad"],
  },
  {
    name: "May correa",
    updatedAt: "08 Oct 2023",
    fileCount: 2,
    tags: ["aad"],
  },
  {
    name: "Cadera",
    updatedAt: "25 Sep 2023",
    fileCount: 8,
    tags: ["cadera", "atleta"],
  },
  {
    name: "CORE & ESTABILIDAD",
    updatedAt: "14 Sep 2023",
    fileCount: 21,
    tags: ["core"],
  },
  {
    name: "Hombro",
    updatedAt: "02 Sep 2023",
    fileCount: 6,
    tags: ["articulación"],
  },
  {
    name: "Técnicas de Fuerza",
    updatedAt: "28 Ago 2023",
    fileCount: 32,
    tags: ["élite", "fuerza"],
  },
];

export default function VideotecaPage() {
  return (
    <section className={styles.page}>
      <PrivateBreadcrumb current="Videoteca" />
      <PrivateTopbar
        title="Gestión de Videoteca"
        subtitle="Centralizá ejercicios, movilidad y técnica en carpetas operativas para que el alumno encuentre contenido relevante de forma rápida."
      />

      <div className={styles.content}>
        <section className={styles.hero}>
          <button type="button" className={styles.createFolderButton}>
            <MaterialSymbol name="create_new_folder" className={styles.createFolderIcon} fill={1} weight={500} opticalSize={20} />
            <span>+ Nueva carpeta</span>
          </button>
        </section>

        <section className={styles.controlsRow}>
          <div className={styles.filtersWrap}>
            <label className={styles.sortWrap}>
              <select defaultValue="Más recientes" aria-label="Ordenar carpeta">
                <option>Más recientes</option>
                <option>A-Z</option>
                <option>Más archivos</option>
              </select>
              <MaterialSymbol name="expand_more" className={styles.selectIcon} weight={500} opticalSize={18} />
            </label>

            <button type="button" className={styles.filterButton}>
              <MaterialSymbol name="filter_alt" className={styles.filterIcon} weight={500} opticalSize={18} />
              Filtrar
            </button>
          </div>

          <div className={styles.viewToggle} role="group" aria-label="Cambiar vista de carpetas">
            <button type="button" className={`${styles.viewButton} ${styles.viewButtonActive}`} aria-label="Vista de grilla">
              <MaterialSymbol name="grid_view" className={styles.viewIcon} weight={500} opticalSize={20} />
            </button>
            <button type="button" className={styles.viewButton} aria-label="Vista de lista">
              <MaterialSymbol name="view_list" className={styles.viewIcon} weight={500} opticalSize={20} />
            </button>
          </div>
        </section>

        <section className={styles.folderGrid}>
          {folders.map((folder) => (
            <article key={folder.name} className={styles.folderCard}>
              <div className={styles.cardHead}>
                <span className={styles.folderIconWrap}>
                  <MaterialSymbol name="folder" className={styles.folderIcon} fill={1} weight={500} opticalSize={22} />
                </span>

                <button type="button" className={styles.moreButton} aria-label={`Más acciones para ${folder.name}`}>
                  <MaterialSymbol name="more_vert" className={styles.moreIcon} weight={500} opticalSize={20} />
                </button>
              </div>

              <div className={styles.cardBody}>
                <h3>{folder.name}</h3>
                <p className={styles.cardMeta}>Última actualización: {folder.updatedAt}</p>

                <div className={styles.cardFooter}>
                  <span className={styles.filesCount}>
                    <MaterialSymbol name="video_library" className={styles.filesIcon} weight={500} opticalSize={16} />
                    {folder.fileCount} archivos
                  </span>

                  <div className={styles.tags}>
                    {folder.tags.map((tag) => (
                      <span key={`${folder.name}-${tag}`} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}

          <article className={styles.addCard}>
            <span className={styles.addCardIconWrap}>
              <MaterialSymbol name="create_new_folder" className={styles.addCardIcon} weight={500} opticalSize={24} />
            </span>
            <p>Crear carpeta</p>
          </article>
        </section>

        <section className={styles.featuredSection}>
          <h2>Videos recientes destacados</h2>

          <div className={styles.featuredGrid}>
            <article className={styles.masterCard}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhWWoE49lN5SVlc01PdlApLpKxO0qJD1GtcDGyQXM9CmTU7ukxomyZRlxXcyuBiPDOPDExU1qXNcxNuarc6n8L3BuLGhYSHGHyUKJP2o2ltzvxx9OZ_L2xicOX04EC_9Ptk8c_awkgwqdXSsxqEAkt6tD7cuvnreMI0uBju6YBjPQKmjmv9YIKkRlfP49-_FOe0tsuetJCWz59byW3MKXSWQKT3h26JYPDl7-J5AYWIu6P1RIkogPE9mDs5PE2Yn_8jDRy_AaTs3kv"
                alt="Atleta realizando sentadilla con barra"
              />

              <div className={styles.masterOverlay} aria-hidden="true" />

              <div className={styles.masterContent}>
                <span className={styles.masterBadge}>Masterclass</span>
                <h3>ESTABILIDAD DE CORE NIVEL 3</h3>
                <p>Explicación técnica detallada sobre la activación del transverso abdominal durante cargas máximas.</p>
              </div>

              <button type="button" className={styles.playButton} aria-label="Reproducir video destacado">
                <MaterialSymbol name="play_arrow" className={styles.playIcon} fill={1} weight={500} opticalSize={36} />
              </button>
            </article>

            <article className={styles.tipCard}>
              <div className={styles.tipCopy}>
                <MaterialSymbol name="tips_and_updates" className={styles.tipIcon} fill={1} weight={500} opticalSize={36} />
                <h3>Tip del día: Movilidad de Tobillo</h3>
                <p>
                  El 80% de los problemas en sentadilla profunda derivan de una dorsiflexión limitada. Revisá la carpeta de
                  Mobility Foundations para ver el nuevo video explicativo.
                </p>
              </div>

              <button type="button" className={styles.tipButton}>
                Ver carpeta
              </button>
            </article>
          </div>
        </section>
      </div>

      <button type="button" className={styles.fab} aria-label="Subir video">
        <MaterialSymbol name="cloud_upload" className={styles.fabIcon} fill={1} weight={500} opticalSize={24} />
      </button>

      <div className={styles.localGlowPrimary} aria-hidden="true" />
      <div className={styles.localGlowSecondary} aria-hidden="true" />
    </section>
  );
}
