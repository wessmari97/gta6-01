// Shared tuning for Solmar. The simulation's fixed step, in seconds: 60
// updates a second whatever the display's rate.

export const STEP = 1 / 60;

/** Where the player's progress is kept between visits (this browser only). */
export const SAVE_KEY = 'solmar-save-v1';
