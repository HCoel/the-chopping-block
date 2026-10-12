// Shown where an axe has no photo yet
export default function AxeSilhouette() {
  return (
    <svg class="thumb placeholder" viewBox="0 0 120 120" role="img" aria-label="No photo">
      <path d="M22 44h22l14 4c16-6 30-14 42-22 8 22 8 46 0 68-12-8-26-16-42-22l-14 4H22z" fill="var(--border)" />
      <ellipse cx="34" cy="60" rx="5" ry="9" fill="var(--card)" />
    </svg>
  )
}
