/* Enrollment rules over the data from /api/student: blocks, what the student advised, and what they picked. */
import { section } from "./schedule.js";

// Adds the lists the pages use most to the server's data.
export function prepare(raw) {
  const thisTerm = raw.catalog.filter((c) => c.status === "current");
  const offerable = [...thisTerm, ...raw.catalog.filter((c) => c.status === "available")];
  return { ...raw, thisTerm, offerable, clockOffset: Date.parse(raw.serverTime) - Date.now() };
}

// A block's sections, one for each course this term.
export const blockSections = (data, key) =>
  data.thisTerm.map((c) => section(c, data.blocks[key]?.picks[c.id])).filter(Boolean);

export function initialState(data) {
  const saved = data.advising?.courses;
  const advised = saved
    ? Object.fromEntries(data.offerable.filter((c) => saved.includes(c.code)).map((c) => [c.id, true]))
    : Object.fromEntries(data.thisTerm.map((c) => [c.id, true]));
  return {
    step: "advise",
    advised,
    mode: null,
    block: null,
    groups: {},
    enrolled: !!data.enrollment,
    load: data.enrollment?.load || [],
    label: data.enrollment?.label || ""
  };
}

export const advisedCourses = (data, state) => data.offerable.filter((c) => state.advised[c.id]);

// A block runs exactly this term's curriculum, so it's open only to students advising exactly those courses.
export function blockOpen(data, state) {
  const list = advisedCourses(data, state);
  return Object.keys(data.blocks).length > 0 && list.length === data.thisTerm.length && list.every((c) => c.status === "current");
}

// The sections the student has picked so far.
export function picked(data, state) {
  if (state.mode === "block" && state.block && blockOpen(data, state)) return blockSections(data, state.block);
  if (state.mode === "custom") {
    return advisedCourses(data, state)
      .filter((c) => state.groups[c.id])
      .map((c) => section(c, state.groups[c.id]))
      .filter(Boolean);
  }
  return [];
}

export const makeReducer = (data) => (state, action) => {
  switch (action.type) {
    case "advise": {
      const advised = { ...state.advised, [action.id]: action.checked };
      const groups = { ...state.groups };
      if (!action.checked) delete groups[action.id];
      const next = { ...state, advised, groups };
      return next.mode === "block" && !blockOpen(data, next) ? { ...next, mode: null, block: null } : next;
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
};
