import type { PlayerVolatile } from "../../../shared/protocol";

export type DeadReckoningOptions = {
  interpolationDelayMs: number;
  maxExtrapolationMs: number;
};

export type DeadReckoningSample = {
  timeMs: number;
  state: PlayerVolatile;
};

export type DeadReckoner = {
  pushSample: (state: PlayerVolatile, timeMs: number) => void;
  sample: (nowMs: number) => PlayerVolatile | null;
};

export function createDeadReckoner(options: DeadReckoningOptions): DeadReckoner {
  const { interpolationDelayMs, maxExtrapolationMs } = options;
  const samples: DeadReckoningSample[] = [];

  const pushSample = (state: PlayerVolatile, timeMs: number) => {
    samples.push({ state: cloneVolatile(state), timeMs });
    if (samples.length > 6) {
      samples.shift();
    }
  };

  const sample = (nowMs: number) => {
    if (samples.length === 0) return null;
    const targetTime = nowMs - interpolationDelayMs;
    const older = getOlderSample(samples, targetTime);
    const newer = getNewerSample(samples, targetTime);

    if (older && newer) {
      const t = clamp01(
        (targetTime - older.timeMs) / Math.max(1, newer.timeMs - older.timeMs)
      );
      return interpolateVolatile(older.state, newer.state, t);
    }

    const base = newer ?? older ?? samples[samples.length - 1];
    if (!base) return null;
    const extrapolationMs = clamp(
      targetTime - base.timeMs,
      0,
      maxExtrapolationMs
    );
    const dtSec = extrapolationMs / 1000;
    return extrapolateVolatile(base.state, dtSec);
  };

  return { pushSample, sample };
}

function getOlderSample(samples: DeadReckoningSample[], timeMs: number) {
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    const sample = samples[i];
    if (!sample) continue;
    if (sample.timeMs <= timeMs) return sample;
  }
  return null;
}

function getNewerSample(samples: DeadReckoningSample[], timeMs: number) {
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    if (!sample) continue;
    if (sample.timeMs >= timeMs) return sample;
  }
  return null;
}

function interpolateVolatile(a: PlayerVolatile, b: PlayerVolatile, t: number): PlayerVolatile {
  return {
    ...a,
    pos: {
      x: lerp(a.pos.x, b.pos.x, t),
      y: lerp(a.pos.y, b.pos.y, t),
      z: lerp(a.pos.z, b.pos.z, t)
    },
    vel: {
      x: lerp(a.vel.x, b.vel.x, t),
      y: lerp(a.vel.y, b.vel.y, t),
      z: lerp(a.vel.z, b.vel.z, t)
    },
    yaw: lerpAngle(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    stance: t < 0.5 ? a.stance : b.stance,
    grounded: t < 0.5 ? a.grounded : b.grounded,
    hotbarSlot: t < 0.5 ? a.hotbarSlot : b.hotbarSlot
  };
}

function extrapolateVolatile(state: PlayerVolatile, dtSec: number): PlayerVolatile {
  return {
    ...state,
    pos: {
      x: state.pos.x + state.vel.x * dtSec,
      y: state.pos.y + state.vel.y * dtSec,
      z: state.pos.z + state.vel.z * dtSec
    }
  };
}

function cloneVolatile(state: PlayerVolatile): PlayerVolatile {
  return {
    ...state,
    pos: { ...state.pos },
    vel: { ...state.vel }
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number) {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * t;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
