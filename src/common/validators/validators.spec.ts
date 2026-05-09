import { IsCpfCnpjConstraint } from './cpf-cnpj.validator';
import { IsVehiclePlateConstraint } from './plate.validator';

describe('IsCpfCnpjConstraint', () => {
  const validator = new IsCpfCnpjConstraint();

  it('should validate a valid CPF', () => {
    expect(validator.validate('529.982.247-25')).toBe(true);
  });

  it('should reject an invalid CPF', () => {
    expect(validator.validate('111.111.111-11')).toBe(false);
  });

  it('should validate a valid CNPJ', () => {
    expect(validator.validate('11.222.333/0001-81')).toBe(true);
  });

  it('should reject an invalid CNPJ', () => {
    expect(validator.validate('11.111.111/1111-11')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(validator.validate('')).toBe(false);
  });
});

describe('IsVehiclePlateConstraint', () => {
  const validator = new IsVehiclePlateConstraint();

  it('should validate old format plate', () => {
    expect(validator.validate('ABC-1234')).toBe(true);
  });

  it('should validate Mercosul plate', () => {
    expect(validator.validate('ABC1D23')).toBe(true);
  });

  it('should reject invalid plate', () => {
    expect(validator.validate('12345')).toBe(false);
  });

  it('should reject empty', () => {
    expect(validator.validate('')).toBe(false);
  });
});
