import { describe, expect, it } from 'vitest';
import {
  describirRango,
  esRangoDeDiasCompletos,
  formatearDia,
  formatearInstante,
  isoALocal,
  localAIso,
  sumarDias,
} from '../zonaHoraria';

const BA = 'America/Argentina/Buenos_Aires'; // UTC-3 todo el año
const MADRID = 'Europe/Madrid'; // UTC+1 en invierno, UTC+2 en verano

describe('localAIso', () => {
  it('Buenos Aires: las 20:00 locales son las 23:00 UTC', () => {
    expect(localAIso('2027-12-31T20:00', BA)).toBe('2027-12-31T23:00:00.000Z');
  });

  it('pasa de día cuando corresponde (23:30 en BA ya es el día siguiente en UTC)', () => {
    expect(localAIso('2027-01-10T23:30', BA)).toBe('2027-01-11T02:30:00.000Z');
  });

  it('respeta el horario de verano (Madrid)', () => {
    expect(localAIso('2027-01-15T12:00', MADRID)).toBe('2027-01-15T11:00:00.000Z'); // invierno: +1
    expect(localAIso('2027-07-15T12:00', MADRID)).toBe('2027-07-15T10:00:00.000Z'); // verano: +2
  });

  it('en el cambio de hora usa el desfase correcto de cada lado', () => {
    // Madrid pasa a horario de verano el 28/03/2027 a las 02:00 (salta a las 03:00)
    expect(localAIso('2027-03-28T01:30', MADRID)).toBe('2027-03-28T00:30:00.000Z'); // todavía +1
    expect(localAIso('2027-03-28T04:00', MADRID)).toBe('2027-03-28T02:00:00.000Z'); // ya +2
  });

  it('rechaza lo que no tiene el formato de un input datetime-local', () => {
    for (const mal of ['', '2027-12-31', '2027-12-31 20:00', '31/12/2027 20:00', 'mañana']) {
      expect(() => localAIso(mal, BA)).toThrow();
    }
  });
});

describe('isoALocal', () => {
  it('es la operación inversa', () => {
    expect(isoALocal('2027-12-31T23:00:00.000Z', BA)).toBe('2027-12-31T20:00');
    expect(isoALocal('2027-01-11T02:30:00.000Z', BA)).toBe('2027-01-10T23:30');
    expect(isoALocal('2027-07-15T10:00:00.000Z', MADRID)).toBe('2027-07-15T12:00');
  });

  it('ida y vuelta sin perder nada, en varias zonas y fechas', () => {
    for (const zona of [BA, MADRID, 'America/Montevideo', 'UTC']) {
      for (const local of ['2027-01-01T00:00', '2027-06-15T13:45', '2027-12-31T23:59', '2028-02-29T08:05']) {
        expect(isoALocal(localAIso(local, zona), zona)).toBe(local);
      }
    }
  });
});

describe('formatearInstante', () => {
  it('muestra la hora de la empresa, no la del navegador', () => {
    const texto = formatearInstante('2027-12-31T23:00:00.000Z', BA);
    expect(texto).toContain('20:00');
    expect(texto).toContain('31/12/2027');
    expect(formatearInstante('2027-12-31T23:00:00.000Z', MADRID)).toContain('00:00'); // ya es 01/01 en Madrid
  });
});

describe('sumarDias', () => {
  it('cuenta de calendario: fin de mes, de año y bisiesto', () => {
    expect(sumarDias('2027-12-31', 1)).toBe('2028-01-01');
    expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(sumarDias('2027-02-28', 1)).toBe('2027-03-01');
    expect(sumarDias('2027-05-10', 0)).toBe('2027-05-10');
  });
});

describe('formatearDia', () => {
  it('no depende de la zona del navegador', () => {
    expect(formatearDia('2027-12-31')).toContain('31/12/2027');
    expect(formatearDia('2027-12-31')).toMatch(/vie/i); // 31/12/2027 es viernes
  });
});

describe('esRangoDeDiasCompletos / describirRango', () => {
  const dia = (fecha: string) => localAIso(`${fecha}T00:00`, BA);

  it('reconoce días completos (de 00:00 a 00:00 locales)', () => {
    expect(esRangoDeDiasCompletos(dia('2027-12-31'), dia('2028-01-01'), BA)).toBe(true);
    expect(esRangoDeDiasCompletos(dia('2027-12-31'), dia('2028-01-03'), BA)).toBe(true);
    expect(esRangoDeDiasCompletos(localAIso('2027-12-31T10:00', BA), dia('2028-01-01'), BA)).toBe(false);
    expect(esRangoDeDiasCompletos(dia('2027-12-31'), localAIso('2028-01-01T02:00', BA), BA)).toBe(false);
  });

  it('un día completo y un rango de días', () => {
    expect(describirRango(dia('2027-12-31'), dia('2028-01-01'), BA)).toBe(`${formatearDia('2027-12-31')} · todo el día`);
    expect(describirRango(dia('2027-12-31'), dia('2028-01-03'), BA)).toContain('31/12/2027');
    expect(describirRango(dia('2027-12-31'), dia('2028-01-03'), BA)).toContain('02/01/2028'); // el último día incluido
    expect(describirRango(dia('2027-12-31'), dia('2028-01-03'), BA)).toContain('todos los días');
  });

  it('con horas puntuales muestra desde → hasta', () => {
    const texto = describirRango(localAIso('2027-12-31T18:00', BA), localAIso('2028-01-01T02:00', BA), BA);
    expect(texto).toContain('18:00');
    expect(texto).toContain('02:00');
    expect(texto).toContain('→');
  });
});
