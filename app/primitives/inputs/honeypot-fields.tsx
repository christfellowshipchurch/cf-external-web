import { FORM_STARTED_AT_FIELD, HONEYPOT_FIELD } from '~/lib/bot-protection';

// Hidden bot-trap inputs for public forms; checked server-side by getBotBlockReason().
// The trap is off-screen, aria-hidden and untabbable, so people never reach it.
export function HoneypotFields({ startedAt }: { startedAt?: number }) {
  return (
    <>
      <input
        type='hidden'
        name={FORM_STARTED_AT_FIELD}
        value={startedAt ?? ''}
      />
      <div
        aria-hidden='true'
        className='absolute -left-[10000px] top-auto w-px h-px overflow-hidden'
      >
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          type='text'
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          tabIndex={-1}
          autoComplete='off'
          defaultValue=''
        />
      </div>
    </>
  );
}
