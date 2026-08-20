import type {
  PlateList,
  PlateQueueStatus,
  RunListPayload,
  RunPlatePayload,
  RunQueuePayload,
  SetConfigPayload,
  SimulationCommand,
} from '@plate-runner/shared';
import type { SimulationControls } from '../../hooks/useSimulation';
import type { PlateQueueControls } from '../queue/usePlateQueue';
import type { PlateListsControls } from '../lists/usePlateLists';

export interface CommandExecutionDeps {
  simulation: SimulationControls;
  plateQueue: PlateQueueControls;
  plateLists: PlateListsControls;
  /** Applies a partial SimulationConfig change for the 'set_config' command type. Omit to leave set_config unimplemented (claimed then failed with not_implemented). */
  onSetConfig?: (partial: SetConfigPayload) => void;
}

export type CommandOutcome = { status: 'completed' } | { status: 'failed'; error: string };

const QUEUE_ACTIVE_STATUSES: PlateQueueStatus[] = ['running', 'paused', 'waiting_for_signal', 'waiting_for_next'];

/**
 * True when `command` is a run_plate/run_queue/run_list command that can't
 * run right now because a previous run is still in progress. Callers
 * should check this BEFORE claiming — leaving the command pending (instead
 * of claiming it and then failing it with 'local_queue_busy') lets it
 * naturally retry on the next poll tick once the current run finishes, so
 * back-to-back remote/API run_plate commands play in sequence instead of
 * the 2nd+ one silently failing and vanishing from the pending count.
 */
export function isRunCommandBusy(command: SimulationCommand, plateQueue: Pick<PlateQueueControls, 'queueStatus'>): boolean {
  const isRunCommand = command.type === 'run_plate' || command.type === 'run_queue' || command.type === 'run_list';
  return isRunCommand && QUEUE_ACTIVE_STATUSES.includes(plateQueue.queueStatus);
}

/** Turns a run_plate/run_queue command payload into a single-use PlateList-shaped object so it can flow through the same runListSnapshot path as run_list. */
function runPlatePayloadToList(payload: RunPlatePayload): PlateList {
  const now = new Date().toISOString();
  return {
    id: `api-plate-${now}`,
    name: `API: ${payload.plate}`,
    plates: [payload.plate],
    simulationDefaults: {
      direction: payload.direction,
      detectorPlacement: payload.detectorPlacement,
      vehicleColor: payload.vehicleColor,
      vehicleType: payload.vehicleType,
      gateConfig: payload.gateConfig,
      queueConfig: payload.queueConfig,
      speedPreset: payload.speedPreset,
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

function runQueuePayloadToList(payload: RunQueuePayload): PlateList {
  const now = new Date().toISOString();
  return {
    id: `api-queue-${now}`,
    name: `API: ${payload.plates.length} plates`,
    plates: payload.plates,
    simulationDefaults: {
      direction: payload.direction,
      detectorPlacement: payload.detectorPlacement,
      vehicleColor: payload.vehicleColor,
      vehicleType: payload.vehicleType,
      gateConfig: payload.gateConfig,
      queueConfig: payload.queueConfig,
      speedPreset: payload.speedPreset,
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

/**
 * The dispatch core shared by useApiCommandListener (Local Mode) and
 * useDisplayCommandListener (Display Mode) — everything after "the command
 * has already been claimed" and before "report completed/failed back to
 * the backend." Claim/complete/fail themselves stay in each hook since
 * their endpoints/auth differ between local and display-scoped routes.
 */
export async function runLocalAction(command: SimulationCommand, deps: CommandExecutionDeps): Promise<CommandOutcome> {
  const { simulation, plateQueue, plateLists, onSetConfig } = deps;
  const isRunCommand = command.type === 'run_plate' || command.type === 'run_queue' || command.type === 'run_list';

  if (isRunCommand) {
    const busy = QUEUE_ACTIVE_STATUSES.includes(plateQueue.queueStatus);
    if (busy) return { status: 'failed', error: 'local_queue_busy' };

    let list: PlateList;
    if (command.type === 'run_plate') list = runPlatePayloadToList(command.payload as RunPlatePayload);
    else if (command.type === 'run_queue') list = runQueuePayloadToList(command.payload as RunQueuePayload);
    else list = (command.payload as RunListPayload).list;

    plateLists.runListSnapshot(list, 'api_command');
    return { status: 'completed' };
  }

  if (command.type === 'set_config') {
    if (!onSetConfig) return { status: 'failed', error: 'not_implemented' };
    onSetConfig(command.payload as SetConfigPayload);
    return { status: 'completed' };
  }

  switch (command.type) {
    case 'pause': plateQueue.pauseQueue(); break;
    case 'resume': plateQueue.resumeQueue(); break;
    case 'stop': plateQueue.stopQueue(); break;
    case 'skip_current': plateQueue.skipCurrent(); break;
    case 'open_gate': simulation.openGate(); break;
  }
  return { status: 'completed' };
}
