'use strict';

const axios = require('axios');

const RXNAV_BASE = process.env.RXNAV_BASE_URL || 'https://rxnav.nlm.nih.gov/REST';

// In-process cache — RxCUIs and ingredient names are stable, no need to re-fetch
const ingredientCache = new Map();

/**
 * Resolve a drug name (brand or generic) to its lowercase generic ingredient
 * name via RxNorm.  Returns the normalized name, or the original name lowercased
 * if resolution fails (fail-safe — never throws).
 *
 * Examples:
 *   "Coumadin" → "warfarin"
 *   "Tylenol"  → "acetaminophen"
 *   "warfarin" → "warfarin"
 */
async function normalizeToIngredient(drugName) {
  const key = drugName.toLowerCase().trim();
  if (ingredientCache.has(key)) return ingredientCache.get(key);

  try {
    // Step 1: resolve to RxCUI
    const cuiRes = await axios.get(`${RXNAV_BASE}/rxcui.json`, {
      params: { name: key, search: 1 },
      timeout: 4000,
    });
    const cui = cuiRes.data?.idGroup?.rxnormId?.[0];
    if (!cui) {
      ingredientCache.set(key, key);
      return key;
    }

    // Step 2: get the concept's properties to find its ingredient-level name
    const propRes = await axios.get(`${RXNAV_BASE}/rxcui/${cui}/properties.json`, {
      timeout: 4000,
    });
    const props = propRes.data?.properties;
    if (!props) {
      ingredientCache.set(key, key);
      return key;
    }

    // If the concept is already an ingredient (tty=IN), use its name
    // If it's a clinical drug (SCD/BN/…), resolve its ingredient via related
    if (props.tty === 'IN' || props.tty === 'MIN') {
      const normalized = props.name.toLowerCase();
      ingredientCache.set(key, normalized);
      return normalized;
    }

    // For clinical drug concepts, get the ingredient(s) via the related endpoint
    const relRes = await axios.get(`${RXNAV_BASE}/rxcui/${cui}/related.json`, {
      params: { tty: 'IN' },
      timeout: 4000,
    });
    const groups = relRes.data?.relatedGroup?.conceptGroup || [];
    const inGroup = groups.find(g => g.tty === 'IN');
    const ingredientName = inGroup?.conceptProperties?.[0]?.name?.toLowerCase();
    const result = ingredientName || key;
    ingredientCache.set(key, result);
    return result;
  } catch {
    ingredientCache.set(key, key);
    return key;
  }
}

/**
 * Normalize a list of drug names to their generic ingredient names via RxNorm.
 * Falls back to lowercased original names on any failure.
 * Returns null if RxNav is unreachable (network error on first call).
 */
async function normalizedrugNames(medNames) {
  if (!medNames || medNames.length === 0) return medNames;

  try {
    // Quick connectivity check
    await axios.get(`${RXNAV_BASE}/version.json`, { timeout: 3000 });
  } catch {
    console.warn('[medication-agent] RxNav unreachable — skipping name normalization');
    return null;
  }

  const normalized = await Promise.all(medNames.map(n => normalizeToIngredient(n)));
  const changed = normalized.filter((n, i) => n !== medNames[i].toLowerCase());
  if (changed.length > 0) {
    console.log(`[medication-agent] RxNav normalized ${changed.length} drug name(s)`);
  }
  return normalized;
}

module.exports = { normalizedrugNames };

