/** WFCD Node.json missionIndex → display game mode. Indices 4 and 13 are swapped in DE's enum. */
const MISSION_INDEX_TO_GAME_MODE: Record<number, string> = {
  0: 'Assassination',
  1: 'Exterminate',
  2: 'Survival',
  3: 'Rescue',
  4: 'Sabotage',
  5: 'Sabotage',
  7: 'Capture',
  8: 'Defense',
  9: 'Mobile Defense',
  13: 'Interception',
  17: 'Excavation',
}

export function gameModeForMissionIndex(missionIndex: number): string {
  return MISSION_INDEX_TO_GAME_MODE[missionIndex] ?? 'Mission'
}
