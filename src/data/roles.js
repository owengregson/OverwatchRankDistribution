/**
 * The roles a rank is held in. The game ranks a player in each role on its
 * own, so every datapoint says which role its figure is for (`role`, one of
 * these ids).
 *
 * A visitor is never asked: a submission's role is read off its screenshot
 * (src/lib/screenshot), and only the admin panel shows it.
 */
export const ROLES = [
  { id: 'tank', name: 'Tank' },
  { id: 'damage', name: 'Damage' },
  { id: 'support', name: 'Support' },
];

/** The role with this id, or undefined. */
export const roleById = (id) => ROLES.find((role) => role.id === id);
