/** Columns the Add Food screen needs for every food it can show. */
export const FOOD_SELECT =
  "id,canonical_name,serving_mode,kind,source_kind,owner_id,archived_at," +
  "food_servings(id,name,unit_class,grams)," +
  "food_nutrients(basis,serving_id,kcal,protein_g,carbs_g,fat_g,sat_fat_g,fibre_g,free_sugars_g,total_sugars_g,sodium_mg)";

/** Same, plus the note a person wrote for their own food. */
export const OWN_FOOD_SELECT = `${FOOD_SELECT},user_note`;
