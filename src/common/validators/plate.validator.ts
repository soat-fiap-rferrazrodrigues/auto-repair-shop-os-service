import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsVehiclePlateConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return false;
    const old = /^[A-Z]{3}-?\d{4}$/;
    const mercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;
    const upper = value.toUpperCase();
    return old.test(upper) || mercosul.test(upper);
  }

  defaultMessage(): string {
    return 'Invalid vehicle plate. Use format ABC-1234 or ABC1D23 (Mercosul)';
  }
}

export function IsVehiclePlate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsVehiclePlateConstraint,
    });
  };
}
