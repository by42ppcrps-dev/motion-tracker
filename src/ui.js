/** Pure UI-state helpers: a check result is only valid until the notes change. */
export function afterCheck(result) {
  return { last: result ?? null, copyEnabled: !!(result && result.ready) };
}
export function afterNotesChange() {
  return { last: null, copyEnabled: false };
}
