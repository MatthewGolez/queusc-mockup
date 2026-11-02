/* Enrollment rules: blocks, what the student advised, and what they picked. Pure functions over state. */
import { offerable, thisTerm } from "../data/curriculum.js";
import { section } from "./schedule.js";

// Blocks: a fixed group for every course this term. Seats are held for the block as a whole.
export const blocks = {
  A: { picks: { cis2101: 3, cis2102: 1, cis2103: 2, cis2105: 3, geethics: 1, gefreelec2: 1, is3103: 1, is4103: 1, tpe2103: 1 }, enrolled: 31, cap: 40 },
  B: { picks: { cis2101: 1, cis2102: 4, cis2103: 5, cis2105: 2, geethics: 2, gefreelec2: 2, is3103: 4, is4103: 2, tpe2103: 2 }, enrolled: 37, cap: 40 }
};

export const blockSections = (key) => thisTerm.map((c) => section(c, blocks[key].picks[c.id]));

export function initialState() {
  return {
    step: "advise",
    advised: Object.fromEntries(thisTerm.map((c) => [c.id, true])),
    mode: null,
    block: null,
    groups: {},
    enrolled: false,
    load: [],
    label: ""
  };
}

export const advisedCourses = (state) => offerable.filter((c) => state.advised[c.id]);

// A block runs exactly this term's curriculum, so it's open only to students advising exactly those courses.
export function blockOpen(state) {
  const list = advisedCourses(state);
  return list.length === thisTerm.length && list.every((c) => c.status === "current");
}

// The sections the student has picked so far.
export function picked(state) {
  if (state.mode === "block" && state.block && blockOpen(state)) return blockSections(state.block);
  if (state.mode === "custom") {
    return advisedCourses(state)
      .filter((c) => state.groups[c.id])
      .map((c) => section(c, state.groups[c.id]));
  }
  return [];
}

export function reducer(state, action) {
  switch (action.type) {
    case "advise": {
      const advised = { ...state.advised, [action.id]: action.checked };
      const groups = { ...state.groups };
      if (!action.checked) delete groups[action.id];
      const next = { ...state, advised, groups };
      return next.mode === "block" && !blockOpen(next) ? { ...next, mode: null, block: null } : next;
    }
    case "step":
      return { ...state, step: action.step };
    case "mode":
      return { ...state, mode: action.mode };
    case "block":
      return { ...state, block: action.block };
    case "group":
      return { ...state, groups: { ...state.groups, [action.id]: action.group } };
    case "enroll":
      return { ...state, enrolled: true, load: action.load, label: action.label };
    default:
      return state;
  }
}
