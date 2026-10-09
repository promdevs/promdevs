// Fixed identifiers only: the decision, update and audit run under the same lock.
export const projectMissingPublicationSql = (
  alias: string,
) => `array_remove(ARRAY[
  CASE WHEN nullif(btrim(${alias}.slug),'') IS NULL THEN 'URL slug' END,
  CASE WHEN nullif(btrim(${alias}.description),'') IS NULL THEN 'Description' END,
  CASE WHEN cardinality(${alias}.product_types)=0 THEN 'Product type' END,
  CASE WHEN nullif(btrim(${alias}.cover_image),'') IS NULL THEN 'Cover image' END,
  CASE WHEN nullif(btrim(${alias}.cover_alt),'') IS NULL THEN 'Cover image alt text' END
]::text[],NULL)`;

export const reviewMissingPublicationSql = (
  alias: string,
) => `array_remove(ARRAY[
  CASE WHEN ${alias}.client_id IS NULL THEN 'Linked client' END,
  CASE WHEN nullif(btrim(${alias}.body),'') IS NULL THEN 'Review body' END,
  CASE WHEN ${alias}.show_identity AND nullif(btrim(${alias}.author_name),'') IS NULL THEN 'Author name for visible identity' END
]::text[],NULL)`;

export const publicationTransitionSql = (column: string) => `
  WHEN $4 NOT IN ('draft','published','archived') THEN 'transition'
  WHEN (SELECT ${column} FROM target)=$4 THEN 'transition'
  WHEN $4='published' AND (SELECT ${column} FROM target)!='draft' THEN 'transition'
  WHEN $4='archived' AND (SELECT ${column} FROM target)!='draft' THEN 'transition'`;
