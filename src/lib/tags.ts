export const USER_TAGS = [
  ["junk", "Junk"],
  ["homemade", "Homemade"],
  ["sugary_junk", "Sugary junk"],
] as const;

export const tagLabel = (tag: string) => USER_TAGS.find(([value]) => value === tag)?.[1] ?? tag.replace(/_/g, " ");
