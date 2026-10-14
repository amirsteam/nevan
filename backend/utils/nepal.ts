/**
 * Nepal's provinces and 77 districts, used to check delivery addresses and to
 * store district names in one spelling (the Kathmandu Valley shipping rate is
 * matched on the district). Keep in sync with frontend/src/utils/nepal.ts and
 * mobile/src/utils/nepal.ts.
 */

export const DISTRICTS_BY_PROVINCE: Readonly<Record<number, readonly string[]>> = {
  1: ["Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"],
  2: ["Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"],
  3: ["Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"],
  4: ["Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun"],
  5: ["Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Palpa", "Parasi", "Pyuthan", "Rolpa", "Rukum East", "Rupandehi"],
  6: ["Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu", "Rukum West", "Salyan", "Surkhet"],
  7: ["Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti", "Kailali", "Kanchanpur"],
};

export const PROVINCE_NAMES: Readonly<Record<number, string>> = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpashchim",
};

// Other spellings, short forms and big cities people type as the district
// (the mobile app took free text before it had a picker). A name that exists
// in two provinces lists both; the address's province picks one.
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  ktm: ["Kathmandu"],
  patan: ["Lalitpur"],
  bkt: ["Bhaktapur"],
  kavre: ["Kavrepalanchok"],
  kabhre: ["Kavrepalanchok"],
  kavrepalanchowk: ["Kavrepalanchok"],
  kabhrepalanchok: ["Kavrepalanchok"],
  sindhupalchowk: ["Sindhupalchok"],
  makawanpur: ["Makwanpur"],
  chitawan: ["Chitwan"],
  nawalparasi: ["Nawalpur", "Parasi"],
  "nawalparasi east": ["Nawalpur"],
  "nawalparasi west": ["Parasi"],
  kapilbastu: ["Kapilvastu"],
  dhanusa: ["Dhanusha"],
  tanahu: ["Tanahun"],
  tehrathum: ["Terhathum"],
  udaypur: ["Udayapur"],
  bardia: ["Bardiya"],
  rukum: ["Rukum East", "Rukum West"],
  "eastern rukum": ["Rukum East"],
  "western rukum": ["Rukum West"],
  pokhara: ["Kaski"],
  biratnagar: ["Morang"],
  dharan: ["Sunsari"],
  birgunj: ["Parsa"],
  janakpur: ["Dhanusha"],
  bharatpur: ["Chitwan"],
  hetauda: ["Makwanpur"],
  butwal: ["Rupandehi"],
  bhairahawa: ["Rupandehi"],
  nepalgunj: ["Banke"],
  dhangadhi: ["Kailali"],
};

/** "  Kathmandu District " -> "kathmandu" */
const toKey = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ (district|jilla)$/, "");

/**
 * The district's standard name if it is in the given province (any case,
 * common alternative spellings accepted), otherwise null.
 */
export const canonicalDistrict = (province: number, district: string): string | null => {
  const districts = DISTRICTS_BY_PROVINCE[province];
  if (!districts) return null;
  const key = toKey(String(district ?? ""));
  if (!key) return null;
  const exact = districts.find((d) => d.toLowerCase() === key);
  if (exact) return exact;
  return (ALIASES[key] ?? []).find((name) => districts.includes(name)) ?? null;
};

/** A district's standard name and province when the province isn't given */
export const findDistrict = (district: string): { district: string; province: number } | null => {
  for (const province of Object.keys(DISTRICTS_BY_PROVINCE).map(Number)) {
    const name = canonicalDistrict(province, district);
    if (name) return { district: name, province };
  }
  return null;
};
