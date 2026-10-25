import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import vuetify from '@/plugins/vuetify';
import DialogoClaveTemporal from '../DialogoClaveTemporal.vue';

const montar = (props: Record<string, unknown> = {}) =>
  mount(DialogoClaveTemporal, {
    props: { modelValue: true, password: 'Ab3dEf7hJk9mNp', para: 'María (maria@x.com)', ...props },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  });

const botones = () => [...document.querySelectorAll<HTMLButtonElement>('button')];
const botonCopiar = () => document.querySelector<HTMLElement>('.v-field__append-inner i');

describe('DialogoClaveTemporal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('muestra la clave, a quién corresponde y que no se volverá a mostrar', () => {
    const w = montar();
    expect((document.querySelector('[data-testid="clave-temporal"] input') as HTMLInputElement).value).toBe('Ab3dEf7hJk9mNp');
    expect(document.body.textContent).toContain('María (maria@x.com)');
    expect(document.body.textContent).toContain('no se vuelve a mostrar');
    w.unmount();
  });

  it('copia al portapapeles y lo confirma con un tilde', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: escribir } });
    const w = montar();

    botonCopiar()!.click();
    await flushPromises();

    expect(escribir).toHaveBeenCalledWith('Ab3dEf7hJk9mNp');
    expect(document.querySelector('.fa-check')).not.toBeNull();
    w.unmount();
  });

  it('si no puede copiar (permiso denegado) lo dice y deja la clave a la vista', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denegado')) } });
    const w = montar();

    botonCopiar()!.click();
    await flushPromises();

    expect(document.body.textContent).toContain('No se pudo copiar automáticamente');
    expect(document.querySelector('.fa-check')).toBeNull();
    expect((document.querySelector('[data-testid="clave-temporal"] input') as HTMLInputElement).value).toBe('Ab3dEf7hJk9mNp');
    w.unmount();
  });

  it('solo se cierra con «Ya la anoté» (no al hacer clic afuera)', async () => {
    const w = montar();
    botones().find((b) => b.textContent?.includes('Ya la anoté'))!.click();
    await flushPromises();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([false]);

    // clic en el fondo: no debe emitir otro cierre
    const antes = w.emitted('update:modelValue')?.length ?? 0;
    (document.querySelector('.v-overlay__scrim') as HTMLElement | null)?.click();
    await flushPromises();
    expect(w.emitted('update:modelValue')?.length ?? 0).toBe(antes);
    w.unmount();
  });

  it('sin «para» usa una frase genérica', () => {
    const w = montar({ para: undefined });
    expect(document.body.textContent).toContain('Esta es la contraseña temporal');
    w.unmount();
  });
});
