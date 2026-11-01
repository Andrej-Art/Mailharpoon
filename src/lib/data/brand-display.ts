// How brand keys from brands.json are written in user-facing text.
const DISPLAY: Record<string, string> = {
  paypal: "PayPal", dhl: "DHL", ups: "UPS", usps: "USPS", dpd: "DPD", ing: "ING", dkb: "DKB", n26: "N26", hsbc: "HSBC", irs: "IRS",
  att: "AT&T", ubs: "UBS", icloud: "iCloud", itunes: "iTunes", linkedin: "LinkedIn", whatsapp: "WhatsApp", tiktok: "TikTok",
  github: "GitHub", gitlab: "GitLab", godaddy: "GoDaddy", docusign: "DocuSign", wetransfer: "WeTransfer", metamask: "MetaMask",
  opensea: "OpenSea", trustwallet: "Trust Wallet", bankofamerica: "Bank of America", wellsfargo: "Wells Fargo", americanexpress: "American Express",
  amex: "Amex", deutschebank: "Deutsche Bank", office365: "Office 365", onedrive: "OneDrive", sharepoint: "SharePoint", steamcommunity: "Steam",
  epicgames: "Epic Games", playstation: "PlayStation", openai: "OpenAI", chatgpt: "ChatGPT", royalmail: "Royal Mail", aliexpress: "AliExpress",
  quickbooks: "QuickBooks", "credit-agricole": "Crédit Agricole", bnpparibas: "BNP Paribas", postfinance: "PostFinance", natwest: "NatWest",
  outlookweb: "Outlook", steamgames: "Steam", o2: "O2", elster: "ELSTER",
};

export function brandName(key: string): string {
  return DISPLAY[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
