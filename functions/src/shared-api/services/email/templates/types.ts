/** A rendered email, always in both HTML and plaintext — no hosted templates. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}
