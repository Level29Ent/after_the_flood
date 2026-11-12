export const SURVIVAL_UPGRADES = [
  { id: 'armor', name: 'Reinforced field vest', description: 'Reduce incoming damage by 10% per level (up to 30%).', cost: 60, growth: 50 },
  { id: 'scavenger', name: 'Scavenger toolkit', description: 'Each relief cache yields +2 scrap and +4 spare rounds per level.', cost: 50, growth: 40 },
  { id: 'endurance', name: 'Trail conditioning', description: 'Sprint drains 15% less stamina per level (up to 45%).', cost: 40, growth: 35 },
]
export function restoreTraining(saved = {}) {
  return Object.fromEntries(SURVIVAL_UPGRADES.map(({ id }) => [id, Number.isFinite(saved?.[id]) ? Math.max(0, Math.min(3, Math.floor(saved[id]))) : 0]))
}
export function trainingCost(upgrade, level) { return upgrade.cost + upgrade.growth * level }
export function buyTraining(state, id) {
  const upgrade = SURVIVAL_UPGRADES.find((item) => item.id === id)
  const training = restoreTraining(state.training)
  if (!upgrade || training[id] >= 3) return state
  const cost = trainingCost(upgrade, training[id])
  if (state.credits < cost) return state
  return { ...state, credits: state.credits - cost, training: { ...training, [id]: training[id] + 1 } }
}
export function survivalBenefits(training) {
  const levels = restoreTraining(training)
  return { damageMultiplier: 1 - levels.armor * 0.1, scrap: 8 + levels.scavenger * 2, rounds: 24 + levels.scavenger * 4, sprintDrain: 18 * (1 - levels.endurance * 0.15) }
}
