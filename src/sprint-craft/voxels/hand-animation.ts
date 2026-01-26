export type HandSwing = {
  left: number;
  right: number;
};

export type HandAnimationState = {
  walkPhase: number;
  actionTimer: number;
  swing: HandSwing;
};

export type HandAnimator = {
  update: (options: {
    dtSec: number;
    moveSpeed: number;
    actionTriggered: boolean;
  }) => HandSwing;
  getState: () => HandAnimationState;
};

const WALK_SPEED_REF = 4.2;
const WALK_SWING_AMPLITUDE = 0.35;
const ACTION_SWING_AMPLITUDE = 0.9;
const ACTION_DURATION = 0.25;

export function createHandAnimator(): HandAnimator {
  let walkPhase = 0;
  let actionTimer = 0;
  let swing: HandSwing = { left: 0, right: 0 };

  const update = (options: { dtSec: number; moveSpeed: number; actionTriggered: boolean }) => {
    const dt = Number.isFinite(options.dtSec) ? Math.max(0, options.dtSec) : 0;
    const speed = Math.max(0, options.moveSpeed);
    const speedNorm = Math.min(1, speed / WALK_SPEED_REF);

    if (speedNorm > 0.05) {
      walkPhase += dt * (3 + speedNorm * 6);
    }

    if (options.actionTriggered) {
      actionTimer = ACTION_DURATION;
    }

    actionTimer = Math.max(0, actionTimer - dt);
    const actionProgress =
      ACTION_DURATION <= 0 ? 1 : 1 - actionTimer / ACTION_DURATION;
    const actionSwing =
      actionTimer > 0 ? Math.sin(actionProgress * Math.PI) * ACTION_SWING_AMPLITUDE : 0;

    const walkSwing = Math.sin(walkPhase) * WALK_SWING_AMPLITUDE * speedNorm;
    swing = {
      left: walkSwing,
      right: actionSwing
    };
    return swing;
  };

  return {
    update,
    getState: () => ({
      walkPhase,
      actionTimer,
      swing
    })
  };
}
