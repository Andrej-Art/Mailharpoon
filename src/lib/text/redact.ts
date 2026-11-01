// Removes personal data from a message before it leaves our server (AI layer).
// Links and the sender domain are kept because they are evidence, not personal data.

const RULES: [RegExp, string][] = [
  [/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,3})?\b/g, "[IBAN]"],
  [/\b(?:\d[ -]?){13,19}\b/g, "[KARTENNUMMER]"],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[E-MAIL]"],
  [/(?<![\w/.])(?:\+|00)\d{1,3}[\s/-]?(?:\(?\d{1,5}\)?[\s/-]?){2,5}\d{2,}(?![\w/])/g, "[TELEFON]"],
  [/(?<![\w/.])0\d{2,5}[\s/-]?\d{3,}(?:[\s/-]?\d{2,})*(?![\w/])/g, "[TELEFON]"],
  [/\b\d{3}[ ]?\d{2}[ ]?\d{3}[ ]?\d{3}\b/g, "[ID]"],
];

export function redact(text: string): string {
  let out = text;
  for (const [re, label] of RULES) out = out.replace(re, label);
  return out;
}
