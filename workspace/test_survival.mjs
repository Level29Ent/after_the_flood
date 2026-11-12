import assert from 'node:assert/strict'
import { SURVIVAL_UPGRADES, restoreTraining, buyTraining, survivalBenefits, trainingCost } from './src/survival-upgrades.js'
assert.deepEqual(restoreTraining(), { armor: 0, scavenger: 0, endurance: 0 })
assert.deepEqual(restoreTraining({ armor: Infinity, scavenger: -10, endurance: 100 }), { armor: 0, scavenger: 0, endurance: 3 })
let state = { credits: 0, scrap: 15, training: restoreTraining(), kills: 9 }
assert.equal(buyTraining(state, 'armor'), state)
assert.equal(buyTraining(state, 'missing'), state)
state = { ...state, credits: 2000 }
for (const upgrade of SURVIVAL_UPGRADES) {
  for (let level = 0; level < 3; level++) {
    const before = state.credits
    state = buyTraining(state, upgrade.id)
    assert.equal(state.credits, before - trainingCost(upgrade, level))
    assert.equal(state.training[upgrade.id], level + 1)
  }
  assert.equal(buyTraining(state, upgrade.id), state)
}
assert.equal(state.scrap, 15)
assert.equal(state.kills, 9)
assert.deepEqual(restoreTraining(JSON.parse(JSON.stringify(state)).training), state.training)
const benefits = survivalBenefits(state.training)
assert.ok(Math.abs(benefits.damageMultiplier - 0.7) < 0.00001)
assert.equal(benefits.scrap, 14)
assert.equal(benefits.rounds, 36)
assert.ok(Math.abs(benefits.sprintDrain - 9.9) < 0.00001)
console.log('PASS: old-save defaults, level clamping, cost/insufficient/max guards, all three benefit paths, persistence, unrelated resources preserved.')
