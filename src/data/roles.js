/**
 * The roles a rank is held in. The game ranks a player in each role on its
 * own, so every datapoint says which role its figure is for (`role`, one of
 * these ids).
 *
 * A visitor is never asked: a submission's role is read off its screenshot
 * (src/lib/screenshot), and only the admin panel shows it.
 *
 * `icon` is the role's image in `assets/images`: a one-colour shape, drawn
 * in whatever colour the text around it has (components/Glyph.svelte).
 */
export const ROLES = [
  { id: 'tank', name: 'Tank', icon: 'tank_icon_light_fill.svg' },
  { id: 'damage', name: 'Damage', icon: 'damage_icon_light_fill.svg' },
  { id: 'support', name: 'Support', icon: 'support_icon_light_fill.svg' },
];

/** The role with this id, or undefined. */
export const roleById = (id) => ROLES.find((role) => role.id === id);
