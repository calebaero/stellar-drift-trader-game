/**
 * @file SpaceshipPhysicsEngine.ts
 * @description A self-contained physics engine for calculating spaceship movement.
 * This engine implements a "drift" style of physics with smooth, interpolated rotation,
 * constant thrust, linear friction, and a maximum velocity clamp.
 * It is designed to be immutable, taking a state and returning a new, updated state.
 */

// #region Type Definitions
// These interfaces define the data contracts for the physics engine, ensuring
// that it remains decoupled from the main application's state structure.

/**
 * Represents the essential state of a ship for physics calculations.
 * This includes its position, velocity, and current orientation.
 */
export interface ShipState {
  x: number;          // The ship's position on the X-axis.
  y: number;          // The ship's position on the Y-axis.
  vx: number;         // The ship's velocity on the X-axis.
  vy: number;         // The ship's velocity on the Y-axis.
  rotation: number;   // The ship's current angle in radians.
}

/**
 * Represents the player's input for a given frame.
 * This is used to drive the physics simulation.
 */
export interface PhysicsInput {
  targetAngle: number;   // The angle (in radians) the ship should turn towards.
  isThrusting: boolean;  // Whether the main thruster is currently active.
}

// #endregion

// #region Physics Constants
/**
 * These constants define the "feel" of the ship's movement.
 * They are centralized here to allow for easy tuning and balancing of the game
 * without needing to alter the core physics logic.
 */
const PHYSICS_CONSTANTS = {
  /**
   * The magnitude of the force applied to the ship when the thruster is active.
   * Higher values result in faster acceleration.
   * @type {number}
   */
  THRUST_FORCE: 0.01,

  /**
   * A friction-like force that slows the ship down over time, simulating space drag.
   * This is a multiplier applied to the velocity each frame.
   * A value of 1.0 means no friction.
   * A value of 0.97 means velocity is reduced by 3% each frame.
   * @type {number}
   */
  FRICTION: 0.99,

  /**
   * The maximum speed (magnitude of the velocity vector) the ship can reach.
   * This prevents the ship from accelerating indefinitely.
   * @type {number}
   */
  MAX_VELOCITY: 0.5,

  /**
   * The rate at which the ship turns to face the target angle. This is the
   * interpolation factor used for rotational lerping.
   * A higher value (closer to 1.0) means faster, more responsive turning.
   * A lower value (closer to 0.0) results in slower, heavier-feeling turning.
   * @type {number}
   */
  ROTATION_SPEED: 0.5,
};
// #endregion

export class SpaceshipPhysicsEngine {
  /**
   * A constant representing twice the value of PI, used frequently in angle calculations.
   * Caching this value is a minor performance optimization.
   */
  private readonly TWO_PI = 2 * Math.PI;

  /**
   * Interpolates between two angles, finding the shortest path.
   * Standard linear interpolation (lerp) doesn't work correctly for circular values
   * like angles (e.g., turning from 350 degrees to 10 degrees should be a 20-degree
   * turn, not a 340-degree turn). This function solves that problem.
   * @param {number} current - The starting angle in radians.
   * @param {number} target - The destination angle in radians.
   * @param {number} factor - The interpolation factor (how much to turn).
   * @returns {number} The new, interpolated angle in radians.
   */
  private interpolateAngle(current: number, target: number, factor: number): number {
    // Calculate the difference between the target and current angle.
    let delta = target - current;

    // Normalize the delta to be within the range [-PI, PI].
    // This ensures we always take the shortest path around the circle.
    // For example, if delta is > PI, we subtract 2*PI to go the other way.
    if (delta > Math.PI) {
      delta -= this.TWO_PI;
    } else if (delta < -Math.PI) {
      delta += this.TWO_PI;
    }

    // Apply the interpolation factor to the shortest-path delta
    // and add it to the current angle to get the new angle.
    return current + delta * factor;
  }

  /**
   * Updates the state of a ship based on user input and the passage of time.
   * This is the core method of the physics engine. It is a pure function that
   * takes the current state and returns a new state, ensuring immutability.
   * @param {ShipState} ship - The current state of the ship.
   * @param {PhysicsInput} input - The player's input for this frame.
   * @param {number} deltaTime - The time elapsed since the last frame.
   *        While currently unused in this fixed-step simulation, it's included
   *        for future compatibility with variable frame rates.
   * @returns {ShipState} A new ship state object with updated physics.
   */
  public updateShipState(ship: ShipState, input: PhysicsInput, deltaTime: number): ShipState {
    // Create a mutable copy of the ship's state to work with. This prevents
    // side effects and adheres to an immutable state management pattern.
    const newShipState = {...ship };

    // --- 1. Rotation ---
    // Smoothly interpolate the ship's current rotation towards the target angle.
    newShipState.rotation = this.interpolateAngle(
      newShipState.rotation,
      input.targetAngle,
      PHYSICS_CONSTANTS.ROTATION_SPEED
    );

    // --- 2. Thrust ---
    // If the thruster is active, apply acceleration in the direction the ship is facing.
    if (input.isThrusting) {
      // Calculate the acceleration vector based on the ship's new rotation.
      const accelerationX = Math.cos(newShipState.rotation) * PHYSICS_CONSTANTS.THRUST_FORCE;
      const accelerationY = Math.sin(newShipState.rotation) * PHYSICS_CONSTANTS.THRUST_FORCE;

      // Add the acceleration to the current velocity.
      newShipState.vx += accelerationX;
      newShipState.vy += accelerationY;
    }

    // --- 3. Friction ---
    // Apply a constant friction force to gradually slow the ship down.
    // This creates the "drifting" effect.
    newShipState.vx *= PHYSICS_CONSTANTS.FRICTION;
    newShipState.vy *= PHYSICS_CONSTANTS.FRICTION;

    // --- 4. Velocity Clamping ---
    // Ensure the ship's speed does not exceed the maximum allowed velocity.
    const currentSpeed = Math.sqrt(newShipState.vx * newShipState.vx + newShipState.vy * newShipState.vy);
    if (currentSpeed > PHYSICS_CONSTANTS.MAX_VELOCITY) {
      // If speed is too high, we need to scale the velocity vector down.
      const scaleFactor = PHYSICS_CONSTANTS.MAX_VELOCITY / currentSpeed;
      newShipState.vx *= scaleFactor;
      newShipState.vy *= scaleFactor;
    }

    // --- 5. Position Update ---
    // Update the ship's position based on its final velocity for this frame.
    // The deltaTime parameter would be used here in a variable-step simulation
    // (e.g., newShipState.x += newShipState.vx * deltaTime;).
    // For this fixed-step simulation (e.g., 60 FPS), deltaTime is effectively 1.
    newShipState.x += newShipState.vx;
    newShipState.y += newShipState.vy;

    // Return the newly calculated state.
    return newShipState;
  }
}