/** Error codes double as message keys under `errors` in the messages files. */
export type ActionError =
  | 'invalid'
  | 'notFound'
  | 'titleRequired'
  | 'titleTooLong'
  | 'wordTooLong'
  | 'nameRequired'
  | 'nameTooLong'
  | 'duplicate'
  | 'commentRequired'
  | 'rateLimited'
  | 'limitReached'
  | 'unknown';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ActionError };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: ActionError): ActionResult<never> => ({ ok: false, error });

const KNOWN: ActionError[] = [
  'titleRequired',
  'titleTooLong',
  'wordTooLong',
  'nameRequired',
  'nameTooLong',
  'commentRequired',
];

/** Maps the first zod issue message to an error code the UI can translate. */
export function fromZodError(error: { issues: { message: string }[] }): ActionResult<never> {
  const message = error.issues[0]?.message as ActionError | undefined;
  return fail(message && KNOWN.includes(message) ? message : 'invalid');
}
