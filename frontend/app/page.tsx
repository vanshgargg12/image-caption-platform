import styles from "./page.module.css";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Image Caption Platform</h1>
      <p className={styles.subtitle}>
        Upload images and receive AI-generated captions.
      </p>

      <section className={styles.status} aria-label="Service status">
        <h2>Service Status</h2>
        <ul>
          <li>
            <strong>Frontend:</strong> running
          </li>
          <li>
            <strong>Backend API:</strong> not checked (placeholder)
          </li>
          <li>
            <strong>Inference:</strong> not checked (placeholder)
          </li>
        </ul>
        <p className={styles.note}>
          Configured API base URL: <code>{apiBaseUrl}</code>
        </p>
      </section>
    </main>
  );
}
