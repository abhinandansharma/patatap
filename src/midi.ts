/** Web MIDI: any note-on plays a key. Notes map onto the 26 letters by pitch class over two octaves. */
export function connectMidi(onNote: (index: number, velocity: number) => void, onStatus: (text: string) => void) {
  const nav = navigator as Navigator & { requestMIDIAccess?: (o?: { sysex: boolean }) => Promise<MIDIAccess> };
  if (!nav.requestMIDIAccess) return;
  nav.requestMIDIAccess().then((access) => {
    const wire = () => {
      let count = 0;
      access.inputs.forEach((input) => {
        count++;
        input.onmidimessage = (e) => {
          const data = e.data;
          if (!data || data.length < 3) return;
          const [status, note, vel] = data;
          if ((status & 0xf0) === 0x90 && vel > 0) onNote((note - 36 + 26 * 4) % 26, vel / 127);
        };
      });
      onStatus(count ? `${count} MIDI ${count === 1 ? 'device' : 'devices'}` : '');
    };
    wire();
    access.onstatechange = wire;
  }).catch(() => { /* no MIDI, fine */ });
}
